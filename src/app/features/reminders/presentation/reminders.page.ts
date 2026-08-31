import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { LucideEye } from '@lucide/angular';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { PageResponse } from '../../../core/http/page-response';
import { mapApiError } from '../../../core/http/error-message.mapper';
import { formatOffsetDateTime } from '../../../shared/utils/date-only';
import { purposeLabel } from '../../../shared/utils/status-mappers';
import { AlertComponent, EmptyStateComponent, PageTitleComponent, PaginationComponent, StatusBadgeComponent } from '../../../shared/ui/ui.components';
import { AppointmentsRepository } from '../../appointments/infrastructure/appointments.repository';
import { PatientsRepository, Patient } from '../../patients/infrastructure/patients.repository';
import { Reminder, RemindersRepository } from '../infrastructure/reminders.repository';

interface ReminderRow {
  reminder: Reminder;
  patient: Patient | null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertComponent, EmptyStateComponent, LucideEye, PageTitleComponent, PaginationComponent, ReactiveFormsModule, StatusBadgeComponent],
  templateUrl: './reminders.page.html',
  styleUrl: './reminders.page.css',
})
export class RemindersPage {
  private readonly repo = inject(RemindersRepository);
  private readonly appointments = inject(AppointmentsRepository);
  private readonly patients = inject(PatientsRepository);
  private readonly fb = inject(FormBuilder);

  readonly rows = signal<ReminderRow[]>([]);
  readonly visibleRows = signal<ReminderRow[]>([]);
  readonly page = signal<PageResponse<Reminder> | null>(null);
  readonly selected = signal<ReminderRow | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly requestId = signal<string | undefined>(undefined);
  readonly form = this.fb.nonNullable.group({ status: [''], patient: [''] });

  constructor() {
    this.load(0);
  }

  load(page: number): void {
    this.loading.set(true);
    this.error.set('');
    this.repo.list({ page, size: 8 }).pipe(
      switchMap((response) => {
        this.page.set(response);
        const lookups = response.content.map((reminder) => {
          if (!reminder.credAppointmentId) {
            return of({ reminder, patient: null });
          }

          return this.appointments.get(reminder.credAppointmentId).pipe(
            switchMap((detail) => this.patients.lookup(detail.appointment.patientId)),
            catchError(() => of(null)),
            map((patient) => ({ reminder, patient })),
          );
        });
        return lookups.length ? forkJoin(lookups) : of([]);
      }),
    ).subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.visibleRows.set(rows);
        this.selected.set(rows[0] ?? null);
      },
      error: (err) => {
        const mapped = mapApiError(err);
        this.error.set(mapped.message);
        this.requestId.set(mapped.requestId);
        this.rows.set([]);
        this.visibleRows.set([]);
        this.selected.set(null);
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  applyLocal(): void {
    const { status, patient } = this.form.getRawValue();
    const needle = patient.trim().toLocaleLowerCase('es-PE');
    const filtered = this.rows().filter((row) => {
      const statusOk = !status || row.reminder.status === status;
      const patientOk = !needle || row.patient?.name.toLocaleLowerCase('es-PE').includes(needle);
      return statusOk && patientOk;
    });

    this.visibleRows.set(filtered);
    this.selected.set(filtered[0] ?? null);
  }

  clear(): void {
    this.form.reset({ status: '', patient: '' });
    this.visibleRows.set(this.rows());
    this.selected.set(this.rows()[0] ?? null);
  }

  deliverySummary(reminder: Reminder): string {
    if (reminder.status === 'SENT') {
      return 'El recordatorio fue enviado correctamente.';
    }

    if (reminder.status === 'FAILED') {
      return 'No se pudo entregar el recordatorio. Revisa el canal de envío o vuelve a intentarlo cuando el servicio esté disponible.';
    }

    if (reminder.status === 'CANCELLED') {
      return reminder.cancelReason || 'El recordatorio fue cancelado y ya no se enviará.';
    }

    if (reminder.status === 'PROCESSING') {
      return 'El sistema está preparando el envío del recordatorio.';
    }

    return 'El recordatorio está pendiente de envío.';
  }

  sentLabel(reminder: Reminder): string {
    return reminder.sentAt ? this.formatDateTime(reminder.sentAt) : 'Aún no enviado';
  }

  formatDateTime = formatOffsetDateTime;
  purpose = purposeLabel;
}

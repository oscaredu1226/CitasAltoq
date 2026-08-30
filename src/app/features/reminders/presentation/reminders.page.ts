import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { LucideEye } from '@lucide/angular';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { PageResponse } from '../../../core/http/page-response';
import { formatOffsetDateTime } from '../../../shared/utils/date-only';
import { purposeLabel } from '../../../shared/utils/status-mappers';
import { EmptyStateComponent, PageTitleComponent, PaginationComponent, StatusBadgeComponent } from '../../../shared/ui/ui.components';
import { AppointmentsRepository } from '../../appointments/infrastructure/appointments.repository';
import { PatientsRepository, Patient } from '../../patients/infrastructure/patients.repository';
import { Reminder, RemindersRepository } from '../infrastructure/reminders.repository';

interface ReminderRow {
  reminder: Reminder;
  patient: Patient | null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent, LucideEye, PageTitleComponent, PaginationComponent, ReactiveFormsModule, StatusBadgeComponent],
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
  readonly selected = signal<Reminder | null>(null);
  readonly form = this.fb.nonNullable.group({ status: [''], patient: [''] });

  constructor() {
    this.load(0);
  }

  load(page: number): void {
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
    ).subscribe((rows) => {
      this.rows.set(rows);
      this.visibleRows.set(rows);
      this.selected.set(rows[0]?.reminder ?? null);
    });
  }

  applyLocal(): void {
    const { status, patient } = this.form.getRawValue();
    const needle = patient.trim().toLocaleLowerCase('es-PE');
    this.visibleRows.set(this.rows().filter((row) => {
      const statusOk = !status || row.reminder.status === status;
      const patientOk = !needle || row.patient?.name.toLocaleLowerCase('es-PE').includes(needle);
      return statusOk && patientOk;
    }));
  }

  clear(): void {
    this.form.reset({ status: '', patient: '' });
    this.visibleRows.set(this.rows());
  }

  formatDateTime = formatOffsetDateTime;
  purpose = purposeLabel;
}

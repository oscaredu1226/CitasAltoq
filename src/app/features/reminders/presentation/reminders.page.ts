import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { LucideEye, LucideX } from '@lucide/angular';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { PageResponse } from '../../../core/http/page-response';
import { newestFirstPage } from '../../../core/http/newest-page';
import { mapApiError } from '../../../core/http/error-message.mapper';
import { addDaysDateOnly, formatDateOnly, formatOffsetDateTime, todayDateOnly } from '../../../shared/utils/date-only';
import { purposeLabel } from '../../../shared/utils/status-mappers';
import { AlertComponent, EmptyStateComponent, PageTitleComponent, PaginationComponent, StatusBadgeComponent } from '../../../shared/ui/ui.components';
import { Appointment, AppointmentReminder, AppointmentsRepository } from '../../appointments/infrastructure/appointments.repository';
import { PatientsRepository, Patient } from '../../patients/infrastructure/patients.repository';

interface ReminderRow {
  appointment: Appointment;
  reminder: AppointmentReminder | null;
  patient: Patient | null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertComponent, EmptyStateComponent, LucideEye, LucideX, PageTitleComponent, PaginationComponent, ReactiveFormsModule, StatusBadgeComponent],
  templateUrl: './reminders.page.html',
  styleUrl: './reminders.page.css',
})
export class RemindersPage {
  private readonly appointments = inject(AppointmentsRepository);
  private readonly patients = inject(PatientsRepository);
  private readonly fb = inject(FormBuilder);

  readonly todayDate = signal(todayDateOnly());
  readonly tomorrowDate = signal(addDaysDateOnly(this.todayDate(), 1));
  readonly todayRows = signal<ReminderRow[]>([]);
  readonly tomorrowRows = signal<ReminderRow[]>([]);
  readonly visibleTodayRows = signal<ReminderRow[]>([]);
  readonly visibleTomorrowRows = signal<ReminderRow[]>([]);
  readonly todayPage = signal<PageResponse<Appointment> | null>(null);
  readonly tomorrowPage = signal<PageResponse<Appointment> | null>(null);
  readonly selected = signal<ReminderRow | null>(null);
  readonly todayLoading = signal(false);
  readonly tomorrowLoading = signal(false);
  readonly error = signal('');
  readonly requestId = signal<string | undefined>(undefined);
  readonly form = this.fb.nonNullable.group({ status: [''], patient: [''] });

  constructor() {
    this.load();
  }

  load(): void {
    const today = todayDateOnly();
    this.todayDate.set(today);
    this.tomorrowDate.set(addDaysDateOnly(today, 1));
    this.loadToday(0);
    this.loadTomorrow(0);
  }

  loadToday(page: number): void {
    this.loadDay(this.todayDate(), page, this.todayLoading, this.todayPage, this.todayRows);
  }

  loadTomorrow(page: number): void {
    this.loadDay(this.tomorrowDate(), page, this.tomorrowLoading, this.tomorrowPage, this.tomorrowRows);
  }

  private loadDay(
    scheduledDate: string,
    page: number,
    loading: ReturnType<typeof signal<boolean>>,
    pageState: ReturnType<typeof signal<PageResponse<Appointment> | null>>,
    rowsState: ReturnType<typeof signal<ReminderRow[]>>,
  ): void {
    loading.set(true);
    this.error.set('');
    newestFirstPage(page, 8, (serverPage, size) => this.appointments.list({ scheduledDate, status: 'SCHEDULED', page: serverPage, size })).pipe(
      switchMap((response) => {
        pageState.set(response);
        return this.reminderRows(response.content);
      }),
      finalize(() => loading.set(false)),
    ).subscribe({
      next: (rows) => {
        rowsState.set(rows);
        this.applyRowsFilters();
      },
      error: (err) => {
        const mapped = mapApiError(err);
        this.error.set(mapped.message);
        this.requestId.set(mapped.requestId);
        pageState.set(null);
        rowsState.set([]);
        this.applyRowsFilters();
      },
    });
  }

  applyLocal(): void {
    this.error.set('');
    this.requestId.set(undefined);
    this.applyRowsFilters();
  }

  clear(): void {
    this.form.reset({ status: '', patient: '' });
    this.error.set('');
    this.requestId.set(undefined);
    this.applyRowsFilters();
  }

  private reminderRows(appointments: Appointment[]) {
    if (!appointments.length) {
      return of([]);
    }

    return forkJoin(appointments.map((appointment) =>
      this.appointments.get(appointment.id).pipe(
        switchMap((detail) => this.patients.lookup(detail.appointment.patientId).pipe(
          map((patient) => ({ appointment: detail.appointment, reminder: detail.reminder, patient })),
        )),
        catchError(() => this.patients.lookup(appointment.patientId).pipe(
          map((patient) => ({ appointment, reminder: null, patient })),
          catchError(() => of({ appointment, reminder: null, patient: null })),
        )),
      ),
    ));
  }

  private applyRowsFilters(): void {
    const { status, patient } = this.form.getRawValue();
    const needle = patient.trim().toLocaleLowerCase('es-PE');
    const filterRows = (rows: ReminderRow[]) => rows.filter((row) => {
      const statusOk = !status || row.reminder?.status === status;
      const patientOk = !needle || row.patient?.name.toLocaleLowerCase('es-PE').includes(needle);
      return statusOk && patientOk;
    });

    const todayRows = filterRows(this.todayRows());
    const tomorrowRows = filterRows(this.tomorrowRows());
    this.visibleTodayRows.set(todayRows);
    this.visibleTomorrowRows.set(tomorrowRows);

    const selected = this.selected();
    if (selected && ![...todayRows, ...tomorrowRows].some((row) => row.appointment.id === selected.appointment.id)) {
      this.selected.set(null);
    }
  }

  deliverySummary(row: ReminderRow): string {
    const reminder = row.reminder;
    if (!reminder) {
      return 'Esta cita todavía no tiene un recordatorio asociado.';
    }

    if (reminder.status === 'SENT') {
      return 'El recordatorio fue enviado correctamente.';
    }

    if (reminder.status === 'FAILED') {
      return 'No se pudo entregar el recordatorio. Revisa el canal de envío o vuelve a intentarlo cuando el servicio esté disponible.';
    }

    if (reminder.status === 'CANCELLED') {
      return 'El recordatorio fue cancelado y ya no se enviará.';
    }

    if (reminder.status === 'PROCESSING') {
      return 'El sistema está preparando el envío del recordatorio.';
    }

    return 'El recordatorio está pendiente de envío.';
  }

  sentLabel(row: ReminderRow): string {
    if (!row.reminder) {
      return 'No programado';
    }

    return row.reminder.sentAt ? this.formatDateTime(row.reminder.sentAt) : 'Aún no enviado';
  }

  reminderDateLabel(row: ReminderRow): string {
    return row.reminder?.scheduledAt ? this.formatDateTime(row.reminder.scheduledAt) : 'No programado';
  }

  reminderStatus(row: ReminderRow): string {
    return row.reminder?.status ?? 'Sin recordatorio';
  }

  reminderPurpose(row: ReminderRow): string {
    return row.reminder ? purposeLabel(row.reminder.purpose) : 'Recordatorio CRED';
  }

  formatDate = formatDateOnly;
  formatDateTime = formatOffsetDateTime;
}

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { PageResponse } from '../../../core/http/page-response';
import { formatDateOnly } from '../../../shared/utils/date-only';
import { AlertComponent, EmptyStateComponent, PageTitleComponent, PaginationComponent, StatusBadgeComponent } from '../../../shared/ui/ui.components';
import { Appointment, AppointmentsRepository } from '../infrastructure/appointments.repository';
import { PatientsRepository, Patient } from '../../patients/infrastructure/patients.repository';
import { mapApiError } from '../../../core/http/error-message.mapper';

interface AppointmentRow {
  appointment: Appointment;
  patient: Patient | null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertComponent, EmptyStateComponent, PageTitleComponent, PaginationComponent, ReactiveFormsModule, RouterLink, StatusBadgeComponent],
  templateUrl: './appointments.page.html',
  styleUrl: './appointments.page.css',
})
export class AppointmentsPage {
  private readonly repo = inject(AppointmentsRepository);
  private readonly patients = inject(PatientsRepository);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly requestId = signal<string | undefined>(undefined);
  readonly rows = signal<AppointmentRow[]>([]);
  readonly page = signal<PageResponse<Appointment> | null>(null);
  readonly form = this.fb.nonNullable.group({
    fromDate: [''],
    toDate: [''],
    status: [''],
    confirmationStatus: [''],
    establishment: [''],
  });

  constructor() {
    this.load(0);
  }

  load(page: number): void {
    if (!this.filtersValid()) {
      return;
    }

    this.loading.set(true);
    this.error.set('');
    const filters = this.form.getRawValue();
    this.repo.list({ ...filters, page, size: 8 }).pipe(
      switchMap((response) => {
        this.page.set(response);
        const lookups = response.content.map((appointment) =>
          this.patients.lookup(appointment.patientId).pipe(
            catchError(() => of(null)),
            map((patient) => ({ appointment, patient })),
          ),
        );
        return lookups.length ? forkJoin(lookups) : of([]);
      }),
    ).subscribe({
      next: (rows) => this.rows.set(rows),
      error: (err) => {
        const mapped = mapApiError(err);
        this.error.set(mapped.message);
        this.requestId.set(mapped.requestId);
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  clear(): void {
    this.form.reset({ fromDate: '', toDate: '', status: '', confirmationStatus: '', establishment: '' });
    this.load(0);
  }

  private filtersValid(): boolean {
    const { fromDate, toDate } = this.form.getRawValue();
    if (fromDate && toDate && fromDate > toDate) {
      this.error.set('La fecha "Desde" no puede ser posterior a la fecha "Hasta".');
      this.requestId.set(undefined);
      return false;
    }

    return true;
  }

  formatDate = formatDateOnly;
}

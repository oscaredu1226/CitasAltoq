import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import { formatDateOnly, formatOffsetDateTime } from '../../../shared/utils/date-only';
import { purposeLabel } from '../../../shared/utils/status-mappers';
import { PageTitleComponent, StatusBadgeComponent } from '../../../shared/ui/ui.components';
import { Patient, PatientsRepository } from '../../patients/infrastructure/patients.repository';
import { AppointmentDetail, AppointmentsRepository } from '../infrastructure/appointments.repository';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageTitleComponent, RouterLink, StatusBadgeComponent],
  templateUrl: './appointment-detail.page.html',
  styleUrl: './appointment-detail.page.css',
})
export class AppointmentDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly repo = inject(AppointmentsRepository);
  private readonly patients = inject(PatientsRepository);

  readonly detail = signal<AppointmentDetail | null>(null);
  readonly patient = signal<Patient | null>(null);
  readonly timeline = signal<AppointmentDetail['appointment'][]>([]);

  constructor() {
    this.route.paramMap.pipe(
      switchMap((params) => this.repo.get(params.get('id')!)),
      switchMap((detail) => {
        this.detail.set(detail);
        this.timeline.set([detail.appointment]);
        return forkJoin({
          patient: this.patients.lookup(detail.appointment.patientId).pipe(catchError(() => of(null))),
          previous: detail.appointment.rescheduledFromAppointmentId
            ? this.repo.get(detail.appointment.rescheduledFromAppointmentId).pipe(catchError(() => of(null)))
            : of(null),
        });
      }),
    ).subscribe(({ patient, previous }) => {
      this.patient.set(patient);
      if (previous) {
        this.timeline.set([this.detail()!.appointment, previous.appointment]);
      }
    });
  }

  formatDate = formatDateOnly;
  formatDateTime = formatOffsetDateTime;
  purpose = purposeLabel;
}

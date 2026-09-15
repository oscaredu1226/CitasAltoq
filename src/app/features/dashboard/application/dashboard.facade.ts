import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import { addDaysDateOnly, todayDateOnly } from '../../../shared/utils/date-only';
import { AppointmentsRepository, Appointment } from '../../appointments/infrastructure/appointments.repository';
import { PatientsRepository } from '../../patients/infrastructure/patients.repository';
import { AppointmentPatient } from '../../appointments/infrastructure/appointments.repository';
import { DashboardRepository } from '../infrastructure/dashboard.repository';

export interface DashboardAppointmentRow {
  appointment: Appointment;
  patient: AppointmentPatient | null;
}

export interface DashboardData {
  totalPatients: number | null;
  todayDate: string;
  tomorrowDate: string;
  todayScheduled: number | null;
  todayConfirmed: number | null;
  todayCannotAttend: number | null;
  todayPending: number | null;
  tomorrowScheduled: number | null;
  tomorrowConfirmed: number | null;
  tomorrowCannotAttend: number | null;
  tomorrowPending: number | null;
  todayAppointments: DashboardAppointmentRow[];
  nextAppointments: DashboardAppointmentRow[];
}

export interface DashboardFilters {
  red?: string;
  microred?: string;
  establishment?: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardFacade {
  private readonly patients = inject(PatientsRepository);
  private readonly appointments = inject(AppointmentsRepository);
  private readonly dashboard = inject(DashboardRepository);

  load(filters: DashboardFilters = {}): Observable<DashboardData> {
    const today = todayDateOnly();
    const tomorrow = addDaysDateOnly(today, 1);
    const appointmentFilters = {
      red: filters.red,
      microred: filters.microred,
      establishment: filters.establishment,
    };
    const total = <T>(source: Observable<{ totalElements: number }>) =>
      source.pipe(
        map((page) => page.totalElements),
        catchError(() => of(null)),
      );

    return forkJoin({
      totalPatients: total(this.patients.list({ ...filters, page: 0, size: 1 })),
      summary: this.dashboard.summary(filters),
      todayAppointments: this.appointments.list({ ...appointmentFilters, scheduledDate: today, status: 'SCHEDULED', page: 0, size: 6 }).pipe(
        map((page) => page.content),
        map((appointments) => this.appointmentRows(appointments)),
        catchError(() => of([])),
      ),
      nextAppointments: this.appointments.list({ ...appointmentFilters, fromDate: tomorrow, status: 'SCHEDULED', page: 0, size: 6 }).pipe(
        map((page) => page.content),
        map((appointments) => this.appointmentRows(appointments)),
        catchError(() => of([])),
      ),
    }).pipe(map(({ totalPatients, summary, todayAppointments, nextAppointments }) => ({
      totalPatients,
      todayDate: summary.today.date,
      tomorrowDate: summary.tomorrow.date,
      todayScheduled: summary.today.total,
      todayConfirmed: summary.today.confirmed,
      todayCannotAttend: summary.today.cannotAttend,
      todayPending: summary.today.noResponse,
      tomorrowScheduled: summary.tomorrow.total,
      tomorrowConfirmed: summary.tomorrow.confirmed,
      tomorrowCannotAttend: summary.tomorrow.cannotAttend,
      tomorrowPending: summary.tomorrow.noResponse,
      todayAppointments,
      nextAppointments,
    })));
  }

  private appointmentRows(appointments: Appointment[]): DashboardAppointmentRow[] {
    return appointments.map((appointment) => ({ appointment, patient: appointment.patient ?? null }));
  }
}

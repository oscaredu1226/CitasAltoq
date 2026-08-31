import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { addDaysDateOnly, todayDateOnly } from '../../../shared/utils/date-only';
import { AppointmentsRepository, Appointment } from '../../appointments/infrastructure/appointments.repository';
import { Patient, PatientsRepository } from '../../patients/infrastructure/patients.repository';

export interface DashboardAppointmentRow {
  appointment: Appointment;
  patient: Patient | null;
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
      todayDate: of(today),
      tomorrowDate: of(tomorrow),
      todayScheduled: total(this.appointments.list({ ...appointmentFilters, scheduledDate: today, status: 'SCHEDULED', page: 0, size: 1 })),
      todayConfirmed: total(this.appointments.list({ ...appointmentFilters, scheduledDate: today, status: 'SCHEDULED', confirmationStatus: 'CONFIRMED', page: 0, size: 1 })),
      todayCannotAttend: total(this.appointments.list({ ...appointmentFilters, scheduledDate: today, status: 'SCHEDULED', confirmationStatus: 'CANNOT_ATTEND', page: 0, size: 1 })),
      todayPending: total(this.appointments.list({ ...appointmentFilters, scheduledDate: today, status: 'SCHEDULED', confirmationStatus: 'PENDING', page: 0, size: 1 })),
      tomorrowScheduled: total(this.appointments.list({ ...appointmentFilters, scheduledDate: tomorrow, status: 'SCHEDULED', page: 0, size: 1 })),
      tomorrowConfirmed: total(this.appointments.list({ ...appointmentFilters, scheduledDate: tomorrow, status: 'SCHEDULED', confirmationStatus: 'CONFIRMED', page: 0, size: 1 })),
      tomorrowCannotAttend: total(this.appointments.list({ ...appointmentFilters, scheduledDate: tomorrow, status: 'SCHEDULED', confirmationStatus: 'CANNOT_ATTEND', page: 0, size: 1 })),
      tomorrowPending: total(this.appointments.list({ ...appointmentFilters, scheduledDate: tomorrow, status: 'SCHEDULED', confirmationStatus: 'PENDING', page: 0, size: 1 })),
      todayAppointments: this.appointments.list({ ...appointmentFilters, scheduledDate: today, status: 'SCHEDULED', page: 0, size: 6 }).pipe(
        map((page) => page.content),
        switchMap((appointments) => this.appointmentRows(appointments)),
        catchError(() => of([])),
      ),
      nextAppointments: this.appointments.list({ ...appointmentFilters, fromDate: tomorrow, status: 'SCHEDULED', page: 0, size: 6 }).pipe(
        map((page) => page.content),
        switchMap((appointments) => this.appointmentRows(appointments)),
        catchError(() => of([])),
      ),
    });
  }

  private appointmentRows(appointments: Appointment[]): Observable<DashboardAppointmentRow[]> {
    if (!appointments.length) {
      return of([]);
    }

    return forkJoin(appointments.map((appointment) =>
      this.patients.lookup(appointment.patientId).pipe(
        map((patient) => ({ appointment, patient })),
        catchError(() => of({ appointment, patient: null })),
      ),
    ));
  }
}

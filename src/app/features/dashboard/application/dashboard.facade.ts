import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import { emptyPage } from '../../../core/http/page-response';
import { todayDateOnly } from '../../../shared/utils/date-only';
import { AppointmentsRepository, Appointment } from '../../appointments/infrastructure/appointments.repository';
import { ImportsRepository, ImportBatch } from '../../imports/infrastructure/imports.repository';
import { OperationsRepository, OperationsStatus } from '../../operations/infrastructure/operations.repository';
import { PatientsRepository } from '../../patients/infrastructure/patients.repository';
import { RemindersRepository } from '../../reminders/infrastructure/reminders.repository';

export interface DashboardData {
  totalPatients: number | null;
  scheduledAppointments: number | null;
  todayAppointments: number | null;
  confirmedToday: number | null;
  cannotAttendToday: number | null;
  pendingToday: number | null;
  totalReminders: number | null;
  nextAppointments: Appointment[];
  recentImports: ImportBatch[];
  confirmationChart: { pending: number; confirmed: number; cannotAttend: number };
  operations: OperationsStatus | null;
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
  private readonly reminders = inject(RemindersRepository);
  private readonly imports = inject(ImportsRepository);
  private readonly operations = inject(OperationsRepository);

  load(filters: DashboardFilters = {}): Observable<DashboardData> {
    const today = todayDateOnly();
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
      scheduledAppointments: total(this.appointments.list({ ...appointmentFilters, status: 'SCHEDULED', page: 0, size: 1 })),
      todayAppointments: total(this.appointments.list({ ...appointmentFilters, scheduledDate: today, page: 0, size: 1 })),
      confirmedToday: total(this.appointments.list({ ...appointmentFilters, scheduledDate: today, confirmationStatus: 'CONFIRMED', page: 0, size: 1 })),
      cannotAttendToday: total(this.appointments.list({ ...appointmentFilters, scheduledDate: today, confirmationStatus: 'CANNOT_ATTEND', page: 0, size: 1 })),
      pendingToday: total(this.appointments.list({ ...appointmentFilters, scheduledDate: today, confirmationStatus: 'PENDING', page: 0, size: 1 })),
      totalReminders: total(this.reminders.list({ ...filters, page: 0, size: 1 })),
      nextAppointments: this.appointments.list({ ...appointmentFilters, fromDate: today, status: 'SCHEDULED', page: 0, size: 5 }).pipe(
        map((page) => page.content),
        catchError(() => of([])),
      ),
      recentImports: this.imports.list(0, 50).pipe(
        map((page) => page.content.filter((batch) => matchesImportScope(batch, filters)).slice(0, 5)),
        catchError(() => of(emptyPage<ImportBatch>().content)),
      ),
      operations: this.operations.status().pipe(catchError(() => of(null))),
    }).pipe(
      map((data) => ({
        ...data,
        confirmationChart: {
          pending: data.pendingToday ?? 0,
          confirmed: data.confirmedToday ?? 0,
          cannotAttend: data.cannotAttendToday ?? 0,
        },
      })),
    );
  }
}

function matchesImportScope(batch: ImportBatch, filters: DashboardFilters): boolean {
  if (filters.establishment && batch.scope.establishment !== filters.establishment) {
    return false;
  }

  if (filters.microred && batch.scope.microred !== filters.microred) {
    return false;
  }

  if (filters.red && batch.scope.red !== filters.red) {
    return false;
  }

  return true;
}

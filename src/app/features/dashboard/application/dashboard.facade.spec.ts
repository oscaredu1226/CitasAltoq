import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { PageResponse } from '../../../core/http/page-response';
import { addDaysDateOnly, todayDateOnly } from '../../../shared/utils/date-only';
import { AppointmentsRepository } from '../../appointments/infrastructure/appointments.repository';
import { PatientsRepository } from '../../patients/infrastructure/patients.repository';
import { DashboardFacade } from './dashboard.facade';
import { DashboardRepository } from '../infrastructure/dashboard.repository';

function page<T>(totalElements = 0, content: T[] = []): PageResponse<T> {
  return {
    content,
    page: 0,
    size: 1,
    totalElements,
    totalPages: totalElements > 0 ? 1 : 0,
  };
}

describe('DashboardFacade', () => {
  let appointments: { list: ReturnType<typeof vi.fn> };
  let dashboard: { summary: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    appointments = { list: vi.fn(() => of(page())) };
    dashboard = { summary: vi.fn(() => of({
      today: { date: todayDateOnly(), total: 10, confirmed: 4, cannotAttend: 2, noResponse: 4 },
      tomorrow: { date: addDaysDateOnly(todayDateOnly(), 1), total: 8, confirmed: 3, cannotAttend: 1, noResponse: 4 },
    })) };

    TestBed.configureTestingModule({
      providers: [
        DashboardFacade,
        { provide: PatientsRepository, useValue: { list: vi.fn(() => of(page())) } },
        { provide: AppointmentsRepository, useValue: appointments },
        { provide: DashboardRepository, useValue: dashboard },
      ],
    });
  });

  it('loads the daily confirmation totals from one aggregated request', async () => {
    const result = await firstValueFrom(TestBed.inject(DashboardFacade).load({ establishment: 'Centro' }));

    expect(dashboard.summary).toHaveBeenCalledOnce();
    expect(dashboard.summary).toHaveBeenCalledWith({ establishment: 'Centro' });
    expect(result.todayConfirmed).toBe(4);
    expect(result.todayCannotAttend).toBe(2);
    expect(result.todayPending).toBe(4);
    expect(appointments.list).toHaveBeenCalledTimes(2);
  });

  it('loads today appointments separately from future appointments', async () => {
    await firstValueFrom(TestBed.inject(DashboardFacade).load());

    const today = todayDateOnly();
    const tomorrow = addDaysDateOnly(today, 1);

    expect(appointments.list).toHaveBeenCalledWith(expect.objectContaining({
      scheduledDate: today,
      status: 'SCHEDULED',
      page: 0,
      size: 6,
    }));
    expect(appointments.list).toHaveBeenCalledWith(expect.objectContaining({
      fromDate: tomorrow,
      status: 'SCHEDULED',
      page: 0,
      size: 6,
    }));
  });
});

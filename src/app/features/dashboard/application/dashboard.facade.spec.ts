import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { PageResponse } from '../../../core/http/page-response';
import { addDaysDateOnly, todayDateOnly } from '../../../shared/utils/date-only';
import { AppointmentsRepository } from '../../appointments/infrastructure/appointments.repository';
import { PatientsRepository } from '../../patients/infrastructure/patients.repository';
import { DashboardFacade } from './dashboard.facade';

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

  beforeEach(() => {
    appointments = { list: vi.fn(() => of(page())) };

    TestBed.configureTestingModule({
      providers: [
        DashboardFacade,
        { provide: PatientsRepository, useValue: { list: vi.fn(() => of(page())) } },
        { provide: AppointmentsRepository, useValue: appointments },
      ],
    });
  });

  it('counts appointment confirmations separately for today and tomorrow', async () => {
    await firstValueFrom(TestBed.inject(DashboardFacade).load());

    const today = todayDateOnly();
    const tomorrow = addDaysDateOnly(today, 1);
    const confirmationCalls = appointments.list.mock.calls
      .map(([filters]) => filters)
      .filter((filters) => Boolean(filters.confirmationStatus));

    expect(confirmationCalls).toEqual(expect.arrayContaining([
      expect.objectContaining({ scheduledDate: today, status: 'SCHEDULED', confirmationStatus: 'CONFIRMED', page: 0, size: 1 }),
      expect.objectContaining({ scheduledDate: today, status: 'SCHEDULED', confirmationStatus: 'CANNOT_ATTEND', page: 0, size: 1 }),
      expect.objectContaining({ scheduledDate: today, status: 'SCHEDULED', confirmationStatus: 'PENDING', page: 0, size: 1 }),
      expect.objectContaining({ scheduledDate: tomorrow, status: 'SCHEDULED', confirmationStatus: 'CONFIRMED', page: 0, size: 1 }),
      expect.objectContaining({ scheduledDate: tomorrow, status: 'SCHEDULED', confirmationStatus: 'CANNOT_ATTEND', page: 0, size: 1 }),
      expect.objectContaining({ scheduledDate: tomorrow, status: 'SCHEDULED', confirmationStatus: 'PENDING', page: 0, size: 1 }),
    ]));
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

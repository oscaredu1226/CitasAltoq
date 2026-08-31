import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthFacade } from '../../../core/auth/auth.facade';
import { CurrentUser } from '../../../core/auth/auth.models';
import { DashboardData, DashboardFacade } from '../application/dashboard.facade';
import { OrganizationStore } from '../../organization/application/organization.store';
import { DashboardPage } from './dashboard.page';

const adminUser: CurrentUser = {
  id: 'admin-1',
  email: 'admin@edifmisti.pe',
  displayName: 'Administrador',
  active: true,
  masterAdmin: true,
  roles: ['ADMIN'],
  establishment: null,
};

function dashboardData(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    totalPatients: 6,
    todayDate: '2026-08-31',
    tomorrowDate: '2026-09-01',
    todayScheduled: 6,
    todayConfirmed: 0,
    todayCannotAttend: 0,
    todayPending: 6,
    tomorrowScheduled: 4,
    tomorrowConfirmed: 0,
    tomorrowCannotAttend: 0,
    tomorrowPending: 4,
    todayAppointments: [],
    nextAppointments: [],
    ...overrides,
  };
}

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let facade: { load: ReturnType<typeof vi.fn> };

  function configure(): void {
    facade = {
      load: vi.fn(() => of(dashboardData())),
    };

    TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideRouter([]),
        { provide: AuthFacade, useValue: { session: { user: signal(adminUser) } } },
        {
          provide: OrganizationStore,
          useValue: {
            load: vi.fn(),
            reds: signal([]),
            microreds: signal([]),
            establishments: signal([]),
            loading: signal(false),
            error: signal(''),
          },
        },
        { provide: DashboardFacade, useValue: facade },
      ],
    });

    fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('refreshes metrics automatically after external appointment confirmations', async () => {
    vi.useFakeTimers();
    configure();
    expect(facade.load).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.data()?.todayConfirmed).toBe(0);

    facade.load.mockReturnValue(of(dashboardData({
      todayConfirmed: 1,
      todayPending: 5,
    })));

    await vi.advanceTimersByTimeAsync(10_000);
    fixture.detectChanges();

    expect(facade.load).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.data()?.todayConfirmed).toBe(1);
    expect(fixture.componentInstance.data()?.todayPending).toBe(5);
  });
});

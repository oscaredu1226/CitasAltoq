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

    await vi.advanceTimersByTimeAsync(60_000);
    fixture.detectChanges();

    expect(facade.load).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.data()?.todayConfirmed).toBe(1);
    expect(fixture.componentInstance.data()?.todayPending).toBe(5);
  });

  it('renders confirmation charts for today and tomorrow', () => {
    configure();
    facade.load.mockReturnValue(of(dashboardData({
      todayScheduled: 10,
      todayConfirmed: 6,
      todayCannotAttend: 1,
      todayPending: 3,
      tomorrowScheduled: 5,
      tomorrowConfirmed: 2,
      tomorrowCannotAttend: 1,
      tomorrowPending: 2,
    })));

    fixture.componentInstance.load();
    fixture.detectChanges();

    const charts = fixture.nativeElement.querySelectorAll('.confirmation-chart');
    expect(charts).toHaveLength(2);
    expect(charts[0].textContent).toContain('Confirmaciones de hoy');
    expect(charts[0].textContent).toContain('Sí asistirá');
    expect(charts[0].textContent).toContain('60%');
    expect(charts[1].textContent).toContain('Confirmaciones de mañana');
    expect(charts[1].textContent).toContain('40%');
    expect(fixture.componentInstance.donutBackground(10, 6, 1, 3)).toContain('conic-gradient');
  });
});

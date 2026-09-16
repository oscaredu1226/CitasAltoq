import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthFacade } from '../../../core/auth/auth.facade';
import { CurrentUser } from '../../../core/auth/auth.models';
import { MfaStore } from '../../../core/mfa/mfa.store';
import { OrganizationStore } from '../../organization/application/organization.store';
import { DailyReportCandidate, DailyReportSubscription, OperationsRepository, ReminderAudience } from '../infrastructure/operations.repository';
import { OperationsPage } from './operations.page';

const status = {
  whatsAppEnabled: true,
  reminderSchedulerEnabled: true,
  credSyncEnabled: true,
  credTemplateEnabled: true,
  credDispatchEnabled: false,
};

const establishments = [
  {
    id: '1',
    name: 'Centro de Salud Mariano Melgar',
    active: true,
    microred: { id: '10', name: 'Microred Mariano Melgar' },
    red: { id: '20', name: 'Red Arequipa Caylloma' },
  },
  {
    id: '2',
    name: 'Puesto de Salud Alto Selva Alegre',
    active: true,
    microred: { id: '12', name: 'Microred Alto Selva Alegre' },
    red: { id: '21', name: 'Red Arequipa Norte' },
  },
  {
    id: '3',
    name: 'Centro de Salud Inactivo',
    active: false,
    microred: { id: '11', name: 'Microred Inactiva' },
    red: { id: '20', name: 'Red Arequipa Caylloma' },
  },
];

const selectedAudience: ReminderAudience = {
  mode: 'SELECTED',
  selectedEstablishments: [{
    id: 1,
    name: 'Centro de Salud Mariano Melgar',
    active: true,
    microredId: 10,
    microredName: 'Microred Mariano Melgar',
    redId: 20,
    redName: 'Red Arequipa Caylloma',
  }],
  updatedAt: '2026-08-30T23:00:00Z',
};

const reportCandidates: DailyReportCandidate[] = [
  {
    userId: 'operator-1',
    userDisplayName: 'Ana Operadora',
    userEmail: 'ana@edifmisti.pe',
    establishmentId: 1,
    establishmentName: 'Centro de Salud Mariano Melgar',
    microredName: 'Microred Mariano Melgar',
    redName: 'Red Arequipa Caylloma',
  },
  {
    userId: 'operator-2',
    userDisplayName: 'Beatriz Operadora',
    userEmail: 'beatriz@edifmisti.pe',
    establishmentId: 1,
    establishmentName: 'Centro de Salud Mariano Melgar',
    microredName: 'Microred Mariano Melgar',
    redName: 'Red Arequipa Caylloma',
  },
  {
    userId: 'operator-3',
    userDisplayName: 'Carlos Operador',
    userEmail: 'carlos@edifmisti.pe',
    establishmentId: 2,
    establishmentName: 'Puesto de Salud Alto Selva Alegre',
    microredName: 'Microred Alto Selva Alegre',
    redName: 'Red Arequipa Norte',
  },
];

function user(masterAdmin: boolean): CurrentUser {
  return {
    id: 'user-1',
    email: 'admin@edifmisti.pe',
    displayName: 'Admin',
    active: true,
    masterAdmin,
    roles: ['ADMIN'],
    establishment: null,
  };
}

describe('OperationsPage', () => {
  let repository: {
    status: ReturnType<typeof vi.fn>;
    reminderAudience: ReturnType<typeof vi.fn>;
    updateReminderAudience: ReturnType<typeof vi.fn>;
    dailyReportSubscriptions: ReturnType<typeof vi.fn>;
    dailyReportCandidates: ReturnType<typeof vi.fn>;
    createDailyReportSubscription: ReturnType<typeof vi.fn>;
    updateDailyReportSubscription: ReturnType<typeof vi.fn>;
    deleteDailyReportSubscription: ReturnType<typeof vi.fn>;
    sendDailyReportNow: ReturnType<typeof vi.fn>;
  };
  let fixture: ComponentFixture<OperationsPage>;

  function configure(
    masterAdmin: boolean,
    audience: ReminderAudience = selectedAudience,
    reminderAudienceResult: Observable<ReminderAudience> = of(audience),
    mfaElevated = true,
    candidates: DailyReportCandidate[] = [],
    subscriptionsResult: Observable<DailyReportSubscription[]> = of([]),
    candidatesResult: Observable<DailyReportCandidate[]> = of(candidates),
  ): void {
    repository = {
      status: vi.fn(() => of(status)),
      reminderAudience: vi.fn(() => reminderAudienceResult),
      updateReminderAudience: vi.fn(() => of({ ...audience, updatedAt: '2026-08-30T23:30:00Z' })),
      dailyReportSubscriptions: vi.fn(() => subscriptionsResult),
      dailyReportCandidates: vi.fn(() => candidatesResult),
      createDailyReportSubscription: vi.fn(),
      updateDailyReportSubscription: vi.fn(),
      deleteDailyReportSubscription: vi.fn(),
      sendDailyReportNow: vi.fn(() => of(undefined)),
    };

    TestBed.configureTestingModule({
      imports: [OperationsPage],
      providers: [
        provideRouter([]),
        { provide: AuthFacade, useValue: { session: { user: signal(user(masterAdmin)) } } },
        { provide: MfaStore, useValue: { elevated: signal(mfaElevated), hasFreshElevation: vi.fn(() => mfaElevated) } },
        {
          provide: OrganizationStore,
          useValue: {
            establishments: signal(establishments),
            loading: signal(false),
            error: signal(''),
            load: vi.fn(),
          },
        },
        { provide: OperationsRepository, useValue: repository },
      ],
    });

    fixture = TestBed.createComponent(OperationsPage);
    fixture.detectChanges();
  }

  it('does not request reminder audience settings for non-master admins', () => {
    configure(false, selectedAudience, throwError(() => new HttpErrorResponse({ status: 403 })));

    expect(repository.reminderAudience).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('Establecimientos habilitados para recordatorios');
    expect(fixture.nativeElement.textContent).toContain('Acceso restringido');
    expect(fixture.nativeElement.textContent).not.toContain('masterAdmin');
    expect(fixture.nativeElement.textContent).not.toContain('superadministrador');
    expect(fixture.nativeElement.textContent).not.toContain('administrador maestro');
  });

  it('requires MFA before loading reminder audience settings for master admins', () => {
    configure(true, selectedAudience, of(selectedAudience), false);

    expect(repository.reminderAudience).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('MFA requerido');
  });

  it('shows only active establishments for master admins', () => {
    configure(true);

    expect(repository.reminderAudience).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Centro de Salud Mariano Melgar');
    expect(fixture.nativeElement.textContent).toContain('Puesto de Salud Alto Selva Alegre');
    expect(fixture.nativeElement.textContent).not.toContain('Centro de Salud Inactivo');
  });

  it('filters active establishments by name, Red and Microred', () => {
    configure(true);

    fixture.componentInstance.updateNameFilter('mariano');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Centro de Salud Mariano Melgar');
    expect(fixture.nativeElement.textContent).not.toContain('Puesto de Salud Alto Selva Alegre');

    fixture.componentInstance.updateNameFilter('');
    fixture.componentInstance.updateRedFilter('21');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Centro de Salud Mariano Melgar');
    expect(fixture.nativeElement.textContent).toContain('Puesto de Salud Alto Selva Alegre');

    fixture.componentInstance.updateRedFilter('');
    fixture.componentInstance.updateMicroredFilter('10');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Centro de Salud Mariano Melgar');
    expect(fixture.nativeElement.textContent).not.toContain('Puesto de Salud Alto Selva Alegre');
  });

  it('selects all filtered establishments without changing hidden selections', () => {
    configure(true);

    fixture.componentInstance.updateRedFilter('21');
    fixture.componentInstance.selectFilteredEstablishments();

    expect(Array.from(fixture.componentInstance.selectedIds()).sort()).toEqual(['1', '2']);
    expect(fixture.componentInstance.canSave()).toBe(true);
  });

  it('saves an empty selected scope after deselecting the enabled establishments', () => {
    configure(true);

    fixture.componentInstance.deselectAllEstablishments();

    expect(fixture.componentInstance.selectedIds().size).toBe(0);
    expect(fixture.componentInstance.canSave()).toBe(true);

    fixture.componentInstance.save();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No quedará ningún establecimiento autorizado');

    fixture.componentInstance.confirmSave();

    expect(repository.updateReminderAudience).toHaveBeenCalledWith({ mode: 'SELECTED', establishmentIds: [] });
  });

  it('requires final confirmation before saving selected establishments', () => {
    configure(true);

    fixture.componentInstance.toggleEstablishment('2', true);
    fixture.componentInstance.save();
    fixture.detectChanges();

    expect(repository.updateReminderAudience).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Confirmar establecimientos habilitados');
    expect(fixture.nativeElement.textContent).toContain('Centro de Salud Mariano Melgar');

    fixture.componentInstance.confirmSave();

    expect(repository.updateReminderAudience).toHaveBeenCalledWith({ mode: 'SELECTED', establishmentIds: [1, 2] });
  });

  it('renders an existing ALL configuration as selected active establishments', () => {
    configure(true, {
      mode: 'ALL',
      selectedEstablishments: [],
      updatedAt: '2026-08-30T23:00:00Z',
    });

    expect(fixture.componentInstance.selectedIds()).toEqual(new Set(['1', '2']));
    expect(fixture.nativeElement.textContent).toContain('Centro de Salud Mariano Melgar');
    expect(fixture.nativeElement.textContent).toContain('Puesto de Salud Alto Selva Alegre');
    expect(fixture.nativeElement.textContent).not.toContain('Todos los establecimientos');
  });

  it('sends ALL without establishment IDs after explicit confirmation', () => {
    configure(true);

    fixture.componentInstance.enableAllEstablishments();
    fixture.componentInstance.save();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('abrir el envío masivo');

    fixture.componentInstance.confirmSave();

    expect(repository.updateReminderAudience).toHaveBeenCalledWith({ mode: 'ALL', establishmentIds: [] });
  });

  it('shows backend validation and permission errors', () => {
    configure(true);
    repository.updateReminderAudience.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 400 })));

    fixture.componentInstance.toggleEstablishment('2', true);
    fixture.componentInstance.save();
    fixture.componentInstance.confirmSave();

    expect(fixture.componentInstance.error()).toContain('configuración enviada no es válida');

    repository.updateReminderAudience.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 403 })));
    fixture.componentInstance.save();
    fixture.componentInstance.confirmSave();

    expect(fixture.componentInstance.error()).toContain('no tiene permisos');
  });

  it('sends today report immediately and explains that the nightly send will not repeat it', () => {
    configure(true);
    const subscription = {
      id: 'report-1',
      userId: 'user-1',
      establishmentId: 1,
      recipientEmail: 'reportes@edifmisti.pe',
      active: true,
      userDisplayName: 'Operador',
      userEmail: 'operador@edifmisti.pe',
      establishmentName: 'Centro de Salud Mariano Melgar',
      microredName: 'Microred Mariano Melgar',
      redName: 'Red Arequipa Caylloma',
      createdAt: '2026-09-15T12:00:00Z',
      updatedAt: '2026-09-15T12:00:00Z',
    };

    fixture.componentInstance.sendReportNow(subscription);

    expect(repository.sendDailyReportNow).toHaveBeenCalledWith('report-1');
    expect(fixture.componentInstance.message()).toContain('No se volverá a enviar esta noche');
  });

  it('groups active report candidates by establishment before showing their users', () => {
    configure(true, selectedAudience, of(selectedAudience), true, reportCandidates);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    const establishmentOptions = Array.from(
      element.querySelectorAll<HTMLOptionElement>('.report-establishment-select option'),
      (option) => option.textContent?.trim(),
    );
    expect(establishmentOptions).toContain('Centro de Salud Mariano Melgar (2 cuentas activas)');
    expect(establishmentOptions).toContain('Puesto de Salud Alto Selva Alegre (1 cuenta activa)');

    fixture.componentInstance.selectReportEstablishment('1');
    fixture.detectChanges();

    const userOptions = Array.from(
      element.querySelectorAll<HTMLOptionElement>('.report-user-select option'),
      (option) => option.textContent,
    ).join(' ');
    expect(userOptions).toContain('Ana Operadora');
    expect(userOptions).toContain('Beatriz Operadora');
    expect(userOptions).not.toContain('Carlos Operador');
  });

  it('keeps successfully loaded candidates visible when subscriptions fail to load', () => {
    configure(
      true,
      selectedAudience,
      of(selectedAudience),
      true,
      reportCandidates,
      throwError(() => new HttpErrorResponse({ status: 503 })),
    );
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.report-load-error')?.textContent).toContain('No se pudo cargar toda la configuración');
    expect(element.querySelector('.report-establishment-select')?.textContent).toContain('Centro de Salud Mariano Melgar');
    expect(element.textContent).not.toContain('Todavía no hay destinatarios configurados');
    expect(fixture.componentInstance.canAddReport()).toBe(false);
  });

  it('excludes configured users without hiding other active users from the same establishment', () => {
    const configured: DailyReportSubscription = {
      id: 'report-1',
      userId: 'operator-1',
      establishmentId: 1,
      recipientEmail: 'reportes@edifmisti.pe',
      active: true,
      userDisplayName: 'Ana Operadora',
      userEmail: 'ana@edifmisti.pe',
      establishmentName: 'Centro de Salud Mariano Melgar',
      microredName: 'Microred Mariano Melgar',
      redName: 'Red Arequipa Caylloma',
      createdAt: '2026-09-15T12:00:00Z',
      updatedAt: '2026-09-15T12:00:00Z',
    };
    configure(true, selectedAudience, of(selectedAudience), true, reportCandidates, of([configured]));
    fixture.componentInstance.selectReportEstablishment('1');
    fixture.detectChanges();
    const userOptions = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLOptionElement>('.report-user-select option'),
      (option) => option.textContent,
    ).join(' ');

    expect(userOptions).not.toContain('Ana Operadora');
    expect(userOptions).toContain('Beatriz Operadora');
  });
});

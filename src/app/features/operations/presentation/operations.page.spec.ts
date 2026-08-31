import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthFacade } from '../../../core/auth/auth.facade';
import { CurrentUser } from '../../../core/auth/auth.models';
import { OrganizationStore } from '../../organization/application/organization.store';
import { OperationsRepository, ReminderAudience } from '../infrastructure/operations.repository';
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
  };
  let fixture: ComponentFixture<OperationsPage>;

  function configure(
    masterAdmin: boolean,
    audience: ReminderAudience = selectedAudience,
    reminderAudienceResult: Observable<ReminderAudience> = of(audience),
  ): void {
    repository = {
      status: vi.fn(() => of(status)),
      reminderAudience: vi.fn(() => reminderAudienceResult),
      updateReminderAudience: vi.fn(() => of({ ...audience, updatedAt: '2026-08-30T23:30:00Z' })),
    };

    TestBed.configureTestingModule({
      imports: [OperationsPage],
      providers: [
        provideRouter([]),
        { provide: AuthFacade, useValue: { session: { user: signal(user(masterAdmin)) } } },
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

  it('shows a restricted state when the backend denies a non-master admin', () => {
    configure(false, selectedAudience, throwError(() => new HttpErrorResponse({ status: 403 })));

    expect(repository.reminderAudience).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('Establecimientos habilitados para recordatorios');
    expect(fixture.nativeElement.textContent).toContain('Administrador maestro requerido');
  });

  it('shows reminder audience settings when the backend authorizes the current admin', () => {
    configure(false);

    expect(repository.reminderAudience).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Establecimientos habilitados para recordatorios');
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

  it('disables saving selected mode without active establishments', () => {
    configure(true, { mode: 'SELECTED', selectedEstablishments: [], updatedAt: '2026-08-30T23:00:00Z' });

    expect(fixture.componentInstance.canSave()).toBe(false);
  });

  it('requires visual confirmation before enabling all establishments', () => {
    configure(true);

    fixture.componentInstance.selectMode('ALL');
    fixture.detectChanges();

    expect(fixture.componentInstance.mode()).toBe('SELECTED');
    expect(fixture.nativeElement.textContent).toContain('Habilitar todos los establecimientos');
  });

  it('requires final confirmation before saving selected establishments', () => {
    configure(true);

    fixture.componentInstance.save();
    fixture.detectChanges();

    expect(repository.updateReminderAudience).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Confirmar establecimientos habilitados');
    expect(fixture.nativeElement.textContent).toContain('Centro de Salud Mariano Melgar');

    fixture.componentInstance.confirmSave();

    expect(repository.updateReminderAudience).toHaveBeenCalledWith({ mode: 'SELECTED', establishmentIds: [1] });
  });

  it('saves ALL mode with an empty establishmentIds payload after double confirmation', () => {
    configure(true);

    fixture.componentInstance.selectMode('ALL');
    fixture.componentInstance.confirmAll();
    fixture.componentInstance.save();

    expect(repository.updateReminderAudience).not.toHaveBeenCalled();

    fixture.componentInstance.confirmSave();

    expect(repository.updateReminderAudience).toHaveBeenCalledWith({ mode: 'ALL', establishmentIds: [] });
  });

  it('shows backend validation and permission errors', () => {
    configure(true);
    repository.updateReminderAudience.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 400 })));

    fixture.componentInstance.save();
    fixture.componentInstance.confirmSave();

    expect(fixture.componentInstance.error()).toContain('configuración enviada no es válida');

    repository.updateReminderAudience.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 403 })));
    fixture.componentInstance.save();
    fixture.componentInstance.confirmSave();

    expect(fixture.componentInstance.error()).toContain('administrador maestro');
  });
});

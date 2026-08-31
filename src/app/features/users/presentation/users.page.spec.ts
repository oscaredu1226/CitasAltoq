import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthFacade } from '../../../core/auth/auth.facade';
import { CurrentUser } from '../../../core/auth/auth.models';
import { MfaStore } from '../../../core/mfa/mfa.store';
import { emptyPage } from '../../../core/http/page-response';
import { OrganizationStore } from '../../organization/application/organization.store';
import { UsersRepository } from '../infrastructure/users.repository';
import { UsersPage } from './users.page';

function currentUser(masterAdmin: boolean): CurrentUser {
  return {
    id: 'admin-1',
    email: 'admin@edifmisti.pe',
    displayName: 'Administrador',
    active: true,
    masterAdmin,
    roles: ['ADMIN'],
    establishment: null,
  };
}

describe('UsersPage', () => {
  let fixture: ComponentFixture<UsersPage>;
  let repository: {
    list: ReturnType<typeof vi.fn>;
    createAdmin: ReturnType<typeof vi.fn>;
    createOperator: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    resetPassword: ReturnType<typeof vi.fn>;
  };

  function configure(masterAdmin: boolean, mfaElevated = false): void {
    repository = {
      list: vi.fn(() => of(emptyPage())),
      createAdmin: vi.fn(() => of({})),
      createOperator: vi.fn(() => of({})),
      update: vi.fn(() => of({})),
      resetPassword: vi.fn(() => of(undefined)),
    };

    TestBed.configureTestingModule({
      imports: [UsersPage],
      providers: [
        provideRouter([]),
        { provide: AuthFacade, useValue: { session: { user: signal(currentUser(masterAdmin)) } } },
        { provide: MfaStore, useValue: { elevated: signal(mfaElevated), hasFreshElevation: vi.fn(() => mfaElevated) } },
        {
          provide: OrganizationStore,
          useValue: {
            establishments: signal([]),
            loading: signal(false),
            error: signal(''),
            load: vi.fn(),
          },
        },
        { provide: UsersRepository, useValue: repository },
      ],
    });

    fixture = TestBed.createComponent(UsersPage);
    fixture.detectChanges();
  }

  it('hides admin creation for regular admins', () => {
    configure(false);

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Crear usuario');
    expect(fixture.nativeElement.textContent).not.toContain('Administrador');
  });

  it('prevents a regular admin from creating another admin', () => {
    configure(false, true);
    const component = fixture.componentInstance;

    component.newUser();
    component.form.patchValue({
      email: 'admin2@example.test',
      displayName: 'Admin 2',
      password: 'password123',
      confirm: 'password123',
      accountType: 'ADMIN',
      establishmentId: '',
    });
    component.save();

    expect(repository.createAdmin).not.toHaveBeenCalled();
    expect(component.message()).toBe('Solo el superadministrador puede crear cuentas administradoras.');
  });

  it('creates admins only when the current user is master admin', () => {
    configure(true, true);
    const component = fixture.componentInstance;

    component.newUser();
    component.form.patchValue({
      email: 'nuevo-admin@example.test',
      displayName: 'Nuevo admin',
      password: 'password123',
      confirm: 'password123',
      accountType: 'ADMIN',
      establishmentId: '123',
    });
    component.save();

    expect(repository.createAdmin).toHaveBeenCalledWith({
      email: 'nuevo-admin@example.test',
      displayName: 'Nuevo admin',
      password: 'password123',
    });
    expect(repository.createOperator).not.toHaveBeenCalled();
    expect(component.form.controls.password.value).toBe('');
    expect(component.form.controls.establishmentId.value).toBe('');
  });

  it('creates establishment operators with a numeric establishment id', () => {
    configure(true, true);
    const component = fixture.componentInstance;

    component.newUser();
    component.form.patchValue({
      email: 'operador@example.test',
      displayName: 'Operador',
      password: 'password123',
      confirm: 'password123',
      accountType: 'ESTABLISHMENT_OPERATOR',
      establishmentId: '123',
    });
    component.save();

    expect(repository.createOperator).toHaveBeenCalledWith({
      email: 'operador@example.test',
      displayName: 'Operador',
      password: 'password123',
      establishmentId: 123,
    });
    expect(repository.createAdmin).not.toHaveBeenCalled();
  });

  it('shows user-specific backend errors for admin creation', () => {
    configure(true, true);
    const component = fixture.componentInstance;

    component.showError(new HttpErrorResponse({ status: 403 }));
    expect(component.message()).toBe('Solo el superadministrador puede crear cuentas administradoras.');

    component.showError(new HttpErrorResponse({ status: 409, error: { detail: 'Correo ya registrado.' } }));
    expect(component.message()).toBe('Correo ya registrado.');

    repository.createAdmin.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 400 })));
    component.newUser();
    component.form.patchValue({
      email: 'nuevo-admin@example.test',
      displayName: 'Nuevo admin',
      password: 'password123',
      confirm: 'password123',
      accountType: 'ADMIN',
    });
    component.save();
    expect(component.message()).toContain('Revisa los datos ingresados');
  });
});

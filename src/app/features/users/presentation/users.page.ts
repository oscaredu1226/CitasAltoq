import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideKeyRound, LucidePencil, LucidePlus, LucideSave, LucideX } from '@lucide/angular';
import { AuthFacade } from '../../../core/auth/auth.facade';
import { PageResponse } from '../../../core/http/page-response';
import { mapApiError } from '../../../core/http/error-message.mapper';
import { isMasterAdmin, roleLabel, UserRole } from '../../../core/auth/auth.models';
import { MfaChallengeComponent } from '../../../core/mfa/mfa-challenge.component';
import { MfaStore } from '../../../core/mfa/mfa.store';
import { AlertComponent, EmptyStateComponent, FieldErrorComponent, PageTitleComponent, PaginationComponent, StatusBadgeComponent } from '../../../shared/ui/ui.components';
import { EstablishmentSelectComponent } from '../../organization/presentation/establishment-select/establishment-select.component';
import { AdminUser, UsersRepository } from '../infrastructure/users.repository';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AlertComponent,
    EmptyStateComponent,
    EstablishmentSelectComponent,
    FieldErrorComponent,
    LucideKeyRound,
    LucidePencil,
    LucidePlus,
    LucideSave,
    LucideX,
    MfaChallengeComponent,
    PageTitleComponent,
    PaginationComponent,
    ReactiveFormsModule,
    StatusBadgeComponent,
  ],
  templateUrl: './users.page.html',
  styleUrl: './users.page.css',
})
export class UsersPage {
  private readonly repo = inject(UsersRepository);
  private readonly auth = inject(AuthFacade);
  private readonly mfa = inject(MfaStore);
  private readonly fb = inject(FormBuilder);
  readonly page = signal<PageResponse<AdminUser> | null>(null);
  readonly selected = signal<AdminUser | null>(null);
  readonly passwordUser = signal<AdminUser | null>(null);
  readonly editing = signal(false);
  readonly mfaOpen = signal(false);
  readonly message = signal('');
  readonly error = signal(false);
  readonly requestId = signal<string | undefined>(undefined);
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    displayName: ['', [Validators.required]],
    password: ['', [Validators.minLength(8)]],
    confirm: ['', [Validators.minLength(8)]],
    accountType: ['ADMIN' as UserRole],
    establishmentId: [''],
    active: [true],
  });
  readonly masterAdmin = computed(() => isMasterAdmin(this.auth.session.user()));
  readonly canMutateUsers = computed(() => this.masterAdmin() && this.mfa.elevated());
  readonly canCreateAdmin = this.canMutateUsers;
  readonly passwordForm = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirm: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor() {
    this.load(0);
  }

  load(page: number): void {
    this.repo.list(page, 10).subscribe((response) => this.page.set(response));
  }

  newUser(): void {
    if (!this.ensureMfa()) {
      return;
    }

    this.selected.set(null);
    this.form.reset({
      email: '',
      displayName: '',
      password: '',
      confirm: '',
      accountType: this.canCreateAdmin() ? 'ADMIN' : 'ESTABLISHMENT_OPERATOR',
      establishmentId: '',
      active: true,
    });
    this.form.controls.accountType.enable();
    this.editing.set(true);
  }

  edit(user: AdminUser): void {
    if (!this.ensureMfa()) {
      return;
    }

    this.selected.set(user);
    this.form.reset({
      email: user.email,
      displayName: user.displayName,
      password: '',
      confirm: '',
      accountType: user.roles[0],
      establishmentId: user.establishment?.id ?? '',
      active: user.active,
    });
    this.form.controls.accountType.disable();
    this.editing.set(true);
  }

  save(): void {
    if (!this.ensureMfa()) {
      return;
    }

    this.applyUserValidation();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const accountErrors = this.form.controls.accountType.errors;
      this.message.set(accountErrors?.['forbiddenAdmin']
        ? 'Solo el superadministrador puede crear cuentas administradoras.'
        : 'Corrige los campos marcados antes de guardar el usuario.');
      this.error.set(true);
      return;
    }

    const value = this.form.getRawValue();
    const selected = this.selected();
    const establishmentId = Number(value.establishmentId);

    const request = selected
      ? this.repo.update(selected.id, { email: value.email, displayName: value.displayName, active: value.active })
      : value.accountType === 'ADMIN'
        ? this.repo.createAdmin({ email: value.email, displayName: value.displayName, password: value.password })
        : this.repo.createOperator({
            email: value.email,
            displayName: value.displayName,
            password: value.password,
            establishmentId,
          });

    request.subscribe({
      next: () => {
        this.message.set(selected ? 'Usuario actualizado.' : 'Usuario creado.');
        this.error.set(false);
        this.closeEditor();
        this.load(this.page()?.page ?? 0);
      },
      error: (err) => this.showError(err),
    });
  }

  resetPassword(user: AdminUser): void {
    if (!this.ensureMfa()) {
      return;
    }

    this.passwordForm.reset({ password: '', confirm: '' });
    this.passwordUser.set(user);
  }

  selectEstablishment(establishmentId: string): void {
    this.form.controls.establishmentId.setValue(establishmentId);
    this.form.controls.establishmentId.markAsDirty();
    if (establishmentId) {
      this.clearControlErrors(this.form.controls.establishmentId, ['required']);
    }
  }

  selectAccountType(role: UserRole): void {
    if (role === 'ADMIN' && !this.canCreateAdmin()) {
      this.form.controls.accountType.setValue('ESTABLISHMENT_OPERATOR');
      this.form.controls.establishmentId.setValue('');
      this.message.set('Solo el superadministrador puede crear cuentas administradoras.');
      this.error.set(true);
      return;
    }

    this.form.controls.accountType.setValue(role);
    if (role === 'ADMIN') {
      this.form.controls.establishmentId.setValue('');
      this.clearControlErrors(this.form.controls.establishmentId, ['required', 'invalid']);
    }
  }

  closeEditor(): void {
    this.form.reset({ email: '', displayName: '', password: '', confirm: '', accountType: this.canCreateAdmin() ? 'ADMIN' : 'ESTABLISHMENT_OPERATOR', establishmentId: '', active: true });
    this.editing.set(false);
    this.selected.set(null);
  }

  savePassword(user: AdminUser): void {
    if (!this.ensureMfa()) {
      return;
    }

    const value = this.passwordForm.getRawValue();
    this.clearControlErrors(this.passwordForm.controls.confirm, ['passwordMismatch']);
    if (value.password && value.confirm && value.password !== value.confirm) {
      this.addControlError(this.passwordForm.controls.confirm, 'passwordMismatch');
    }

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      this.message.set('Corrige la nueva contraseña antes de guardar.');
      this.error.set(true);
      return;
    }
    this.repo.resetPassword(user.id, value.password).subscribe({
      next: () => {
        this.message.set('Contraseña restablecida.');
        this.error.set(false);
        this.passwordUser.set(null);
      },
      error: (err) => this.showError(err),
    });
  }

  role(role: UserRole | undefined): string {
    return roleLabel(role);
  }

  creatingOperator(): boolean {
    return this.form.controls.accountType.value === 'ESTABLISHMENT_OPERATOR';
  }

  organizationColumn(user: AdminUser, part: 'establishment' | 'microred' | 'red'): string {
    if (user.roles.includes('ADMIN')) {
      return part === 'establishment' ? '-' : 'Global';
    }

    if (part === 'establishment') {
      return user.establishment?.name ?? 'No asignado';
    }

    if (part === 'microred') {
      return user.establishment?.microred?.name ?? 'No asignada';
    }

    return user.establishment?.red?.name ?? 'No asignada';
  }

  showError(err: unknown): void {
    if (err instanceof HttpErrorResponse && err.status === 403) {
      this.message.set('Solo el superadministrador puede crear cuentas administradoras.');
      this.requestId.set(requestIdFrom(err));
      this.error.set(true);
      return;
    }

    if (err instanceof HttpErrorResponse && err.status === 400) {
      this.message.set('Revisa los datos ingresados. El establecimiento y la contraseña deben cumplir las reglas del sistema.');
      this.requestId.set(requestIdFrom(err));
      this.error.set(true);
      return;
    }

    if (err instanceof HttpErrorResponse && err.status === 409) {
      this.message.set(detailFrom(err) || 'Ya existe una cuenta con ese correo electrónico.');
      this.requestId.set(requestIdFrom(err));
      this.error.set(true);
      return;
    }

    const mapped = mapApiError(err);
    this.message.set(mapped.message);
    this.requestId.set(mapped.requestId);
    this.error.set(true);
  }

  unlockMfa(): void {
    if (!this.masterAdmin()) {
      this.message.set('Solo el superadministrador puede modificar cuentas de usuario.');
      this.error.set(true);
      return;
    }

    this.mfaOpen.set(true);
  }

  private applyUserValidation(): void {
    const value = this.form.getRawValue();
    const selected = this.selected();
    this.clearControlErrors(this.form.controls.password, ['required']);
    this.clearControlErrors(this.form.controls.confirm, ['required', 'passwordMismatch']);
    this.clearControlErrors(this.form.controls.accountType, ['forbiddenAdmin']);
    this.clearControlErrors(this.form.controls.establishmentId, ['required', 'invalid']);

    if (!selected && !value.password) {
      this.addControlError(this.form.controls.password, 'required');
    }

    if (!selected && !value.confirm) {
      this.addControlError(this.form.controls.confirm, 'required');
    }

    if (!selected && value.password && value.confirm && value.password !== value.confirm) {
      this.addControlError(this.form.controls.confirm, 'passwordMismatch');
    }

    if (!selected && value.accountType === 'ADMIN') {
      this.form.controls.establishmentId.setValue('');
      if (!this.canCreateAdmin()) {
        this.addControlError(this.form.controls.accountType, 'forbiddenAdmin');
      } else {
        this.clearControlErrors(this.form.controls.accountType, ['forbiddenAdmin']);
      }
    }

    if (!selected && value.accountType === 'ESTABLISHMENT_OPERATOR' && !value.establishmentId) {
      this.addControlError(this.form.controls.establishmentId, 'required');
    }

    if (!selected && value.accountType === 'ESTABLISHMENT_OPERATOR' && value.establishmentId && !Number.isFinite(Number(value.establishmentId))) {
      this.addControlError(this.form.controls.establishmentId, 'invalid');
    }
  }

  private addControlError(control: AbstractControl, key: string): void {
    control.setErrors({ ...(control.errors ?? {}), [key]: true });
  }

  private clearControlErrors(control: AbstractControl, keys: string[]): void {
    const errors = { ...(control.errors ?? {}) };
    keys.forEach((key) => delete errors[key]);
    control.setErrors(Object.keys(errors).length ? errors : null);
  }

  private ensureMfa(): boolean {
    if (!this.masterAdmin()) {
      this.message.set(this.form.controls.accountType.value === 'ADMIN'
        ? 'Solo el superadministrador puede crear cuentas administradoras.'
        : 'Solo el superadministrador puede modificar cuentas de usuario.');
      this.error.set(true);
      return false;
    }

    if (!this.mfa.hasFreshElevation()) {
      this.unlockMfa();
      return false;
    }

    return true;
  }
}

function detailFrom(error: HttpErrorResponse): string {
  const body = error.error;
  if (body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string') {
    return body.detail;
  }

  return '';
}

function requestIdFrom(error: HttpErrorResponse): string | undefined {
  const body = error.error;
  if (body && typeof body === 'object' && 'requestId' in body && typeof body.requestId === 'string') {
    return body.requestId;
  }

  return error.headers.get('X-Request-ID') ?? undefined;
}

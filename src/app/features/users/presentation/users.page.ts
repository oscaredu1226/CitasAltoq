import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideKeyRound, LucidePencil, LucidePlus, LucideSave, LucideX } from '@lucide/angular';
import { PageResponse } from '../../../core/http/page-response';
import { mapApiError } from '../../../core/http/error-message.mapper';
import { roleLabel, UserRole } from '../../../core/auth/auth.models';
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
  private readonly fb = inject(FormBuilder);
  readonly page = signal<PageResponse<AdminUser> | null>(null);
  readonly selected = signal<AdminUser | null>(null);
  readonly passwordUser = signal<AdminUser | null>(null);
  readonly editing = signal(false);
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
    this.selected.set(null);
    this.form.reset({ email: '', displayName: '', password: '', confirm: '', accountType: 'ADMIN', establishmentId: '', active: true });
    this.form.controls.accountType.enable();
    this.editing.set(true);
  }

  edit(user: AdminUser): void {
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
    this.applyUserValidation();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.message.set('Corrige los campos marcados antes de guardar el usuario.');
      this.error.set(true);
      return;
    }

    const value = this.form.getRawValue();
    const selected = this.selected();

    const request = selected
      ? this.repo.update(selected.id, { email: value.email, displayName: value.displayName, active: value.active })
      : value.accountType === 'ADMIN'
        ? this.repo.createAdmin({ email: value.email, displayName: value.displayName, password: value.password })
        : this.repo.createOperator({
            email: value.email,
            displayName: value.displayName,
            password: value.password,
            establishmentId: value.establishmentId,
          });

    request.subscribe({
      next: () => {
        this.message.set(selected ? 'Usuario actualizado.' : 'Usuario creado.');
        this.error.set(false);
        this.editing.set(false);
        this.load(this.page()?.page ?? 0);
      },
      error: (err) => this.showError(err),
    });
  }

  resetPassword(user: AdminUser): void {
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

  savePassword(user: AdminUser): void {
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
    const mapped = mapApiError(err);
    this.message.set(mapped.message);
    this.requestId.set(mapped.requestId);
    this.error.set(true);
  }

  private applyUserValidation(): void {
    const value = this.form.getRawValue();
    const selected = this.selected();
    this.clearControlErrors(this.form.controls.password, ['required']);
    this.clearControlErrors(this.form.controls.confirm, ['required', 'passwordMismatch']);
    this.clearControlErrors(this.form.controls.establishmentId, ['required']);

    if (!selected && !value.password) {
      this.addControlError(this.form.controls.password, 'required');
    }

    if (!selected && !value.confirm) {
      this.addControlError(this.form.controls.confirm, 'required');
    }

    if (!selected && value.password && value.confirm && value.password !== value.confirm) {
      this.addControlError(this.form.controls.confirm, 'passwordMismatch');
    }

    if (!selected && value.accountType === 'ESTABLISHMENT_OPERATOR' && !value.establishmentId) {
      this.addControlError(this.form.controls.establishmentId, 'required');
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
}

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideKeyRound, LucidePencil, LucidePlus, LucideSave, LucideX } from '@lucide/angular';
import { PageResponse } from '../../../core/http/page-response';
import { mapApiError } from '../../../core/http/error-message.mapper';
import { roleLabel, UserRole } from '../../../core/auth/auth.models';
import { AlertComponent, EmptyStateComponent, PageTitleComponent, PaginationComponent, StatusBadgeComponent } from '../../../shared/ui/ui.components';
import { EstablishmentSelectComponent } from '../../organization/presentation/establishment-select/establishment-select.component';
import { AdminUser, UsersRepository } from '../infrastructure/users.repository';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AlertComponent,
    EmptyStateComponent,
    EstablishmentSelectComponent,
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const selected = this.selected();
    if (!selected && (!value.password || value.password !== value.confirm)) {
      this.message.set('Confirma que ambas contraseñas coincidan y tengan al menos 8 caracteres.');
      this.error.set(true);
      return;
    }

    if (!selected && value.accountType === 'ESTABLISHMENT_OPERATOR' && !value.establishmentId) {
      this.message.set('El operador debe tener un establecimiento asignado.');
      this.error.set(true);
      return;
    }

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

  savePassword(user: AdminUser): void {
    const value = this.passwordForm.getRawValue();
    if (this.passwordForm.invalid || value.password !== value.confirm) {
      this.passwordForm.markAllAsTouched();
      this.message.set('Confirma que ambas contraseñas coincidan y tengan al menos 8 caracteres.');
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
}

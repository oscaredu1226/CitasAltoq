import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageResponse } from '../../../core/http/page-response';
import { mapApiError } from '../../../core/http/error-message.mapper';
import { roleLabel, UserRole } from '../../../core/auth/auth.models';
import { AlertComponent, EmptyStateComponent, PageTitleComponent, PaginationComponent, StatusBadgeComponent } from '../../../shared/ui/ui.components';
import { AdminUser, UsersRepository } from '../infrastructure/users.repository';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertComponent, EmptyStateComponent, PageTitleComponent, PaginationComponent, ReactiveFormsModule, StatusBadgeComponent],
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
    role: ['ADMIN' as UserRole],
    red: [''],
    microred: [''],
    establishment: [''],
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
    this.form.reset({ email: '', displayName: '', password: '', role: 'ADMIN', red: '', microred: '', establishment: '', active: true });
    this.editing.set(true);
  }

  edit(user: AdminUser): void {
    const scope = user.accessScopes[0];
    this.selected.set(user);
    this.form.reset({
      email: user.email,
      displayName: user.displayName,
      password: '',
      role: user.roles[0],
      red: scope?.red ?? '',
      microred: scope?.microred ?? '',
      establishment: scope?.establishment ?? '',
      active: user.active,
    });
    this.editing.set(true);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const accessScopes = value.role === 'ADMIN'
      ? [{ level: 'GLOBAL' as const, red: null, microred: null, establishment: null }]
      : [{ level: 'ESTABLISHMENT' as const, red: value.red, microred: value.microred, establishment: value.establishment }];

    if (value.role === 'ESTABLISHMENT_OPERATOR' && (!value.red || !value.microred || !value.establishment)) {
      this.message.set('El operador debe tener Red, MicroRed y Establecimiento.');
      this.error.set(true);
      return;
    }

    const selected = this.selected();
    const request = selected
      ? this.repo.update(selected.id, { email: value.email, displayName: value.displayName, active: value.active })
      : this.repo.create({ email: value.email, displayName: value.displayName, password: value.password, roles: [value.role], accessScopes });

    request.subscribe({
      next: (user) => {
        const authTarget = selected ? selected.id : user.id;
        this.repo.updateAuthorization(authTarget, { roles: [value.role], accessScopes }).subscribe({
          next: () => {
            this.message.set('Usuario actualizado.');
            this.error.set(false);
            this.editing.set(false);
            this.load(this.page()?.page ?? 0);
          },
          error: (err) => this.showError(err),
        });
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

  scopeText(user: AdminUser): string {
    const scope = user.accessScopes[0];
    return user.roles.includes('ADMIN') ? 'Acceso global' : [scope?.establishment, scope?.microred, scope?.red].filter(Boolean).join(' · ');
  }

  showError(err: unknown): void {
    const mapped = mapApiError(err);
    this.message.set(mapped.message);
    this.requestId.set(mapped.requestId);
    this.error.set(true);
  }
}

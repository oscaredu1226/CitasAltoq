import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideBell, LucideCalendarCheck, LucideCircleCheck, LucideLayoutDashboard, LucideShieldCheck } from '@lucide/angular';
import { AuthFacade } from '../../../core/auth/auth.facade';
import { AlertComponent, LogoComponent } from '../../../shared/ui/ui.components';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertComponent, LogoComponent, LucideBell, LucideCalendarCheck, LucideCircleCheck, LucideLayoutDashboard, LucideShieldCheck, ReactiveFormsModule],
  templateUrl: './login.page.html',
  styleUrl: './login.page.css',
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthFacade);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly forgotMessage = signal('');
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    remember: [false],
  });

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');
    const { email, password, remember } = this.form.getRawValue();
    this.auth.login(email, password, remember).subscribe({
      next: () => void this.router.navigateByUrl('/dashboard'),
      error: () => {
        this.error.set('Correo electrónico o contraseña incorrectos.');
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }
}

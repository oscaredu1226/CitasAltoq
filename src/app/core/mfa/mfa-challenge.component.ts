import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideKeyRound, LucideRefreshCw, LucideShieldCheck, LucideX } from '@lucide/angular';
import * as QRCode from 'qrcode';
import { finalize } from 'rxjs';
import { FieldErrorComponent } from '../../shared/ui/ui.components';
import { MfaSetupResponse, MfaStatus } from './mfa.models';
import { MfaRepository } from './mfa.repository';
import { MfaStore } from './mfa.store';

type MfaStep = 'loading' | 'verify' | 'setup' | 'confirm' | 'recovery' | 'recovery-codes' | 'blocked';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FieldErrorComponent, LucideKeyRound, LucideRefreshCw, LucideShieldCheck, LucideX, ReactiveFormsModule],
  selector: 'app-mfa-challenge',
  templateUrl: './mfa-challenge.component.html',
  styleUrl: './mfa-challenge.component.css',
})
export class MfaChallengeComponent {
  private readonly repo = inject(MfaRepository);
  private readonly store = inject(MfaStore);
  private readonly fb = inject(FormBuilder);
  private opened = false;

  readonly open = input(false);
  readonly reason = input('Esta operación requiere verificación del superadministrador.');
  readonly verified = output<void>();
  readonly closed = output<void>();

  readonly step = signal<MfaStep>('loading');
  readonly loading = signal(false);
  readonly status = signal<MfaStatus | null>(null);
  readonly setupData = signal<MfaSetupResponse | null>(null);
  readonly qrDataUrl = signal('');
  readonly recoveryCodes = signal<string[]>([]);
  readonly error = signal('');
  readonly setupForm = this.fb.nonNullable.group({
    password: ['', [Validators.required]],
  });
  readonly verifyForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });
  readonly recoveryForm = this.fb.nonNullable.group({
    password: ['', [Validators.required]],
    recoveryCode: ['', [Validators.required]],
  });
  readonly expiresAtLabel = computed(() => {
    const expiresAt = this.setupData()?.expiresAt;
    return expiresAt
      ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(expiresAt))
      : '';
  });

  constructor() {
    effect(() => {
      if (this.open() && !this.opened) {
        this.opened = true;
        this.begin();
      }

      if (!this.open()) {
        this.opened = false;
      }
    });
  }

  begin(): void {
    this.clearSensitiveState();
    this.step.set('loading');
    this.loading.set(true);
    this.repo.status().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (status) => this.applyStatus(status),
      error: (error) => this.applyError(error),
    });
  }

  startSetup(): void {
    if (this.setupForm.invalid) {
      this.setupForm.markAllAsTouched();
      return;
    }

    const { password } = this.setupForm.getRawValue();
    this.loading.set(true);
    this.error.set('');
    this.repo.setup(password).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (setup) => this.showSetup(setup),
      error: (error) => this.applyError(error),
    });
  }

  confirmSetup(): void {
    if (this.verifyForm.invalid) {
      this.verifyForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.repo.confirm(this.verifyForm.getRawValue().code).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (response) => {
        this.store.setElevation(response.elevation);
        this.recoveryCodes.set(response.recoveryCodes);
        this.setupData.set(null);
        this.qrDataUrl.set('');
        this.verifyForm.reset({ code: '' });
        this.step.set('recovery-codes');
      },
      error: (error) => this.applyError(error),
    });
  }

  verify(): void {
    if (this.verifyForm.invalid) {
      this.verifyForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.repo.verify(this.verifyForm.getRawValue().code).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (elevation) => {
        this.store.setElevation(elevation);
        this.finishVerified();
      },
      error: (error) => this.applyError(error),
    });
  }

  recover(): void {
    if (this.recoveryForm.invalid) {
      this.recoveryForm.markAllAsTouched();
      return;
    }

    const { password, recoveryCode } = this.recoveryForm.getRawValue();
    this.loading.set(true);
    this.error.set('');
    this.repo.recover(password, recoveryCode).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (setup) => this.showSetup(setup),
      error: (error) => this.applyError(error),
    });
  }

  showRecovery(): void {
    this.clearSensitiveState();
    this.step.set('recovery');
  }

  continuePendingSetup(): void {
    this.error.set('');
    this.setupData.set(null);
    this.qrDataUrl.set('');
    this.verifyForm.reset({ code: '' });
    this.step.set('confirm');
  }

  close(): void {
    this.clearSensitiveState();
    this.closed.emit();
  }

  finishVerified(): void {
    this.clearSensitiveState();
    this.verified.emit();
  }

  private applyStatus(status: MfaStatus): void {
    this.status.set(status);

    if (!status.available) {
      this.error.set('La verificación MFA no está disponible por configuración del servidor.');
      this.step.set('blocked');
      return;
    }

    if (this.store.hasFreshElevation()) {
      this.finishVerified();
      return;
    }

    this.step.set(status.enrolled && !status.setupPending ? 'verify' : 'setup');
  }

  private showSetup(setup: MfaSetupResponse): void {
    this.setupData.set(setup);
    this.setupForm.reset({ password: '' });
    this.recoveryForm.reset({ password: '', recoveryCode: '' });
    QRCode.toDataURL(setup.provisioningUri, { errorCorrectionLevel: 'M', margin: 1, scale: 6 })
      .then((url) => this.qrDataUrl.set(url))
      .catch(() => this.qrDataUrl.set(''));
    this.step.set('confirm');
  }

  private applyError(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      this.store.clear();
      this.error.set('Tu sesión expiró. Vuelve a iniciar sesión.');
      this.step.set('blocked');
      return;
    }

    if (error instanceof HttpErrorResponse && error.status === 403 && problemCode(error) === 'MFA_SETUP_REQUIRED') {
      this.error.set('Vincula el autenticador antes de continuar.');
      this.step.set('setup');
      return;
    }

    if (error instanceof HttpErrorResponse && error.status === 403 && problemCode(error) === 'MFA_REQUIRED') {
      this.error.set('Ingresa un código vigente del autenticador.');
      this.step.set('verify');
      return;
    }

    if (error instanceof HttpErrorResponse && error.status === 403) {
      this.error.set('Solo el superadministrador puede realizar esta operación.');
      this.step.set('blocked');
      return;
    }

    if (error instanceof HttpErrorResponse && error.status === 400 && problemCode(error) === 'MFA_INVALID_CODE') {
      this.error.set('Credenciales o código incorrecto. Revisa e intenta con un código vigente.');
      return;
    }

    if (error instanceof HttpErrorResponse && error.status === 409 && problemCode(error) === 'MFA_SETUP_EXPIRED') {
      this.error.set('La vinculación venció. Reinicia el proceso en esta sesión.');
      this.step.set('setup');
      return;
    }

    if (error instanceof HttpErrorResponse && error.status === 429) {
      this.error.set('Demasiados intentos. Espera antes de volver a probar.');
      this.step.set('blocked');
      return;
    }

    if (error instanceof HttpErrorResponse && error.status === 503) {
      this.error.set('MFA no está disponible por configuración del servidor.');
      this.step.set('blocked');
      return;
    }

    this.error.set('No pudimos completar la verificación. Intenta nuevamente.');
  }

  private clearSensitiveState(): void {
    this.error.set('');
    this.setupData.set(null);
    this.qrDataUrl.set('');
    this.recoveryCodes.set([]);
    this.setupForm.reset({ password: '' });
    this.verifyForm.reset({ code: '' });
    this.recoveryForm.reset({ password: '', recoveryCode: '' });
  }
}

function problemCode(error: HttpErrorResponse): string {
  const body = error.error;
  return body && typeof body === 'object' && 'code' in body && typeof body.code === 'string'
    ? body.code
    : '';
}

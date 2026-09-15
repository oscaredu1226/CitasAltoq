import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideBan,
  LucideRefreshCw,
  LucideShieldAlert,
  LucideShieldCheck,
  LucideUnlock,
  LucideX,
} from '@lucide/angular';
import { finalize, forkJoin } from 'rxjs';
import { AuthFacade } from '../../../core/auth/auth.facade';
import { isMasterAdmin } from '../../../core/auth/auth.models';
import { mapApiError } from '../../../core/http/error-message.mapper';
import { emptyPage } from '../../../core/http/page-response';
import { MfaChallengeComponent } from '../../../core/mfa/mfa-challenge.component';
import { MfaStore } from '../../../core/mfa/mfa.store';
import { formatOffsetDateTime } from '../../../shared/utils/date-only';
import {
  AlertComponent,
  EmptyStateComponent,
  FieldErrorComponent,
  PageTitleComponent,
  PaginationComponent,
} from '../../../shared/ui/ui.components';
import {
  SecurityEvent,
  SecurityEventOutcome,
  SecurityEventType,
  SecurityIpBlock,
  SecurityOverview,
} from '../infrastructure/security.models';
import { SecurityRepository } from '../infrastructure/security.repository';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AlertComponent,
    EmptyStateComponent,
    FieldErrorComponent,
    LucideBan,
    LucideRefreshCw,
    LucideShieldAlert,
    LucideShieldCheck,
    LucideUnlock,
    LucideX,
    MfaChallengeComponent,
    PageTitleComponent,
    PaginationComponent,
    ReactiveFormsModule,
  ],
  templateUrl: './security.page.html',
  styleUrl: './security.page.css',
})
export class SecurityPage {
  private readonly repository = inject(SecurityRepository);
  private readonly auth = inject(AuthFacade);
  private readonly mfa = inject(MfaStore);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly mfaOpen = signal(false);
  readonly overview = signal<SecurityOverview | null>(null);
  readonly eventPage = signal(emptyPage<SecurityEvent>(0, 25));
  readonly blockPage = signal(emptyPage<SecurityIpBlock>(0, 25));
  readonly blockTarget = signal<SecurityEvent | null>(null);
  readonly unblockTarget = signal<SecurityIpBlock | null>(null);
  readonly error = signal('');
  readonly message = signal('');
  readonly requestId = signal<string | undefined>(undefined);
  readonly hours = signal(24);
  readonly type = signal<SecurityEventType | ''>('');
  readonly outcome = signal<SecurityEventOutcome | ''>('');
  readonly activeOnly = signal(true);

  readonly blockForm = this.fb.nonNullable.group({
    durationMinutes: [60, [Validators.required, Validators.min(5), Validators.max(10_080)]],
    reason: ['', [Validators.required, Validators.maxLength(240)]],
  });

  readonly eventTypes: { value: SecurityEventType; label: string }[] = [
    { value: 'LOGIN_FALLIDO', label: 'Inicio de sesión fallido' },
    { value: 'LOGIN_BLOQUEADO', label: 'Inicio de sesión limitado' },
    { value: 'ACCESO_DENEGADO', label: 'Acceso denegado' },
    { value: 'MFA_RECHAZADO', label: 'MFA rechazado' },
    { value: 'MFA_BLOQUEADO', label: 'MFA limitado' },
    { value: 'ERROR_SERVIDOR', label: 'Error interno' },
    { value: 'LOGIN_EXITOSO', label: 'Inicio de sesión exitoso' },
    { value: 'MFA_VERIFICADO', label: 'MFA verificado' },
    { value: 'MFA_ACTIVADO', label: 'MFA activado' },
    { value: 'MFA_RECUPERACION_USADA', label: 'Recuperación MFA' },
    { value: 'IP_BLOQUEADA', label: 'Origen bloqueado' },
    { value: 'IP_DESBLOQUEADA', label: 'Origen desbloqueado' },
  ];

  constructor() {
    if (!isMasterAdmin(this.auth.session.user())) {
      this.error.set('Solo el administrador maestro puede acceder a este apartado.');
      return;
    }
    if (this.mfa.hasFreshElevation()) {
      this.refresh();
    } else {
      this.mfaOpen.set(true);
    }
  }

  handleMfaVerified(): void {
    this.mfaOpen.set(false);
    this.refresh();
  }

  refresh(): void {
    if (!this.ensureMfa()) {
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.requestId.set(undefined);
    forkJoin({
      overview: this.repository.overview(this.hours()),
      events: this.repository.events(this.filters(0)),
      blocks: this.repository.blocks(this.activeOnly(), 0, 25),
    }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: ({ overview, events, blocks }) => {
        this.overview.set(overview);
        this.eventPage.set(events);
        this.blockPage.set(blocks);
      },
      error: (error) => this.handleError(error),
    });
  }

  applyEventFilters(): void {
    this.loadEvents(0);
  }

  loadEvents(page: number): void {
    if (!this.ensureMfa()) {
      return;
    }
    this.loading.set(true);
    this.repository.events(this.filters(page)).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (response) => this.eventPage.set(response),
      error: (error) => this.handleError(error),
    });
  }

  loadBlocks(page: number): void {
    if (!this.ensureMfa()) {
      return;
    }
    this.loading.set(true);
    this.repository.blocks(this.activeOnly(), page, 25).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (response) => this.blockPage.set(response),
      error: (error) => this.handleError(error),
    });
  }

  changeHours(value: string): void {
    this.hours.set(Number(value));
    this.refresh();
  }

  changeType(value: string): void {
    this.type.set(value as SecurityEventType | '');
  }

  changeOutcome(value: string): void {
    this.outcome.set(value as SecurityEventOutcome | '');
  }

  changeActiveOnly(checked: boolean): void {
    this.activeOnly.set(checked);
    this.loadBlocks(0);
  }

  openBlock(event: SecurityEvent): void {
    if (!event.blockable || event.clientIpMasked === 'No disponible') {
      return;
    }
    this.blockForm.reset({ durationMinutes: 60, reason: '' });
    this.blockTarget.set(event);
  }

  confirmBlock(): void {
    const target = this.blockTarget();
    if (!target || this.blockForm.invalid || !this.ensureMfa()) {
      this.blockForm.markAllAsTouched();
      return;
    }
    const value = this.blockForm.getRawValue();
    this.saving.set(true);
    this.repository.block({
      sourceEventId: target.id,
      durationMinutes: value.durationMinutes,
      reason: value.reason.trim(),
    }).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.blockTarget.set(null);
        this.message.set('Origen bloqueado temporalmente.');
        this.refresh();
      },
      error: (error) => this.handleError(error),
    });
  }

  confirmUnblock(): void {
    const target = this.unblockTarget();
    if (!target || !this.ensureMfa()) {
      return;
    }
    this.saving.set(true);
    this.repository.unblock(target.id).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.unblockTarget.set(null);
        this.message.set('El bloqueo fue revocado.');
        this.refresh();
      },
      error: (error) => this.handleError(error),
    });
  }

  outcomeClass(outcome: SecurityEventOutcome): string {
    if (outcome === 'EXITO') {
      return 'event-status event-status--success';
    }
    if (outcome === 'BLOQUEADO') {
      return 'event-status event-status--blocked';
    }
    return 'event-status event-status--failed';
  }

  formatDateTime = formatOffsetDateTime;

  private filters(page: number) {
    return {
      hours: this.hours(),
      page,
      size: 25,
      type: this.type() || undefined,
      outcome: this.outcome() || undefined,
    };
  }

  private ensureMfa(): boolean {
    if (!isMasterAdmin(this.auth.session.user())) {
      this.error.set('Solo el administrador maestro puede acceder a este apartado.');
      return false;
    }
    if (!this.mfa.hasFreshElevation()) {
      this.mfaOpen.set(true);
      return false;
    }
    return true;
  }

  private handleError(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 403
      && ['MFA_REQUIRED', 'MFA_SETUP_REQUIRED'].includes(problemCode(error))) {
      this.mfa.clearElevation();
      this.mfaOpen.set(true);
      return;
    }
    const mapped = mapApiError(error);
    this.error.set(mapped.message);
    this.requestId.set(mapped.requestId);
  }
}

function problemCode(error: HttpErrorResponse): string {
  const body = error.error;
  return body && typeof body === 'object' && typeof body.code === 'string' ? body.code : '';
}

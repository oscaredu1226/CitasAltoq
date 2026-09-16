import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { LucideCircleCheck, LucideCircleX, LucideMail, LucideSave, LucideSend, LucideShieldCheck, LucideTrash2 } from '@lucide/angular';
import { finalize, forkJoin } from 'rxjs';
import { AuthFacade } from '../../../core/auth/auth.facade';
import { isAdmin, isMasterAdmin } from '../../../core/auth/auth.models';
import { mapApiError } from '../../../core/http/error-message.mapper';
import { MfaChallengeComponent } from '../../../core/mfa/mfa-challenge.component';
import { MfaStore } from '../../../core/mfa/mfa.store';
import { AlertComponent, PageTitleComponent, StatusBadgeComponent } from '../../../shared/ui/ui.components';
import { OrganizationStore } from '../../organization/application/organization.store';
import {
  OperationsRepository,
  OperationsStatus,
  DailyReportCandidate,
  DailyReportSubscription,
  ReminderAudience,
} from '../infrastructure/operations.repository';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertComponent, MfaChallengeComponent, PageTitleComponent, StatusBadgeComponent, LucideCircleCheck, LucideCircleX, LucideMail, LucideSave, LucideSend, LucideShieldCheck, LucideTrash2],
  templateUrl: './operations.page.html',
  styleUrl: './operations.page.css',
})
export class OperationsPage {
  private readonly repo = inject(OperationsRepository);
  private readonly auth = inject(AuthFacade);
  private readonly mfa = inject(MfaStore);
  readonly organizations = inject(OrganizationStore);
  readonly status = signal<OperationsStatus | null>(null);
  readonly audience = signal<ReminderAudience | null>(null);
  readonly audienceMode = signal<'SELECTED' | 'ALL'>('SELECTED');
  readonly selectedIds = signal<Set<string>>(new Set());
  readonly establishmentNameFilter = signal('');
  readonly redFilter = signal('');
  readonly microredFilter = signal('');
  readonly saveConfirmationOpen = signal(false);
  readonly mfaOpen = signal(false);
  readonly audiencePermissionChecked = signal(false);
  readonly audienceAllowed = signal(false);
  readonly audienceForbidden = signal(false);
  readonly persistedIds = signal<Set<string>>(new Set());
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly reportSubscriptions = signal<DailyReportSubscription[]>([]);
  readonly reportUsers = signal<DailyReportCandidate[]>([]);
  readonly selectedReportEstablishmentId = signal('');
  readonly selectedReportUserId = signal('');
  readonly newReportEmail = signal('');
  readonly reportLoading = signal(false);
  readonly reportSaving = signal(false);
  readonly deleteConfirmationId = signal('');
  readonly adminUser = computed(() => isAdmin(this.auth.session.user()));
  readonly masterAdmin = computed(() => isMasterAdmin(this.auth.session.user()));
  readonly canManageAudience = computed(() => this.masterAdmin() && this.mfa.elevated());
  readonly activeEstablishments = computed(() => this.organizations.establishments().filter((establishment) => establishment.active !== false));
  readonly redOptions = computed(() => uniqueOptions(this.activeEstablishments().map((establishment) => establishment.red)));
  readonly microredOptions = computed(() => {
    const selectedRedId = this.redFilter();
    return uniqueOptions(this.activeEstablishments()
      .filter((establishment) => !selectedRedId || establishment.red.id === selectedRedId)
      .map((establishment) => establishment.microred));
  });
  readonly filteredEstablishments = computed(() => {
    const term = normalizeSearch(this.establishmentNameFilter());
    const redId = this.redFilter();
    const microredId = this.microredFilter();

    return this.activeEstablishments().filter((establishment) => {
      const matchesName = !term || normalizeSearch(establishment.name).includes(term);
      const matchesRed = !redId || establishment.red.id === redId;
      const matchesMicrored = !microredId || establishment.microred.id === microredId;

      return matchesName && matchesRed && matchesMicrored;
    });
  });
  readonly filtersApplied = computed(() => Boolean(
    this.establishmentNameFilter().trim()
      || this.redFilter()
      || this.microredFilter(),
  ));
  readonly selectedEstablishments = computed(() => {
    const selected = this.selectedIds();
    return this.activeEstablishments()
      .filter((establishment) => selected.has(establishment.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'es-PE'));
  });
  readonly selectedWithoutDetails = computed(() => Math.max(0, this.selectedIds().size - this.selectedEstablishments().length));
  readonly persistedMode = signal<'SELECTED' | 'ALL'>('SELECTED');
  readonly hasAudienceChanges = computed(() => this.audienceMode() !== this.persistedMode() || !sameSet(this.selectedIds(), this.persistedIds()));
  readonly canSelectFiltered = computed(() => this.filteredEstablishments().some((establishment) => !this.selectedIds().has(establishment.id)));
  readonly canDeselectAll = computed(() => this.selectedIds().size > 0);
  readonly canEnableAll = computed(() => this.audienceMode() !== 'ALL' || this.selectedIds().size !== this.activeEstablishments().length);
  readonly canSave = computed(() => !this.saving()
    && this.hasAudienceChanges());
  readonly availableReportUsers = computed(() => {
    const configured = new Set(this.reportSubscriptions().map((subscription) => subscription.userId));
    return this.reportUsers().filter((user) => !configured.has(user.userId));
  });
  readonly availableReportEstablishments = computed(() => {
    const establishments = new Map<number, { id: number; name: string; microredName: string; redName: string; userCount: number }>();
    for (const user of this.availableReportUsers()) {
      const existing = establishments.get(user.establishmentId);
      if (existing) {
        existing.userCount += 1;
      } else {
        establishments.set(user.establishmentId, {
          id: user.establishmentId,
          name: user.establishmentName,
          microredName: user.microredName,
          redName: user.redName,
          userCount: 1,
        });
      }
    }
    return Array.from(establishments.values())
      .sort((left, right) => left.name.localeCompare(right.name, 'es-PE'));
  });
  readonly availableReportUsersForEstablishment = computed(() => {
    const establishmentId = Number(this.selectedReportEstablishmentId());
    if (!Number.isFinite(establishmentId) || establishmentId <= 0) {
      return [];
    }
    return this.availableReportUsers()
      .filter((user) => user.establishmentId === establishmentId)
      .sort((left, right) => (left.userDisplayName || left.userEmail)
        .localeCompare(right.userDisplayName || right.userEmail, 'es-PE'));
  });
  readonly canAddReport = computed(() => Boolean(
    this.selectedReportEstablishmentId()
      && this.selectedReportUserId()
      && validEmail(this.newReportEmail())
      && !this.reportSaving(),
  ));
  readonly saveBlockedMessage = computed(() => {
    if (this.canSave()) {
      return '';
    }

    if (this.saving()) {
      return 'Estamos guardando la configuración. Espera un momento.';
    }

    if (!this.hasAudienceChanges()) {
      return 'No hay cambios pendientes por guardar.';
    }

    return '';
  });

  constructor() {
    this.repo.status().subscribe((status) => this.status.set(status));
    effect(() => {
      if (this.masterAdmin() && this.mfa.elevated() && !this.audiencePermissionChecked() && !this.loading()) {
        this.audiencePermissionChecked.set(true);
        this.loadAudience();
      }
    });
    effect(() => {
      if (this.audienceMode() === 'ALL' && this.activeEstablishments().length > 0 && !this.hasAudienceChanges()) {
        this.applyAllAsSelected();
      }
    });
  }

  updateNameFilter(value: string): void {
    this.establishmentNameFilter.set(value);
  }

  updateRedFilter(value: string): void {
    this.redFilter.set(value);
    if (value && !this.microredOptions().some((option) => option.id === this.microredFilter())) {
      this.microredFilter.set('');
    }
  }

  updateMicroredFilter(value: string): void {
    this.microredFilter.set(value);
  }

  clearFilters(): void {
    this.establishmentNameFilter.set('');
    this.redFilter.set('');
    this.microredFilter.set('');
  }

  toggleEstablishment(id: string, checked: boolean): void {
    const next = new Set(this.selectedIds());
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    this.audienceMode.set('SELECTED');
    this.updateSelectedIds(next);
  }

  selectFilteredEstablishments(): void {
    const next = new Set(this.selectedIds());
    for (const establishment of this.filteredEstablishments()) {
      next.add(establishment.id);
    }
    this.audienceMode.set('SELECTED');
    this.updateSelectedIds(next);
  }

  deselectAllEstablishments(): void {
    this.audienceMode.set('SELECTED');
    this.updateSelectedIds(new Set());
  }

  enableAllEstablishments(): void {
    this.audienceMode.set('ALL');
    this.updateSelectedIds(new Set(this.activeEstablishments().map((item) => item.id)));
  }

  save(): void {
    if (!this.ensureMfa()) {
      return;
    }

    if (!this.canSave()) {
      this.error.set(this.saveBlockedMessage() || 'Revisa la configuración antes de guardar.');
      return;
    }

    this.error.set('');
    this.message.set('');
    this.saveConfirmationOpen.set(true);
  }

  confirmSave(): void {
    if (!this.ensureMfa()) {
      this.saveConfirmationOpen.set(false);
      return;
    }

    if (!this.canSave()) {
      this.saveConfirmationOpen.set(false);
      this.error.set(this.saveBlockedMessage() || 'Revisa la configuración antes de guardar.');
      return;
    }

    const request = this.audienceMode() === 'ALL'
      ? { mode: 'ALL' as const, establishmentIds: [] }
      : { mode: 'SELECTED' as const, establishmentIds: Array.from(this.selectedIds(), (id) => Number(id)) };
    this.saveConfirmationOpen.set(false);
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    this.repo.updateReminderAudience(request).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (audience) => {
        this.applyAudience(audience);
        this.message.set('Configuración guardada. Las citas futuras elegibles se sincronizarán en segundo plano.');
      },
      error: (error) => this.error.set(this.audienceErrorMessage(error)),
    });
  }

  selectReportEstablishment(establishmentId: string): void {
    this.selectedReportEstablishmentId.set(establishmentId);
    this.selectedReportUserId.set('');
    this.newReportEmail.set('');
  }

  selectReportUser(userId: string): void {
    this.selectedReportUserId.set(userId);
    const user = this.availableReportUsersForEstablishment().find((item) => item.userId === userId);
    this.newReportEmail.set(user?.userEmail ?? '');
  }

  updateNewReportEmail(email: string): void {
    this.newReportEmail.set(email);
  }

  addReportSubscription(): void {
    if (!this.ensureMfa() || !this.canAddReport()) {
      this.error.set('Selecciona un usuario con establecimiento e ingresa un correo válido.');
      return;
    }
    this.reportSaving.set(true);
    this.error.set('');
    this.repo.createDailyReportSubscription({
      userId: this.selectedReportUserId(),
      recipientEmail: this.newReportEmail().trim(),
    }).pipe(finalize(() => this.reportSaving.set(false))).subscribe({
      next: (subscription) => {
        this.reportSubscriptions.update((items) => [...items, subscription]
          .sort((left, right) => left.establishmentName.localeCompare(right.establishmentName, 'es-PE')));
        this.selectedReportEstablishmentId.set('');
        this.selectedReportUserId.set('');
        this.newReportEmail.set('');
        this.message.set('Destinatario de reporte agregado.');
      },
      error: (error) => this.error.set(mapApiError(error).message),
    });
  }

  updateReportEmail(id: string, recipientEmail: string): void {
    this.reportSubscriptions.update((items) => items.map((item) => item.id === id
      ? { ...item, recipientEmail }
      : item));
  }

  updateReportActive(id: string, active: boolean): void {
    this.reportSubscriptions.update((items) => items.map((item) => item.id === id
      ? { ...item, active }
      : item));
  }

  saveReportSubscription(subscription: DailyReportSubscription): void {
    if (!this.ensureMfa() || !validEmail(subscription.recipientEmail) || this.reportSaving()) {
      this.error.set('Ingresa un correo válido antes de guardar.');
      return;
    }
    this.reportSaving.set(true);
    this.error.set('');
    this.repo.updateDailyReportSubscription(subscription)
      .pipe(finalize(() => this.reportSaving.set(false)))
      .subscribe({
        next: (updated) => {
          this.reportSubscriptions.update((items) => items.map((item) => item.id === updated.id ? updated : item));
          this.message.set('Configuración del reporte actualizada.');
        },
        error: (error) => this.error.set(mapApiError(error).message),
      });
  }

  sendReportNow(subscription: DailyReportSubscription): void {
    if (!this.ensureMfa() || this.reportSaving()) {
      return;
    }
    this.reportSaving.set(true);
    this.error.set('');
    this.repo.sendDailyReportNow(subscription.id)
      .pipe(finalize(() => this.reportSaving.set(false)))
      .subscribe({
        next: () => this.message.set('Reporte de hoy generado y enviado. No se volverá a enviar esta noche.'),
        error: (error) => this.error.set(mapApiError(error).message),
      });
  }

  requestDeleteReport(id: string): void {
    if (this.deleteConfirmationId() !== id) {
      this.deleteConfirmationId.set(id);
      return;
    }
    if (!this.ensureMfa() || this.reportSaving()) {
      return;
    }
    this.reportSaving.set(true);
    this.repo.deleteDailyReportSubscription(id)
      .pipe(finalize(() => this.reportSaving.set(false)))
      .subscribe({
        next: () => {
          this.reportSubscriptions.update((items) => items.filter((item) => item.id !== id));
          this.deleteConfirmationId.set('');
          this.message.set('Destinatario de reporte eliminado.');
        },
        error: (error) => this.error.set(mapApiError(error).message),
      });
  }

  private loadReportConfiguration(): void {
    this.reportLoading.set(true);
    forkJoin({
      subscriptions: this.repo.dailyReportSubscriptions(),
      users: this.repo.dailyReportCandidates(),
    }).pipe(finalize(() => this.reportLoading.set(false))).subscribe({
      next: ({ subscriptions, users }) => {
        this.reportSubscriptions.set(subscriptions);
        this.reportUsers.set(users);
      },
      error: (error) => this.error.set(mapApiError(error).message),
    });
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  updatedAt(): string {
    const value = this.audience()?.updatedAt;
    return value
      ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
      : 'Sin cambios registrados';
  }

  unlockMfa(): void {
    if (!this.masterAdmin()) {
      this.error.set(ACCESS_RESTRICTED_MESSAGE);
      return;
    }

    this.mfaOpen.set(true);
  }

  handleMfaVerified(): void {
    this.mfaOpen.set(false);
    this.audiencePermissionChecked.set(false);
  }

  private loadAudience(): void {
    this.loading.set(true);
    this.repo.reminderAudience().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (audience) => {
        this.audienceAllowed.set(true);
        this.audienceForbidden.set(false);
        this.organizations.load();
        this.applyAudience(audience);
        this.loadReportConfiguration();
      },
      error: (error) => {
        const message = this.audienceErrorMessage(error);
        if (error instanceof HttpErrorResponse && error.status === 403) {
          this.audienceForbidden.set(true);
          this.audienceAllowed.set(false);
          if (this.masterAdmin()) {
            this.error.set(message);
          }
          return;
        }

        this.error.set(message);
      },
    });
  }

  private applyAudience(audience: ReminderAudience): void {
    this.audience.set(audience);
    this.audienceMode.set(audience.mode);
    const selectedIds = audience.mode === 'ALL'
      ? new Set(this.activeEstablishments().map((item) => item.id))
      : new Set(audience.selectedEstablishments.filter((item) => item.active).map((item) => String(item.id)));
    this.selectedIds.set(selectedIds);
    this.persistedIds.set(new Set(selectedIds));
    this.persistedMode.set(audience.mode);
  }

  private applyAllAsSelected(): void {
    const selectedIds = new Set(this.activeEstablishments().map((item) => item.id));
    this.selectedIds.set(selectedIds);
    this.persistedIds.set(new Set(selectedIds));
  }

  private updateSelectedIds(selectedIds: Set<string>): void {
    this.selectedIds.set(selectedIds);
    this.saveConfirmationOpen.set(false);
    this.error.set('');
    this.message.set('Cambio pendiente. Revisa y guarda el alcance para aplicarlo.');
  }

  private audienceErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 400) {
      return 'La configuración enviada no es válida. Revisa que los establecimientos existan y estén activos. En modo todos no se envían IDs.';
    }

    if (error instanceof HttpErrorResponse && error.status === 403) {
      return ACCESS_RESTRICTED_MESSAGE;
    }

    return mapApiError(error).message;
  }

  private ensureMfa(): boolean {
    if (!this.masterAdmin()) {
      this.error.set(ACCESS_RESTRICTED_MESSAGE);
      return false;
    }

    if (!this.mfa.hasFreshElevation()) {
      this.unlockMfa();
      return false;
    }

    return true;
  }
}

const ACCESS_RESTRICTED_MESSAGE = 'Tu cuenta no tiene permisos para realizar esta acción.';

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-PE')
    .trim();
}

function uniqueOptions(options: { id: string; name: string }[]): { id: string; name: string }[] {
  return Array.from(
    new Map(options.filter((option) => option.id && option.name).map((option) => [option.id, option])).values(),
  ).sort((a, b) => a.name.localeCompare(b.name, 'es-PE'));
}

function sameSet(left: Set<string>, right: Set<string>): boolean {
  return left.size === right.size && Array.from(left).every((value) => right.has(value));
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { LucideCircleCheck, LucideCircleX, LucideSave, LucideShieldCheck } from '@lucide/angular';
import { finalize } from 'rxjs';
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
  ReminderAudience,
} from '../infrastructure/operations.repository';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertComponent, MfaChallengeComponent, PageTitleComponent, StatusBadgeComponent, LucideCircleCheck, LucideCircleX, LucideSave, LucideShieldCheck],
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
  readonly hasAudienceChanges = computed(() => !sameSet(this.selectedIds(), this.persistedIds()));
  readonly canSelectFiltered = computed(() => this.filteredEstablishments().some((establishment) => !this.selectedIds().has(establishment.id)));
  readonly canDeselectAll = computed(() => this.selectedIds().size > 0);
  readonly canSave = computed(() => !this.saving()
    && this.hasAudienceChanges());
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
      if (this.audience()?.mode === 'ALL' && this.activeEstablishments().length > 0 && !this.hasAudienceChanges()) {
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
    this.selectedIds.set(next);
    this.saveConfirmationOpen.set(false);
    this.error.set('');
    this.message.set('Cambio pendiente. Revisa y guarda el alcance para aplicarlo.');
  }

  selectFilteredEstablishments(): void {
    const next = new Set(this.selectedIds());
    for (const establishment of this.filteredEstablishments()) {
      next.add(establishment.id);
    }
    this.updateSelectedIds(next);
  }

  deselectAllEstablishments(): void {
    this.updateSelectedIds(new Set());
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

    const request = {
      mode: 'SELECTED' as const,
      establishmentIds: Array.from(this.selectedIds(), (id) => Number(id)),
    };
    this.saveConfirmationOpen.set(false);
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    this.repo.updateReminderAudience(request).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (audience) => {
        this.applyAudience(audience);
        this.message.set('Alcance de recordatorios actualizado correctamente.');
      },
      error: (error) => this.error.set(this.audienceErrorMessage(error)),
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
    const selectedIds = audience.mode === 'ALL'
      ? new Set(this.activeEstablishments().map((item) => item.id))
      : new Set(audience.selectedEstablishments.filter((item) => item.active).map((item) => String(item.id)));
    this.selectedIds.set(selectedIds);
    this.persistedIds.set(new Set(selectedIds));
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
      return 'La configuración enviada no es válida. En modo seleccionado debes elegir al menos un establecimiento activo, y en modo todos no se envían IDs.';
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

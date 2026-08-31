import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { LucideSave, LucideShieldCheck } from '@lucide/angular';
import { finalize } from 'rxjs';
import { AuthFacade } from '../../../core/auth/auth.facade';
import { isAdmin, isMasterAdmin } from '../../../core/auth/auth.models';
import { mapApiError } from '../../../core/http/error-message.mapper';
import { AlertComponent, PageTitleComponent, StatusBadgeComponent } from '../../../shared/ui/ui.components';
import { OrganizationStore } from '../../organization/application/organization.store';
import {
  OperationsRepository,
  OperationsStatus,
  ReminderAudience,
  ReminderAudienceMode,
} from '../infrastructure/operations.repository';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertComponent, PageTitleComponent, StatusBadgeComponent, LucideSave, LucideShieldCheck],
  templateUrl: './operations.page.html',
  styleUrl: './operations.page.css',
})
export class OperationsPage {
  private readonly repo = inject(OperationsRepository);
  private readonly auth = inject(AuthFacade);
  readonly organizations = inject(OrganizationStore);
  readonly status = signal<OperationsStatus | null>(null);
  readonly audience = signal<ReminderAudience | null>(null);
  readonly mode = signal<ReminderAudienceMode>('SELECTED');
  readonly selectedIds = signal<Set<string>>(new Set());
  readonly establishmentNameFilter = signal('');
  readonly redFilter = signal('');
  readonly microredFilter = signal('');
  readonly confirmAllOpen = signal(false);
  readonly saveConfirmationOpen = signal(false);
  readonly audiencePermissionChecked = signal(false);
  readonly audienceAllowed = signal(false);
  readonly audienceForbidden = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly adminUser = computed(() => isAdmin(this.auth.session.user()));
  readonly masterAdmin = computed(() => isMasterAdmin(this.auth.session.user()));
  readonly canManageAudience = computed(() => this.masterAdmin() || this.audienceAllowed());
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
  readonly canSave = computed(() => !this.saving()
    && (this.mode() === 'ALL' || this.selectedIds().size > 0));
  readonly saveBlockedMessage = computed(() => {
    if (this.canSave()) {
      return '';
    }

    if (this.saving()) {
      return 'Estamos guardando la configuración. Espera un momento.';
    }

    if (this.mode() === 'SELECTED' && this.selectedIds().size === 0) {
      return 'Selecciona al menos un establecimiento activo para guardar este alcance.';
    }

    return '';
  });

  constructor() {
    this.repo.status().subscribe((status) => this.status.set(status));
    effect(() => {
      if (this.adminUser() && !this.audiencePermissionChecked() && !this.loading()) {
        this.audiencePermissionChecked.set(true);
        this.loadAudience();
      }
    });
  }

  selectMode(mode: ReminderAudienceMode): void {
    if (mode === 'ALL' && this.mode() !== 'ALL') {
      this.confirmAllOpen.set(true);
      return;
    }

    this.mode.set(mode);
    this.saveConfirmationOpen.set(false);
    this.error.set('');
    this.message.set('');
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

  confirmAll(): void {
    this.mode.set('ALL');
    this.confirmAllOpen.set(false);
    this.saveConfirmationOpen.set(false);
    this.error.set('');
    this.message.set('');
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
    this.message.set('');
  }

  save(): void {
    if (!this.canSave()) {
      this.error.set(this.saveBlockedMessage() || 'Revisa la configuración antes de guardar.');
      return;
    }

    this.error.set('');
    this.message.set('');
    this.saveConfirmationOpen.set(true);
  }

  confirmSave(): void {
    if (!this.canSave()) {
      this.saveConfirmationOpen.set(false);
      this.error.set(this.saveBlockedMessage() || 'Revisa la configuración antes de guardar.');
      return;
    }

    const request = {
      mode: this.mode(),
      establishmentIds: this.mode() === 'ALL'
        ? []
        : Array.from(this.selectedIds(), (id) => Number(id)),
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
    this.mode.set(audience.mode);
    this.selectedIds.set(new Set(audience.selectedEstablishments.filter((item) => item.active).map((item) => String(item.id))));
  }

  private audienceErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 400) {
      return 'La configuración enviada no es válida. En modo seleccionado debes elegir al menos un establecimiento activo, y en modo todos no se envían IDs.';
    }

    if (error instanceof HttpErrorResponse && error.status === 403) {
      return 'Solo el administrador maestro puede modificar el alcance de recordatorios CRED.';
    }

    return mapApiError(error).message;
  }
}

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

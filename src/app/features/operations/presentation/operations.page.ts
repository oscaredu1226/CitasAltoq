import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { LucideSave, LucideShieldCheck } from '@lucide/angular';
import { finalize } from 'rxjs';
import { AuthFacade } from '../../../core/auth/auth.facade';
import { isMasterAdmin } from '../../../core/auth/auth.models';
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
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly masterAdmin = computed(() => isMasterAdmin(this.auth.session.user()));
  readonly canSave = computed(() => !this.saving()
    && (this.mode() === 'ALL' || this.selectedIds().size > 0));

  constructor() {
    this.repo.status().subscribe((status) => this.status.set(status));
    if (this.masterAdmin()) {
      this.organizations.load();
      this.loadAudience();
    }
  }

  selectMode(mode: ReminderAudienceMode): void {
    this.mode.set(mode);
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
    this.error.set('');
    this.message.set('');
  }

  save(): void {
    if (!this.canSave()) {
      this.error.set('Selecciona al menos un establecimiento antes de guardar.');
      return;
    }

    const request = {
      mode: this.mode(),
      establishmentIds: this.mode() === 'ALL'
        ? []
        : Array.from(this.selectedIds(), (id) => Number(id)),
    };
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    this.repo.updateReminderAudience(request).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (audience) => {
        this.applyAudience(audience);
        this.message.set('Alcance de recordatorios actualizado correctamente.');
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

  private loadAudience(): void {
    this.loading.set(true);
    this.repo.reminderAudience().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (audience) => this.applyAudience(audience),
      error: (error) => this.error.set(mapApiError(error).message),
    });
  }

  private applyAudience(audience: ReminderAudience): void {
    this.audience.set(audience);
    this.mode.set(audience.mode);
    this.selectedIds.set(new Set(audience.selectedEstablishments.map((item) => String(item.id))));
  }
}

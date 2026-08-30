import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideBell,
  LucideCalendarCheck,
  LucideCalendarClock,
  LucideCalendarDays,
  LucideCircleCheck,
  LucideCircleX,
  LucideFileUp,
  LucideTimer,
  LucideUsersRound,
} from '@lucide/angular';
import { AuthFacade } from '../../../core/auth/auth.facade';
import { isAdmin, organizationLabel } from '../../../core/auth/auth.models';
import { DashboardData, DashboardFacade, DashboardFilters } from '../application/dashboard.facade';
import { formatDateOnly } from '../../../shared/utils/date-only';
import { statusView } from '../../../shared/utils/status-mappers';
import { EmptyStateComponent, PageTitleComponent, StatCardComponent, StatusBadgeComponent } from '../../../shared/ui/ui.components';
import { OrganizationStore } from '../../organization/application/organization.store';
import { Establishment } from '../../organization/domain/organization.models';
import { EstablishmentSelectComponent } from '../../organization/presentation/establishment-select/establishment-select.component';
import { OrganizationDropdownComponent, OrganizationDropdownOption } from '../../organization/presentation/organization-dropdown/organization-dropdown.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent, EstablishmentSelectComponent, OrganizationDropdownComponent, PageTitleComponent, RouterLink, StatCardComponent, StatusBadgeComponent],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.css',
})
export class DashboardPage {
  private readonly facade = inject(DashboardFacade);
  private readonly auth = inject(AuthFacade);
  private readonly organization = inject(OrganizationStore);
  readonly loading = signal(true);
  readonly data = signal<DashboardData | null>(null);
  readonly selectedRedId = signal('');
  readonly selectedMicroredId = signal('');
  readonly selectedEstablishmentId = signal('');
  readonly admin = computed(() => isAdmin(this.auth.session.user()));
  readonly organizationText = computed(() => organizationLabel(this.auth.session.user()));
  readonly reds = this.organization.reds;
  readonly redOptions = computed<OrganizationDropdownOption[]>(() => this.reds().map((red) => ({ id: red.id, title: red.name })));
  readonly filterText = computed(() => {
    const establishment = this.selectedEstablishment();
    if (establishment) {
      return [establishment.name, establishment.microred?.name, establishment.red?.name].filter(Boolean).join(' · ');
    }

    const microred = this.organization.microreds().find((item) => item.id === this.selectedMicroredId());
    if (microred) {
      return [microred.name, microred.red?.name].filter(Boolean).join(' · ');
    }

    const red = this.reds().find((item) => item.id === this.selectedRedId());
    return red?.name ?? 'Toda la red administrativa';
  });
  readonly icons = {
    bell: LucideBell,
    calendarCheck: LucideCalendarCheck,
    calendarClock: LucideCalendarClock,
    calendarDays: LucideCalendarDays,
    circleCheck: LucideCircleCheck,
    circleX: LucideCircleX,
    fileUp: LucideFileUp,
    timer: LucideTimer,
    users: LucideUsersRound,
  };

  constructor() {
    this.organization.load();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.facade.load(this.dashboardFilters()).subscribe({
      next: (data) => this.data.set(data),
      complete: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  clearFilters(): void {
    this.selectedRedId.set('');
    this.selectedMicroredId.set('');
    this.selectedEstablishmentId.set('');
    this.load();
  }

  selectRed(redId: string): void {
    this.selectedRedId.set(redId);
    this.selectedMicroredId.set('');
    this.selectedEstablishmentId.set('');
  }

  selectMicrored(microredId: string): void {
    this.selectedMicroredId.set(microredId);
    this.selectedEstablishmentId.set('');
  }

  number(value: number | null): string {
    return value === null ? '-' : new Intl.NumberFormat('es-PE').format(value);
  }

  formatDate = formatDateOnly;

  shortId(value: string): string {
    return value.slice(0, 8);
  }

  chartTotal(vm: DashboardData): number {
    return vm.confirmationChart.pending + vm.confirmationChart.confirmed + vm.confirmationChart.cannotAttend;
  }

  percent(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }

  statusLabel(kind: string, value: string): string {
    return statusView(kind, value).label;
  }

  microredOptions(): OrganizationDropdownOption[] {
    const redId = this.selectedRedId();
    return this.organization.microreds()
      .filter((microred) => !redId || microred.red?.id === redId)
      .map((microred) => ({
        id: microred.id,
        title: microred.name,
        subtitle: microred.red?.name,
      }));
  }

  selectedEstablishment(): Establishment | null {
    const establishmentId = this.selectedEstablishmentId();
    return this.organization.establishments().find((item) => item.id === establishmentId) ?? null;
  }

  private dashboardFilters(): DashboardFilters {
    const establishment = this.selectedEstablishment();
    const microred = this.organization.microreds().find((item) => item.id === this.selectedMicroredId()) ?? null;
    const red = this.reds().find((item) => item.id === this.selectedRedId()) ?? null;

    return {
      red: establishment?.red?.name ?? microred?.red?.name ?? red?.name,
      microred: establishment?.microred?.name ?? microred?.name,
      establishment: establishment?.name,
    };
  }
}

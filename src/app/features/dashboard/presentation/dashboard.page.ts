import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  LucideCalendarClock,
  LucideCalendarDays,
  LucideCircleCheck,
  LucideCircleX,
  LucideTimer,
  LucideUsersRound,
} from '@lucide/angular';
import { filter, finalize, fromEvent, merge, timer } from 'rxjs';
import { AuthFacade } from '../../../core/auth/auth.facade';
import { isAdmin, organizationLabel } from '../../../core/auth/auth.models';
import { DashboardData, DashboardFacade, DashboardFilters } from '../application/dashboard.facade';
import { formatDateOnly } from '../../../shared/utils/date-only';
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
  private readonly destroyRef = inject(DestroyRef);
  readonly loading = signal(true);
  private readonly refreshing = signal(false);
  readonly data = signal<DashboardData | null>(null);
  readonly appliedFilters = signal<DashboardFilters>({});
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
    calendarClock: LucideCalendarClock,
    calendarDays: LucideCalendarDays,
    circleCheck: LucideCircleCheck,
    circleX: LucideCircleX,
    timer: LucideTimer,
    users: LucideUsersRound,
  };

  constructor() {
    this.organization.load();
    this.load();
    merge(
      timer(10_000, 10_000).pipe(filter(() => document.visibilityState !== 'hidden')),
      fromEvent(window, 'focus'),
      fromEvent(document, 'visibilitychange').pipe(filter(() => document.visibilityState === 'visible')),
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.refresh());
  }

  load(): void {
    const filters = this.dashboardFilters();
    this.appliedFilters.set(filters);
    this.fetch(filters, true);
  }

  refresh(): void {
    if (this.loading() || this.refreshing()) {
      return;
    }

    this.fetch(this.appliedFilters(), false);
  }

  private fetch(filters: DashboardFilters, showSkeleton: boolean): void {
    if (showSkeleton) {
      this.loading.set(true);
    } else {
      this.refreshing.set(true);
    }

    this.facade.load(filters).pipe(finalize(() => {
      if (showSkeleton) {
        this.loading.set(false);
      } else {
        this.refreshing.set(false);
      }
    })).subscribe({
      next: (data) => this.data.set(data),
      error: () => undefined,
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

  dateLabel(value: string): string {
    return formatDateOnly(value);
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

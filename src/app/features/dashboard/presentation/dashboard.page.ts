import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardData, DashboardFacade } from '../application/dashboard.facade';
import { formatDateOnly } from '../../../shared/utils/date-only';
import { statusView } from '../../../shared/utils/status-mappers';
import { EmptyStateComponent, PageTitleComponent, StatCardComponent, StatusBadgeComponent } from '../../../shared/ui/ui.components';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent, PageTitleComponent, RouterLink, StatCardComponent, StatusBadgeComponent],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.css',
})
export class DashboardPage {
  private readonly facade = inject(DashboardFacade);
  readonly loading = signal(true);
  readonly data = signal<DashboardData | null>(null);

  constructor() {
    this.facade.load().subscribe({
      next: (data) => this.data.set(data),
      complete: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
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
}

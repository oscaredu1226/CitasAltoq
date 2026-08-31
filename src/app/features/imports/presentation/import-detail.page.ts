import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideCalendarDays,
  LucideCircleCheck,
  LucideFileSpreadsheet,
  LucideRefreshCw,
  LucideTriangleAlert,
  LucideUsersRound,
} from '@lucide/angular';
import { switchMap } from 'rxjs';
import { formatOffsetDateTime } from '../../../shared/utils/date-only';
import { PageTitleComponent, StatCardComponent, StatusBadgeComponent } from '../../../shared/ui/ui.components';
import { ImportBatch, ImportsRepository } from '../infrastructure/imports.repository';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideArrowLeft, PageTitleComponent, RouterLink, StatCardComponent, StatusBadgeComponent],
  templateUrl: './import-detail.page.html',
  styleUrl: './import-detail.page.css',
})
export class ImportDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly repo = inject(ImportsRepository);
  readonly batch = signal<ImportBatch | null>(null);
  readonly loading = signal(true);
  readonly icons = {
    calendar: LucideCalendarDays,
    check: LucideCircleCheck,
    file: LucideFileSpreadsheet,
    refresh: LucideRefreshCw,
    users: LucideUsersRound,
    warning: LucideTriangleAlert,
  };

  constructor() {
    this.route.paramMap.pipe(
      switchMap((params) => {
        this.loading.set(true);
        this.batch.set(null);
        return this.repo.get(params.get('id')!);
      }),
    ).subscribe({
      next: (batch) => {
        this.batch.set(batch);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  formatDateTime = formatOffsetDateTime;

  scopeText(scope: ImportBatch['scope']): string {
    return [scope.establishment, scope.microred, scope.red].filter(Boolean).join(' · ') || 'Global';
  }

  importResult(batch: ImportBatch): string {
    if (batch.status === 'COMPLETED') {
      return 'La importación terminó correctamente.';
    }

    if (batch.status === 'FAILED') {
      return 'La importación no pudo completarse. Revisa las incidencias del archivo y vuelve a intentarlo.';
    }

    return 'La importación está siendo procesada por el servidor.';
  }
}

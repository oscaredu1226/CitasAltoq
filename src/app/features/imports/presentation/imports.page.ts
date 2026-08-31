import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideCircleCheck, LucideCircleX, LucideFileUp, LucideRefreshCw, LucideUploadCloud } from '@lucide/angular';
import { finalize } from 'rxjs';
import { PageResponse } from '../../../core/http/page-response';
import { formatOffsetDateTime } from '../../../shared/utils/date-only';
import { EmptyStateComponent, PageTitleComponent, PaginationComponent, StatCardComponent, StatusBadgeComponent } from '../../../shared/ui/ui.components';
import { ImportBatch, ImportsRepository } from '../infrastructure/imports.repository';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent, LucideUploadCloud, PageTitleComponent, PaginationComponent, RouterLink, StatCardComponent, StatusBadgeComponent],
  templateUrl: './imports.page.html',
  styleUrl: './imports.page.css',
})
export class ImportsPage {
  private readonly repo = inject(ImportsRepository);
  readonly page = signal<PageResponse<ImportBatch> | null>(null);
  readonly loading = signal(false);
  readonly icons = {
    check: LucideCircleCheck,
    fileUp: LucideFileUp,
    refresh: LucideRefreshCw,
    upload: LucideUploadCloud,
    x: LucideCircleX,
  };

  constructor() {
    this.load(0);
  }

  load(page: number): void {
    this.loading.set(true);
    this.repo.list(page, 8).pipe(finalize(() => this.loading.set(false))).subscribe((response) => this.page.set(response));
  }

  count(status: string): number {
    return this.page()?.content.filter((item) => item.status === status).length ?? 0;
  }

  formatDateTime = formatOffsetDateTime;
}

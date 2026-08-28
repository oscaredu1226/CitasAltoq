import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { formatOffsetDateTime } from '../../../shared/utils/date-only';
import { PageTitleComponent, StatCardComponent, StatusBadgeComponent } from '../../../shared/ui/ui.components';
import { ImportBatch, ImportsRepository } from '../infrastructure/imports.repository';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageTitleComponent, RouterLink, StatCardComponent, StatusBadgeComponent],
  templateUrl: './import-detail.page.html',
  styleUrl: './import-detail.page.css',
})
export class ImportDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly repo = inject(ImportsRepository);
  readonly batch = signal<ImportBatch | null>(null);

  constructor() {
    this.route.paramMap.pipe(switchMap((params) => this.repo.get(params.get('id')!))).subscribe((batch) => this.batch.set(batch));
  }

  formatDateTime = formatOffsetDateTime;

  scopeText(scope: ImportBatch['scope']): string {
    return [scope.establishment, scope.microred, scope.red].filter(Boolean).join(' · ') || 'Global';
  }
}

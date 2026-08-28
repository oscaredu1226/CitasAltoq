import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { PageTitleComponent, StatusBadgeComponent } from '../../../shared/ui/ui.components';
import { OperationsRepository, OperationsStatus } from '../infrastructure/operations.repository';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageTitleComponent, StatusBadgeComponent],
  templateUrl: './operations.page.html',
  styleUrl: './operations.page.css',
})
export class OperationsPage {
  private readonly repo = inject(OperationsRepository);
  readonly status = signal<OperationsStatus | null>(null);

  constructor() {
    this.repo.status().subscribe((status) => this.status.set(status));
  }
}

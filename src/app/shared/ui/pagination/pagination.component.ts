import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PageResponse } from '../../../core/http/page-response';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pagination',
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.css',
})
export class PaginationComponent<T> {
  readonly page = input<PageResponse<T> | null>(null);
  readonly goTo = output<number>();

  firstItem(page: PageResponse<T>): number {
    return page.totalElements === 0 ? 0 : page.page * page.size + 1;
  }

  lastItem(page: PageResponse<T>): number {
    return Math.min((page.page + 1) * page.size, page.totalElements);
  }
}

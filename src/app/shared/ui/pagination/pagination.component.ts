import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';
import { PageResponse } from '../../../core/http/page-response';

type PaginationItem = number | 'ellipsis';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideChevronLeft, LucideChevronRight],
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

  pages(page: PageResponse<T>): PaginationItem[] {
    const totalPages = page.totalPages;
    const current = page.page;

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index);
    }

    const pages = new Set([0, totalPages - 1, current - 1, current, current + 1]
      .filter((item) => item >= 0 && item < totalPages));
    const sorted = Array.from(pages).sort((a, b) => a - b);
    const result: PaginationItem[] = [];

    sorted.forEach((item, index) => {
      const previous = sorted[index - 1];
      if (index > 0 && item - previous > 1) {
        result.push('ellipsis');
      }
      result.push(item);
    });

    return result;
  }

  trackPage(index: number, item: PaginationItem): string {
    return `${item}-${index}`;
  }
}

import { of } from 'rxjs';
import { newestFirstPage } from './newest-page';
import { PageResponse } from './page-response';

function page(content: number[], pageNumber: number, size: number, totalElements: number): PageResponse<number> {
  return {
    content,
    page: pageNumber,
    size,
    totalElements,
    totalPages: Math.ceil(totalElements / size),
  };
}

describe('newestFirstPage', () => {
  it('fills the first UI page with the newest server records across page boundaries', () => {
    const loadPage = vi.fn((serverPage: number, size: number) => {
      if (size === 1) {
        return of(page([1], 0, 1, 25));
      }

      const start = serverPage * size + 1;
      const end = Math.min(start + size - 1, 25);
      return of(page(Array.from({ length: end - start + 1 }, (_, index) => start + index), serverPage, size, 25));
    });

    newestFirstPage(0, 10, loadPage).subscribe((result) => {
      expect(result.page).toBe(0);
      expect(result.size).toBe(10);
      expect(result.totalElements).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(result.content).toEqual([25, 24, 23, 22, 21, 20, 19, 18, 17, 16]);
    });

    expect(loadPage).toHaveBeenNthCalledWith(1, 0, 1);
    expect(loadPage).toHaveBeenNthCalledWith(2, 1, 10);
    expect(loadPage).toHaveBeenNthCalledWith(3, 2, 10);
  });

  it('does not leave the first UI page half-empty when the newest server page is partial', () => {
    const loadPage = vi.fn((serverPage: number, size: number) => {
      if (size === 1) {
        return of(page([1], 0, 1, 9));
      }

      const start = serverPage * size + 1;
      const end = Math.min(start + size - 1, 9);
      return of(page(Array.from({ length: end - start + 1 }, (_, index) => start + index), serverPage, size, 9));
    });

    newestFirstPage(0, 8, loadPage).subscribe((result) => {
      expect(result.page).toBe(0);
      expect(result.totalElements).toBe(9);
      expect(result.totalPages).toBe(2);
      expect(result.content).toEqual([9, 8, 7, 6, 5, 4, 3, 2]);
    });
  });

  it('clamps out-of-range UI pages', () => {
    const loadPage = vi.fn((serverPage: number, size: number) => {
      if (size === 1) {
        return of(page([1], 0, 1, 5));
      }

      return of(page([1, 2, 3, 4, 5], serverPage, size, 5));
    });

    newestFirstPage(99, 10, loadPage).subscribe((result) => {
      expect(result.page).toBe(0);
      expect(result.content).toEqual([5, 4, 3, 2, 1]);
    });
  });
});

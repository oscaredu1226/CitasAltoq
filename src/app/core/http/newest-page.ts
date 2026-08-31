import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { PageResponse } from './page-response';

export function newestFirstPage<T>(
  page: number,
  size: number,
  loadPage: (serverPage: number, serverSize: number) => Observable<PageResponse<T>>,
): Observable<PageResponse<T>> {
  return loadPage(0, 1).pipe(
    switchMap((meta) => {
      const totalElements = meta.totalElements;
      const totalPages = Math.ceil(totalElements / size);

      if (totalElements === 0 || totalPages === 0) {
        return of({ content: [], page: 0, size, totalElements: 0, totalPages: 0 });
      }

      const uiPage = Math.max(0, Math.min(page, totalPages - 1));
      const newestStart = uiPage * size;
      const newestEnd = Math.min(newestStart + size, totalElements) - 1;
      const ascendingStart = totalElements - 1 - newestEnd;
      const ascendingEnd = totalElements - 1 - newestStart;
      const firstServerPage = Math.floor(ascendingStart / size);
      const lastServerPage = Math.floor(ascendingEnd / size);
      const requests = Array.from(
        { length: lastServerPage - firstServerPage + 1 },
        (_, index) => {
          const serverPage = firstServerPage + index;
          return loadPage(serverPage, size).pipe(map((response) => ({ response, serverPage })));
        },
      );

      return forkJoin(requests).pipe(
        map((responses) => ({
          content: responses
            .flatMap(({ response, serverPage }) =>
              response.content.map((item, index) => ({
                item,
                index: serverPage * size + index,
              })),
            )
            .filter((entry) => entry.index >= ascendingStart && entry.index <= ascendingEnd)
            .sort((a, b) => b.index - a.index)
            .map((entry) => entry.item),
          page: uiPage,
          size,
          totalElements,
          totalPages,
        })),
      );
    }),
  );
}

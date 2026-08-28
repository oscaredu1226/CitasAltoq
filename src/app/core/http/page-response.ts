export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const emptyPage = <T>(page = 0, size = 20): PageResponse<T> => ({
  content: [],
  page,
  size,
  totalElements: 0,
  totalPages: 0,
});

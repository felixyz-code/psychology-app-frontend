export interface PaginationOptions {
  pageIndex: number;
  pageSize: number;
}

export function paginateItems<T>(
  items: readonly T[],
  { pageIndex, pageSize }: PaginationOptions
): T[] {
  const safePageSize = Math.max(pageSize, 1);
  const safePageIndex = Math.max(pageIndex, 0);
  const start = safePageIndex * safePageSize;

  return items.slice(start, start + safePageSize);
}


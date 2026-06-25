import { DataTableSortDirection } from '../../models/data-table.models';

export interface SortOptions<T> {
  sortBy?: string;
  sortDirection?: DataTableSortDirection;
  getSortValue: (item: T, sortBy: string) => string | number | Date | null | undefined;
}

export function sortItems<T>(
  items: readonly T[],
  { sortBy, sortDirection, getSortValue }: SortOptions<T>
): T[] {
  if (!sortBy || !sortDirection) {
    return [...items];
  }

  return [...items].sort((first, second) => {
    const firstValue = normalizeSortValue(getSortValue(first, sortBy));
    const secondValue = normalizeSortValue(getSortValue(second, sortBy));

    if (firstValue < secondValue) {
      return sortDirection === 'asc' ? -1 : 1;
    }

    if (firstValue > secondValue) {
      return sortDirection === 'asc' ? 1 : -1;
    }

    return 0;
  });
}

function normalizeSortValue(value: string | number | Date | null | undefined): string | number {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'number') {
    return value;
  }

  return String(value ?? '').toLowerCase();
}


export type DataTableSortDirection = 'asc' | 'desc' | '';

export interface DataTableState {
  searchTerm: string;
  pageIndex: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: DataTableSortDirection;
}

export interface DataTableResult<T> {
  items: T[];
  filteredItems: T[];
  pagedItems: T[];
  totalItems: number;
  totalFilteredItems: number;
  hasActiveFilters: boolean;
}


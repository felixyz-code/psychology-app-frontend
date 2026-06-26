export function normalizeSearchText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function matchesSearchTerm<T>(
  item: T,
  searchTerm: string,
  searchableValues: (item: T) => Array<string | number | null | undefined>
): boolean {
  const normalizedTerm = normalizeSearchText(searchTerm);

  if (!normalizedTerm) {
    return true;
  }

  return searchableValues(item).some((value) =>
    normalizeSearchText(value).includes(normalizedTerm)
  );
}

export function formatFilteredResultsLabel(
  totalFilteredItems: number,
  totalItems: number,
  formatTotalLabel: (count: number) => string,
  hasActiveFilters: boolean
): string {
  const totalLabel = formatTotalLabel(totalItems);

  if (!hasActiveFilters) {
    return totalLabel;
  }

  return `${totalFilteredItems} de ${totalLabel}`;
}

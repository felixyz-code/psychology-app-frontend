import {
  formatFilteredResultsLabel,
  getSafePageIndex,
  matchesSearchTerm,
  normalizeSearchText,
  paginateItems,
  sortItems,
} from './index';

interface Row {
  id: string;
  name: string | null;
  age: number | null;
  createdAt?: Date | null;
}

const rows: Row[] = [
  { id: 'a', name: 'Álvaro', age: 35, createdAt: new Date('2026-01-03T00:00:00.000Z') },
  { id: 'b', name: 'Beatriz', age: null, createdAt: null },
  { id: 'c', name: 'carlos', age: 28, createdAt: new Date('2026-01-01T00:00:00.000Z') },
  { id: 'd', name: null, age: 42, createdAt: new Date('2026-01-02T00:00:00.000Z') },
];

describe('data-table utilities', () => {
  it('normalizes search text and matches supported values without case or accent sensitivity', () => {
    expect(normalizeSearchText('  ÁLVARO  ')).toBe('alvaro');

    const result = rows.filter((row) =>
      matchesSearchTerm(row, 'alv', (item) => [item.name, item.age])
    );

    expect(result.map((row) => row.id)).toEqual(['a']);
  });

  it('treats empty search terms as a match and ignores null searchable values', () => {
    expect(matchesSearchTerm(rows[1], '', (item) => [item.name])).toBe(true);
    expect(matchesSearchTerm(rows[3], 'missing', (item) => [item.name])).toBe(false);
  });

  it('formats filtered labels only when filters are active', () => {
    const formatTotalLabel = (count: number) => `${count} pacientes`;

    expect(formatFilteredResultsLabel(2, 4, formatTotalLabel, true)).toBe('2 de 4 pacientes');
    expect(formatFilteredResultsLabel(2, 4, formatTotalLabel, false)).toBe('4 pacientes');
  });

  it('sorts ascending and descending deterministically without mutating the input', () => {
    const input = [...rows];

    const ascending = sortItems(input, {
      sortBy: 'name',
      sortDirection: 'asc',
      getSortValue: (row, sortBy) => row[sortBy as keyof Row] as string | number | Date | null | undefined,
    });
    const descending = sortItems(input, {
      sortBy: 'age',
      sortDirection: 'desc',
      getSortValue: (row, sortBy) => row[sortBy as keyof Row] as string | number | Date | null | undefined,
    });

    expect(ascending.map((row) => row.id)).toEqual(['d', 'b', 'c', 'a']);
    expect(descending.map((row) => row.id)).toEqual(['d', 'a', 'c', 'b']);
    expect(input).toEqual(rows);
  });

  it('returns a copied array when sort options are incomplete', () => {
    const result = sortItems(rows, {
      getSortValue: (row) => row.name,
    });

    expect(result).toEqual(rows);
    expect(result).not.toBe(rows);
  });

  it('clamps page index boundaries when filtering changes the available pages', () => {
    expect(getSafePageIndex(12, 2, 5)).toBe(2);
    expect(getSafePageIndex(6, 2, 5)).toBe(1);
    expect(getSafePageIndex(0, 5, 5)).toBe(0);
    expect(getSafePageIndex(10, -3, 5)).toBe(0);
    expect(getSafePageIndex(10, 8, 0)).toBe(8);
  });

  it('paginates valid, empty, and lower-bound page requests with the real page size', () => {
    expect(paginateItems(rows, { pageIndex: 1, pageSize: 2 }).map((row) => row.id)).toEqual(['c', 'd']);
    expect(paginateItems(rows, { pageIndex: 2, pageSize: 2 })).toEqual([]);
    expect(paginateItems(rows, { pageIndex: -1, pageSize: 2 }).map((row) => row.id)).toEqual(['a', 'b']);
    expect(paginateItems(rows, { pageIndex: 0, pageSize: 0 }).map((row) => row.id)).toEqual(['a']);
  });
});

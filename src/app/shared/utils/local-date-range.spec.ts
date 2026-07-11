import { nextLocalDayStart, startOfLocalDateOnly } from './local-date-range';

describe('local date range helpers', () => {
  it('converts a date-only value to the start of its local day without UTC parsing', () => {
    const result = startOfLocalDateOnly('2026-03-15');
    const expected = new Date(2026, 2, 15, 0, 0, 0, 0);

    expect(result?.getTime()).toBe(expected.getTime());
    expect(result?.toISOString()).toBe(expected.toISOString());
  });

  it('creates the exclusive boundary on the next local day across a month change', () => {
    const result = nextLocalDayStart('2026-01-31');
    const expected = new Date(2026, 1, 1, 0, 0, 0, 0);

    expect(result?.getTime()).toBe(expected.getTime());
  });

  it('creates the exclusive boundary across a year change', () => {
    const result = nextLocalDayStart('2026-12-31');
    const expected = new Date(2027, 0, 1, 0, 0, 0, 0);

    expect(result?.toISOString()).toBe(expected.toISOString());
  });
});

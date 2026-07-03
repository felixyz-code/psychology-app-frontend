import {
  nextLocalDayStart,
  parseLocalDateOnly,
  startOfLocalDateOnly,
  toDateInputValue,
} from '../../../shared/utils/local-date-range';

export {
  nextLocalDayStart,
  parseLocalDateOnly,
  startOfLocalDateOnly,
  toDateInputValue,
} from '../../../shared/utils/local-date-range';

export function buildCurrentMonthDateRange(): { from: string; to: string } {
  const now = new Date();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    from: toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toDateInputValue(lastDayOfMonth),
  };
}

export function parseDateInputToLocalDate(value?: string): Date | null {
  return parseLocalDateOnly(value);
}

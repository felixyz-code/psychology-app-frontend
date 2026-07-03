export function toDateInputValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function buildCurrentMonthDateRange(): { from: string; to: string } {
  const now = new Date();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    from: toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toDateInputValue(lastDayOfMonth),
  };
}

export function parseLocalDateOnly(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function parseDateInputToLocalDate(value?: string): Date | null {
  return parseLocalDateOnly(value);
}

export function startOfLocalDateOnly(value?: string): Date | null {
  const date = parseLocalDateOnly(value);

  if (!date) {
    return null;
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function nextLocalDayStart(value?: string): Date | null {
  const date = parseLocalDateOnly(value);

  if (!date) {
    return null;
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, 0);
}

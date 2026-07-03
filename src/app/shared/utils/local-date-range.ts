export function isDateOnlyValue(value?: string): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function parseLocalDateOnly(value?: string): Date | null {
  if (!isDateOnlyValue(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
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

export function toDateInputValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

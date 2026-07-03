export function toDateInputValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function buildCurrentMonthDateRange(): { from: string; to: string } {
  const now = new Date();

  return {
    from: toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toDateInputValue(now),
  };
}

export function parseDateInputToLocalDate(value?: string): Date | null {
  if (!value) {
    return null;
  }

  return new Date(`${value}T00:00:00`);
}

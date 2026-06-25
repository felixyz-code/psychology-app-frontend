export function parseAppointmentDate(value: string | Date): Date {
  return value instanceof Date ? new Date(value.getTime()) : new Date(value);
}

export function startOfLocalDay(value: string | Date): Date {
  const date = parseAppointmentDate(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfLocalDay(value: string | Date): Date {
  const start = startOfLocalDay(value);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59, 999);
}

export function isSameLocalDay(dateA: string | Date, dateB: string | Date): boolean {
  const first = parseAppointmentDate(dateA);
  const second = parseAppointmentDate(dateB);

  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export function isTomorrowLocal(value: string | Date, reference: Date = new Date()): boolean {
  return getLocalDayDifference(value, reference) === 1;
}

export function isAfterTodayLocal(value: string | Date, reference: Date = new Date()): boolean {
  return startOfLocalDay(value).getTime() > startOfLocalDay(reference).getTime();
}

export function getLocalDayDifference(value: string | Date, reference: Date = new Date()): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const targetDay = startOfLocalDay(value).getTime();
  const currentDay = startOfLocalDay(reference).getTime();

  return Math.round((targetDay - currentDay) / millisecondsPerDay);
}

export function toDateTimeLocalValue(value: string | Date): string {
  const date = parseAppointmentDate(value);
  const year = date.getFullYear();
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());
  const hours = padDatePart(date.getHours());
  const minutes = padDatePart(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function localDateTimeValueToIso(value: string): string {
  const [datePart, timePart] = value.split('T');

  if (!datePart || !timePart) {
    return new Date(value).toISOString();
  }

  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1, hours ?? 0, minutes ?? 0, 0, 0);

  return date.toISOString();
}

export function sortAppointmentsByScheduledAt<T extends { scheduledAt: string }>(appointments: T[]): T[] {
  return [...appointments].sort(
    (left, right) => parseAppointmentDate(left.scheduledAt).getTime() - parseAppointmentDate(right.scheduledAt).getTime()
  );
}

function padDatePart(value: number): string {
  return value.toString().padStart(2, '0');
}

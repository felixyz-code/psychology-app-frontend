export function parseFlexibleDateTime(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (typeof value === 'number') {
    return new Date(value);
  }

  if (!value || typeof value !== 'string') {
    return new Date(NaN);
  }

  const raw = value.trim();

  // If already standard ISO with UTC timezone or offset
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/i.test(raw)) {
    return new Date(raw);
  }

  // Pattern 1: Latin / European format: "DD/MM/YYYY HH:mm(:ss)? [a. m. / p. m. / AM / PM]"
  const latinMatch = raw.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm))?)?$/i,
  );
  if (latinMatch) {
    const day = Number(latinMatch[1]);
    const month = Number(latinMatch[2]) - 1;
    const year = Number(latinMatch[3]);
    let hours = latinMatch[4] !== undefined ? Number(latinMatch[4]) : 0;
    const minutes = latinMatch[5] !== undefined ? Number(latinMatch[5]) : 0;
    const seconds = latinMatch[6] !== undefined ? Number(latinMatch[6]) : 0;
    const meridiem = latinMatch[7] ? latinMatch[7].toLowerCase().replace(/[\s\.]/g, '') : null;

    if (meridiem === 'pm' && hours < 12) {
      hours += 12;
    } else if (meridiem === 'am' && hours === 12) {
      hours = 0;
    }

    return new Date(year, month, day, hours, minutes, seconds);
  }

  // Pattern 2: ISO-like or datetime-local format: "YYYY-MM-DD[T or space]HH:mm(:ss)? [a. m. / p. m. / AM / PM]"
  const isoLocalMatch = raw.match(
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm))?)?$/i,
  );
  if (isoLocalMatch) {
    const year = Number(isoLocalMatch[1]);
    const month = Number(isoLocalMatch[2]) - 1;
    const day = Number(isoLocalMatch[3]);
    let hours = isoLocalMatch[4] !== undefined ? Number(isoLocalMatch[4]) : 0;
    const minutes = isoLocalMatch[5] !== undefined ? Number(isoLocalMatch[5]) : 0;
    const seconds = isoLocalMatch[6] !== undefined ? Number(isoLocalMatch[6]) : 0;
    const meridiem = isoLocalMatch[7]
      ? isoLocalMatch[7].toLowerCase().replace(/[\s\.]/g, '')
      : null;

    if (meridiem === 'pm' && hours < 12) {
      hours += 12;
    } else if (meridiem === 'am' && hours === 12) {
      hours = 0;
    }

    return new Date(year, month, day, hours, minutes, seconds);
  }

  const fallbackDate = new Date(raw);
  return fallbackDate;
}

export function parseAppointmentDate(value: string | Date): Date {
  return parseFlexibleDateTime(value);
}

export function startOfLocalDay(value: string | Date): Date {
  const date = parseFlexibleDateTime(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfLocalDay(value: string | Date): Date {
  const start = startOfLocalDay(value);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59, 999);
}

export function startOfLocalMonth(value: string | Date): Date {
  const date = parseFlexibleDateTime(value);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfLocalMonth(value: string | Date): Date {
  const date = parseFlexibleDateTime(value);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function isWithinLocalDateRange(
  value: string | Date,
  startDate: Date | null,
  endDate: Date | null,
): boolean {
  const appointmentTime = parseFlexibleDateTime(value).getTime();
  const rangeStartTime = startDate
    ? startOfLocalDay(startDate).getTime()
    : Number.NEGATIVE_INFINITY;
  const rangeEndTime = endDate ? endOfLocalDay(endDate).getTime() : Number.POSITIVE_INFINITY;

  return appointmentTime >= rangeStartTime && appointmentTime <= rangeEndTime;
}

export function isSameLocalDay(dateA: string | Date, dateB: string | Date): boolean {
  const first = parseFlexibleDateTime(dateA);
  const second = parseFlexibleDateTime(dateB);

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

export const DEFAULT_BUSINESS_HOURS = {
  startHour: 9, // 09:00 AM
  endHour: 19, // 07:00 PM (19:00)
};

export function isWithinBusinessHours(
  dateValue: string | Date,
  startHour: number = DEFAULT_BUSINESS_HOURS.startHour,
  endHour: number = DEFAULT_BUSINESS_HOURS.endHour,
): boolean {
  const date = parseFlexibleDateTime(dateValue);
  const hour = date.getHours();
  return hour >= startHour && hour <= endHour;
}

export function filterBusinessHourSlots<T extends { startTime: string; available?: boolean }>(
  slots: T[],
  startHour: number = DEFAULT_BUSINESS_HOURS.startHour,
  endHour: number = DEFAULT_BUSINESS_HOURS.endHour,
): T[] {
  return slots.filter((slot) => {
    return isWithinBusinessHours(slot.startTime, startHour, endHour);
  });
}

export interface BusinessGridSlot {
  startTime: string;
  endTime: string;
  timeLabel: string;
  available: boolean;
  conflictType?: 'APPOINTMENT' | 'SCHEDULE_BLOCK';
  conflictTitle?: string;
}

export interface OccupiedInterval {
  startTime: string | Date;
  endTime?: string | Date;
  durationMinutes?: number;
  type?: 'APPOINTMENT' | 'SCHEDULE_BLOCK';
  title?: string;
  available?: boolean;
}

/**
 * Generates all 1-hour slots from startHour (09:00) through endHour (19:00 inclusive)
 * for the selected date, evaluating availability against known occupied intervals.
 */
export function generateBusinessHoursGrid(
  targetDate: string | Date,
  occupiedIntervals: OccupiedInterval[] = [],
  startHour: number = DEFAULT_BUSINESS_HOURS.startHour,
  endHour: number = DEFAULT_BUSINESS_HOURS.endHour,
): BusinessGridSlot[] {
  const baseDate = parseFlexibleDateTime(targetDate);
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const day = baseDate.getDate();

  const slots: BusinessGridSlot[] = [];

  for (let hour = startHour; hour <= endHour; hour++) {
    const slotStart = new Date(year, month, day, hour, 0, 0, 0);
    const slotEnd = new Date(year, month, day, hour + 1, 0, 0, 0);
    const slotStartMs = slotStart.getTime();
    const slotEndMs = slotEnd.getTime();

    const conflict = occupiedIntervals.find((occ) => {
      if (occ.available === true) {
        return false;
      }
      const occStart = parseFlexibleDateTime(occ.startTime).getTime();
      let occEnd = occ.endTime ? parseFlexibleDateTime(occ.endTime).getTime() : 0;
      if (!occEnd && occ.durationMinutes) {
        occEnd = occStart + occ.durationMinutes * 60_000;
      }
      if (!occEnd) {
        occEnd = occStart + 60 * 60_000;
      }
      return slotStartMs < occEnd && slotEndMs > occStart;
    });

    const timeLabel = `${padDatePart(hour)}:00`;

    slots.push({
      startTime: slotStart.toISOString(),
      endTime: slotEnd.toISOString(),
      timeLabel,
      available: !conflict,
      conflictType: conflict?.type,
      conflictTitle: conflict?.title,
    });
  }

  return slots;
}

/**
 * Evaluates whether two intervals overlap: [startA < endB && endA > startB]
 */
export function checkIntervalOverlap(
  startA: string | Date,
  durationMinutesA: number,
  startB: string | Date,
  durationMinutesB: number,
): boolean {
  const startMsA = parseFlexibleDateTime(startA).getTime();
  const endMsA = startMsA + durationMinutesA * 60_000;
  const startMsB = parseFlexibleDateTime(startB).getTime();
  const endMsB = startMsB + durationMinutesB * 60_000;

  return startMsA < endMsB && endMsA > startMsB;
}

export function calculateSmartDefaultTime(
  referenceDate: Date = new Date(),
  targetDate?: Date | string | null,
): Date {
  const target = targetDate ? parseFlexibleDateTime(targetDate) : new Date(referenceDate);
  const currentHours = referenceDate.getHours();
  const currentMinutes = referenceDate.getMinutes();
  const currentSeconds = referenceDate.getSeconds();

  const hasMinutes = currentMinutes > 0 || currentSeconds > 0;
  let nextHour = hasMinutes ? currentHours + 1 : currentHours;

  // If outside of business hours (e.g. late night / early morning), default to 9:00 AM
  if (nextHour < DEFAULT_BUSINESS_HOURS.startHour || nextHour > DEFAULT_BUSINESS_HOURS.endHour) {
    if (nextHour < DEFAULT_BUSINESS_HOURS.startHour || nextHour > DEFAULT_BUSINESS_HOURS.endHour) {
      nextHour = DEFAULT_BUSINESS_HOURS.startHour;
    }
  }

  const result = new Date(target);
  result.setHours(nextHour, 0, 0, 0);
  return result;
}

export function toDateTimeLocalValue(value: string | Date): string {
  const date = parseFlexibleDateTime(value);
  const year = date.getFullYear();
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());
  const hours = padDatePart(date.getHours());
  const minutes = padDatePart(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function localDateTimeValueToIso(value: string): string {
  const date = parseFlexibleDateTime(value);
  return date.toISOString();
}

export function sortAppointmentsByScheduledAt<T extends { scheduledAt: string }>(
  appointments: T[],
): T[] {
  return [...appointments].sort(
    (left, right) =>
      parseFlexibleDateTime(left.scheduledAt).getTime() -
      parseFlexibleDateTime(right.scheduledAt).getTime(),
  );
}

function padDatePart(value: number): string {
  return value.toString().padStart(2, '0');
}

import { describe, expect, it } from 'vitest';
import {
  calculateSmartDefaultTime,
  checkIntervalOverlap,
  endOfLocalDay,
  endOfLocalMonth,
  filterBusinessHourSlots,
  generateBusinessHoursGrid,
  getLocalDayDifference,
  isAfterTodayLocal,
  isSameLocalDay,
  isTomorrowLocal,
  isWithinBusinessHours,
  isWithinLocalDateRange,
  localDateTimeValueToIso,
  parseAppointmentDate,
  parseFlexibleDateTime,
  resolveBusinessHours,
  sortAppointmentsByScheduledAt,
  startOfLocalDay,
  startOfLocalMonth,
  toDateTimeLocalValue,
} from './appointment-datetime';

describe('appointment-datetime utils', () => {
  it('parseFlexibleDateTime correctly parses Latin 12h format with p. m. (01:00 p. m. -> 13:00)', () => {
    const parsed = parseFlexibleDateTime('27/08/2026 01:00 p. m.');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(7); // August = index 7
    expect(parsed.getDate()).toBe(27);
    expect(parsed.getHours()).toBe(13);
    expect(parsed.getMinutes()).toBe(0);
  });

  it('parseFlexibleDateTime correctly parses Latin 12h format with a. m. (09:30 a. m. -> 09:30)', () => {
    const parsed = parseFlexibleDateTime('27/08/2026 09:30 a. m.');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(7);
    expect(parsed.getDate()).toBe(27);
    expect(parsed.getHours()).toBe(9);
    expect(parsed.getMinutes()).toBe(30);
  });

  it('parseFlexibleDateTime correctly parses Latin 24h format (27/08/2026 15:45)', () => {
    const parsed = parseFlexibleDateTime('27/08/2026 15:45');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(7);
    expect(parsed.getDate()).toBe(27);
    expect(parsed.getHours()).toBe(15);
    expect(parsed.getMinutes()).toBe(45);
  });

  it('parseFlexibleDateTime correctly parses datetime-local string (2026-08-27T13:00)', () => {
    const parsed = parseFlexibleDateTime('2026-08-27T13:00');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(7);
    expect(parsed.getDate()).toBe(27);
    expect(parsed.getHours()).toBe(13);
    expect(parsed.getMinutes()).toBe(0);
  });

  it('generateBusinessHoursGrid generates all 10 slots from default 09:00 to 18:00 and marks occupied slots', () => {
    const targetDate = new Date(2026, 7, 27);
    const occupied = [
      {
        startTime: new Date(2026, 7, 27, 13, 0, 0).toISOString(),
        durationMinutes: 60,
        type: 'APPOINTMENT' as const,
      },
    ];

    const grid = generateBusinessHoursGrid(targetDate, occupied);
    expect(grid).toHaveLength(10); // 09, 10, 11, 12, 13, 14, 15, 16, 17, 18

    const labels = grid.map((g) => g.timeLabel);
    expect(labels).toEqual([
      '09:00',
      '10:00',
      '11:00',
      '12:00',
      '13:00',
      '14:00',
      '15:00',
      '16:00',
      '17:00',
      '18:00',
    ]);

    const slot13 = grid.find((g) => g.timeLabel === '13:00');
    expect(slot13?.available).toBe(false);
    expect(slot13?.conflictType).toBe('APPOINTMENT');

    const slot10 = grid.find((g) => g.timeLabel === '10:00');
    expect(slot10?.available).toBe(true);

    const slot18 = grid.find((g) => g.timeLabel === '18:00');
    expect(slot18?.available).toBe(true);
  });

  it('generateBusinessHoursGrid supports custom startHour and endHour (e.g. 08:00 to 17:00)', () => {
    const targetDate = new Date(2026, 7, 27);
    const grid = generateBusinessHoursGrid(targetDate, [], 8, 17);
    expect(grid).toHaveLength(10);
    expect(grid[0].timeLabel).toBe('08:00');
    expect(grid[grid.length - 1].timeLabel).toBe('17:00');
  });

  it('resolveBusinessHours falls back to 09:00 to 18:00 when no configuration is provided', () => {
    const result = resolveBusinessHours(null, undefined);
    expect(result).toEqual({ startHour: 9, endHour: 18 });
  });

  it('resolveBusinessHours reads workdayStartHour and workdayEndHour from branch', () => {
    const branch = {
      workdayStartHour: 8,
      workdayEndHour: 16,
    };
    const result = resolveBusinessHours(branch);
    expect(result).toEqual({ startHour: 8, endHour: 16 });
  });

  it('resolveBusinessHours reads businessHours object when workday fields not directly present', () => {
    const settings = {
      businessHours: {
        startHour: 10,
        endHour: 20,
      },
    };
    const result = resolveBusinessHours(settings);
    expect(result).toEqual({ startHour: 10, endHour: 20 });
  });

  it('checkIntervalOverlap accurately detects exact collision between 27/08/2026 13:00 and 27/08/2026 01:00 p. m.', () => {
    const existingAppointment = {
      scheduledAt: new Date(2026, 7, 27, 13, 0, 0).toISOString(),
      durationMinutes: 60,
    };

    const selectedDateTimeString = '27/08/2026 01:00 p. m.';
    const startNew = parseFlexibleDateTime(selectedDateTimeString);
    const durationMinutes = 60;

    const startA = startNew.getTime();
    const endA = startA + durationMinutes * 60000;
    const startB = new Date(existingAppointment.scheduledAt).getTime();
    const endB = startB + (existingAppointment.durationMinutes || 60) * 60000;
    const hasConflict = startA < endB && endA > startB;

    expect(hasConflict).toBe(true);

    const overlapDirect = checkIntervalOverlap(
      startNew,
      durationMinutes,
      existingAppointment.scheduledAt,
      existingAppointment.durationMinutes,
    );
    expect(overlapDirect).toBe(true);
  });

  it('checkIntervalOverlap detects overlapping intervals and non-overlapping intervals', () => {
    // 13:00 to 14:00 vs 13:30 to 14:30 -> overlap
    expect(
      checkIntervalOverlap(
        new Date(2026, 7, 27, 13, 0),
        60,
        new Date(2026, 7, 27, 13, 30),
        60,
      ),
    ).toBe(true);

    // 13:00 to 14:00 vs 14:00 to 15:00 -> no overlap (consecutive)
    expect(
      checkIntervalOverlap(
        new Date(2026, 7, 27, 13, 0),
        60,
        new Date(2026, 7, 27, 14, 0),
        60,
      ),
    ).toBe(false);
  });

  it('calculateSmartDefaultTime computes next hour for 4:15 PM to 5:00 PM', () => {
    const reference = new Date(2026, 6, 15, 16, 15, 0); // 4:15 PM
    const calculated = calculateSmartDefaultTime(reference);

    expect(calculated.getHours()).toBe(17); // 5:00 PM
    expect(calculated.getMinutes()).toBe(0);
    expect(calculated.getSeconds()).toBe(0);
  });

  it('calculateSmartDefaultTime keeps current hour if exactly on the hour', () => {
    const reference = new Date(2026, 6, 15, 16, 0, 0); // 4:00 PM sharp
    const calculated = calculateSmartDefaultTime(reference);

    expect(calculated.getHours()).toBe(16);
    expect(calculated.getMinutes()).toBe(0);
    expect(calculated.getSeconds()).toBe(0);
  });

  it('calculateSmartDefaultTime applies next hour to specified target date', () => {
    const reference = new Date(2026, 6, 15, 10, 30, 0);
    const targetDate = new Date(2026, 6, 20, 0, 0, 0);
    const calculated = calculateSmartDefaultTime(reference, targetDate);

    expect(calculated.getFullYear()).toBe(2026);
    expect(calculated.getMonth()).toBe(6);
    expect(calculated.getDate()).toBe(20);
    expect(calculated.getHours()).toBe(11);
    expect(calculated.getMinutes()).toBe(0);
  });

  it('toDateTimeLocalValue formats date correctly to YYYY-MM-DDTHH:mm', () => {
    const date = new Date(2026, 6, 15, 17, 0, 0);
    const formatted = toDateTimeLocalValue(date);
    expect(formatted).toBe('2026-07-15T17:00');
  });

  it('localDateTimeValueToIso converts local string to ISO string', () => {
    const iso = localDateTimeValueToIso('2026-07-15T17:00');
    expect(new Date(iso).getFullYear()).toBe(2026);
    expect(new Date(iso).getMonth()).toBe(6);
    expect(new Date(iso).getDate()).toBe(15);
  });

  it('handles local range and day checks correctly', () => {
    const today = new Date(2026, 6, 15, 10, 0, 0);
    const tomorrow = new Date(2026, 6, 16, 10, 0, 0);

    expect(isSameLocalDay(today, new Date(2026, 6, 15, 22, 0, 0))).toBe(true);
    expect(isTomorrowLocal(tomorrow, today)).toBe(true);
    expect(isAfterTodayLocal(tomorrow, today)).toBe(true);
    expect(getLocalDayDifference(tomorrow, today)).toBe(1);
    expect(isWithinLocalDateRange(today, today, tomorrow)).toBe(true);
  });

  it('filters slots to business hours between 09:00 and 18:00 by default', () => {
    const rawSlots = [
      { startTime: new Date(2026, 6, 15, 1, 0, 0).toISOString(), available: true },
      { startTime: new Date(2026, 6, 15, 8, 30, 0).toISOString(), available: true },
      { startTime: new Date(2026, 6, 15, 9, 0, 0).toISOString(), available: true },
      { startTime: new Date(2026, 6, 15, 14, 0, 0).toISOString(), available: true },
      { startTime: new Date(2026, 6, 15, 18, 0, 0).toISOString(), available: true },
      { startTime: new Date(2026, 6, 15, 19, 0, 0).toISOString(), available: true },
      { startTime: new Date(2026, 6, 15, 22, 0, 0).toISOString(), available: true },
    ];

    const filtered = filterBusinessHourSlots(rawSlots);
    expect(filtered).toHaveLength(3);
    expect(filtered.map((s: { startTime: string }) => s.startTime)).toEqual([
      new Date(2026, 6, 15, 9, 0, 0).toISOString(),
      new Date(2026, 6, 15, 14, 0, 0).toISOString(),
      new Date(2026, 6, 15, 18, 0, 0).toISOString(),
    ]);
  });
});

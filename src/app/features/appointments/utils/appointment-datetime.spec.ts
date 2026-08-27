import { describe, expect, it } from 'vitest';
import {
  calculateSmartDefaultTime,
  endOfLocalDay,
  endOfLocalMonth,
  filterBusinessHourSlots,
  getLocalDayDifference,
  isAfterTodayLocal,
  isSameLocalDay,
  isTomorrowLocal,
  isWithinBusinessHours,
  isWithinLocalDateRange,
  localDateTimeValueToIso,
  parseAppointmentDate,
  sortAppointmentsByScheduledAt,
  startOfLocalDay,
  startOfLocalMonth,
  toDateTimeLocalValue,
} from './appointment-datetime';

describe('appointment-datetime utils', () => {
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

  it('filters slots to business hours between 09:00 and 19:00', () => {
    const rawSlots = [
      { startTime: new Date(2026, 6, 15, 1, 0, 0).toISOString(), available: true },
      { startTime: new Date(2026, 6, 15, 8, 30, 0).toISOString(), available: true },
      { startTime: new Date(2026, 6, 15, 9, 0, 0).toISOString(), available: true },
      { startTime: new Date(2026, 6, 15, 14, 0, 0).toISOString(), available: true },
      { startTime: new Date(2026, 6, 15, 18, 30, 0).toISOString(), available: true },
      { startTime: new Date(2026, 6, 15, 19, 0, 0).toISOString(), available: true },
      { startTime: new Date(2026, 6, 15, 22, 0, 0).toISOString(), available: true },
    ];

    const filtered = filterBusinessHourSlots(rawSlots);
    expect(filtered).toHaveLength(3);
    expect(filtered.map((s: { startTime: string }) => s.startTime)).toEqual([
      new Date(2026, 6, 15, 9, 0, 0).toISOString(),
      new Date(2026, 6, 15, 14, 0, 0).toISOString(),
      new Date(2026, 6, 15, 18, 30, 0).toISOString(),
    ]);
  });
});

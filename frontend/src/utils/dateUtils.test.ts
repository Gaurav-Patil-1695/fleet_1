import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  formatDate,
  relativeDueLabel,
  isOverdue,
  isDueSoon,
  toInputDateValue,
  monthsBetween,
} from './dateUtils';

describe('formatDate', () => {
  it('returns formatted date string for a valid ISO string', () => {
    // Use a fixed date string; result is locale-dependent but should contain the year
    const result = formatDate('2025-01-15');
    expect(result).toContain('2025');
    expect(result).toContain('Jan');
  });

  it('returns em-dash for null, undefined, or empty string', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('')).toBe('—');
  });

  it('returns em-dash for an invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('—');
  });
});

describe('relativeDueLabel', () => {
  beforeEach(() => {
    // Pin "today" to 2025-06-15 midnight UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Due today" when the date is today', () => {
    const result = relativeDueLabel('2025-06-15');
    expect(result).toBe('Due today');
  });

  it('returns "Due tomorrow" when the date is one day ahead', () => {
    const result = relativeDueLabel('2025-06-16');
    expect(result).toBe('Due tomorrow');
  });

  it('returns overdue label when date is in the past', () => {
    const result = relativeDueLabel('2025-06-12'); // 3 days ago
    expect(result).toBe('Overdue by 3 days');
  });

  it('returns "Overdue by 1 day" (singular) when one day overdue', () => {
    const result = relativeDueLabel('2025-06-14');
    expect(result).toBe('Overdue by 1 day');
  });

  it('returns em-dash for null input', () => {
    expect(relativeDueLabel(null)).toBe('—');
  });
});

describe('isOverdue and isDueSoon', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('isOverdue returns true for a past date and false for a future date', () => {
    expect(isOverdue('2025-06-10')).toBe(true);
    expect(isOverdue('2025-06-20')).toBe(false);
    expect(isOverdue(null)).toBe(false);
  });

  it('isDueSoon returns true when within default 30 days and false beyond', () => {
    expect(isDueSoon('2025-06-20')).toBe(true); // 5 days away
    expect(isDueSoon('2025-07-20')).toBe(false); // 35 days away
    expect(isDueSoon('2025-06-15')).toBe(true); // today
  });
});

describe('toInputDateValue', () => {
  it('converts a Date object to YYYY-MM-DD format', () => {
    // Use UTC date to avoid timezone shifting in toInputDateValue which uses local date parts
    const d = new Date(2025, 0, 15); // Jan 15 2025 local time
    const result = toInputDateValue(d);
    expect(result).toMatch(/^2025-01-15$/);
  });

  it('returns empty string for null or undefined', () => {
    expect(toInputDateValue(null)).toBe('');
    expect(toInputDateValue(undefined)).toBe('');
    expect(toInputDateValue('')).toBe('');
  });
});

describe('monthsBetween', () => {
  it('calculates months between two dates correctly', () => {
    expect(monthsBetween('2025-01-01', '2025-07-01')).toBe(6);
    expect(monthsBetween('2024-11-01', '2025-03-01')).toBe(4);
  });

  it('returns null when either argument is null or undefined', () => {
    expect(monthsBetween(null, '2025-07-01')).toBeNull();
    expect(monthsBetween('2025-01-01', null)).toBeNull();
    expect(monthsBetween(null, null)).toBeNull();
  });
});

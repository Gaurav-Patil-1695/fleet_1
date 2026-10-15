import { describe, it, expect } from 'vitest';
import {
  formatOdometer,
  formatOdometerDelta,
  formatKmUntilService,
  isOdometerOverdue,
  parseOdometerInput,
} from './odometerUtils';

describe('formatOdometer', () => {
  it('formats a number with thousands separator and km suffix', () => {
    expect(formatOdometer(123456)).toBe('123,456 km');
  });

  it('returns em dash for null or undefined', () => {
    expect(formatOdometer(null)).toBe('—');
    expect(formatOdometer(undefined)).toBe('—');
  });
});

describe('formatOdometerDelta', () => {
  it('shows positive delta with plus sign', () => {
    expect(formatOdometerDelta(100000, 112000)).toBe('+12,000 km');
  });

  it('returns em dash when either value is null', () => {
    expect(formatOdometerDelta(null, 112000)).toBe('—');
    expect(formatOdometerDelta(100000, null)).toBe('—');
  });
});

describe('formatKmUntilService', () => {
  it('shows remaining km when not overdue', () => {
    expect(formatKmUntilService(110000, 112000)).toBe('2,000 km remaining');
  });

  it('shows overdue km when current exceeds next service', () => {
    expect(formatKmUntilService(115000, 112000)).toBe('3,000 km overdue');
  });

  it('returns em dash when either value is null', () => {
    expect(formatKmUntilService(null, 112000)).toBe('—');
  });
});

describe('isOdometerOverdue', () => {
  it('returns true when current odometer exceeds next service odometer', () => {
    expect(isOdometerOverdue(115000, 112000)).toBe(true);
  });

  it('returns false when not overdue or values are null', () => {
    expect(isOdometerOverdue(110000, 112000)).toBe(false);
    expect(isOdometerOverdue(null, 112000)).toBe(false);
  });
});

describe('parseOdometerInput', () => {
  it('parses a plain integer string', () => {
    expect(parseOdometerInput('123456')).toBe(123456);
  });

  it('strips commas and spaces before parsing', () => {
    expect(parseOdometerInput('123,456')).toBe(123456);
    expect(parseOdometerInput('123 456')).toBe(123456);
  });

  it('returns null for empty or invalid input', () => {
    expect(parseOdometerInput('')).toBeNull();
    expect(parseOdometerInput('abc')).toBeNull();
  });
});

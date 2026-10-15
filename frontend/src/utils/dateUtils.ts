/**
 * dateUtils.ts
 * Date formatting and relative-date helpers for service due display.
 */

/**
 * Format an ISO date string or Date object to a human-readable date string.
 * e.g. "15 Jan 2025"
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (value == null || value === '') return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format an ISO date string or Date object to a short date string.
 * e.g. "15/01/2025"
 */
export function formatDateShort(value: string | Date | null | undefined): string {
  if (value == null || value === '') return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format an ISO date-time string or Date object to a human-readable date + time string.
 * e.g. "15 Jan 2025, 14:30"
 */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (value == null || value === '') return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Returns the number of calendar days between today and the target date.
 * Positive = future, negative = past, 0 = today.
 */
export function daysFromToday(value: string | Date | null | undefined): number | null {
  if (value == null || value === '') return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) return null;
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const targetMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffMs = targetMidnight.getTime() - todayMidnight.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Returns a relative label suitable for service due display.
 * e.g. "Overdue by 3 days", "Due today", "Due in 5 days", "Due in 2 months"
 */
export function relativeDueLabel(value: string | Date | null | undefined): string {
  const days = daysFromToday(value);
  if (days === null) return '—';
  if (days < 0) {
    const absDays = Math.abs(days);
    if (absDays === 1) return 'Overdue by 1 day';
    return `Overdue by ${absDays} days`;
  }
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days < 14) return `Due in ${days} days`;
  if (days < 60) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? 'Due in 1 week' : `Due in ${weeks} weeks`;
  }
  const months = Math.floor(days / 30);
  return months === 1 ? 'Due in 1 month' : `Due in ${months} months`;
}

/**
 * Returns true if the given date is in the past (strictly before today midnight).
 */
export function isOverdue(value: string | Date | null | undefined): boolean {
  const days = daysFromToday(value);
  if (days === null) return false;
  return days < 0;
}

/**
 * Returns true if the given date is today or within `withinDays` calendar days.
 */
export function isDueSoon(
  value: string | Date | null | undefined,
  withinDays = 30,
): boolean {
  const days = daysFromToday(value);
  if (days === null) return false;
  return days >= 0 && days <= withinDays;
}

/**
 * Converts an ISO date string to a format suitable for an <input type="date"> value.
 * e.g. "2025-01-15"
 */
export function toInputDateValue(value: string | Date | null | undefined): string {
  if (value == null || value === '') return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the number of months between two dates (rounded down).
 * Useful for checking 6-month service intervals.
 */
export function monthsBetween(
  from: string | Date | null | undefined,
  to: string | Date | null | undefined,
): number | null {
  if (from == null || to == null) return null;
  const fromDate = typeof from === 'string' ? new Date(from) : from;
  const toDate = typeof to === 'string' ? new Date(to) : to;
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return null;
  const yearDiff = toDate.getFullYear() - fromDate.getFullYear();
  const monthDiff = toDate.getMonth() - fromDate.getMonth();
  return yearDiff * 12 + monthDiff;
}

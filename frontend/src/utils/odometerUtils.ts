/**
 * odometerUtils.ts
 * Odometer value formatting helpers for display throughout the application.
 */

/**
 * Format an odometer value in kilometres to a human-readable string.
 * e.g. 123456 -> "123,456 km"
 * Returns "—" for null/undefined values.
 */
export function formatOdometer(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${value.toLocaleString('en-GB')} km`;
}

/**
 * Format an odometer value as a plain number string with thousands separators.
 * e.g. 123456 -> "123,456"
 * Returns "—" for null/undefined values.
 */
export function formatOdometerPlain(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString('en-GB');
}

/**
 * Calculate the difference between two odometer readings in kilometres.
 * Returns null if either value is null/undefined.
 */
export function odometerDelta(
  from: number | null | undefined,
  to: number | null | undefined,
): number | null {
  if (from == null || to == null) return null;
  return to - from;
}

/**
 * Format the delta between two odometer readings as a human-readable string.
 * e.g. odometerDeltaLabel(100000, 112000) -> "+12,000 km"
 * Returns "—" if either value is null/undefined.
 */
export function formatOdometerDelta(
  from: number | null | undefined,
  to: number | null | undefined,
): string {
  const delta = odometerDelta(from, to);
  if (delta == null) return '—';
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toLocaleString('en-GB')} km`;
}

/**
 * Calculate how many kilometres remain until the next service is due.
 * Returns null if either value is null/undefined.
 */
export function kmUntilService(
  currentOdometer: number | null | undefined,
  nextServiceOdometer: number | null | undefined,
): number | null {
  if (currentOdometer == null || nextServiceOdometer == null) return null;
  return nextServiceOdometer - currentOdometer;
}

/**
 * Format the remaining kilometres until service as a human-readable string.
 * Negative values indicate overdue by that many km.
 * e.g. formatKmUntilService(110000, 112000) -> "2,000 km remaining"
 *      formatKmUntilService(115000, 112000) -> "3,000 km overdue"
 * Returns "—" if either value is null/undefined.
 */
export function formatKmUntilService(
  currentOdometer: number | null | undefined,
  nextServiceOdometer: number | null | undefined,
): string {
  const remaining = kmUntilService(currentOdometer, nextServiceOdometer);
  if (remaining == null) return '—';
  if (remaining < 0) {
    return `${Math.abs(remaining).toLocaleString('en-GB')} km overdue`;
  }
  if (remaining === 0) {
    return 'Due now';
  }
  return `${remaining.toLocaleString('en-GB')} km remaining`;
}

/**
 * Returns true if the vehicle is overdue for service based on odometer.
 * Returns false if either value is null/undefined.
 */
export function isOdometerOverdue(
  currentOdometer: number | null | undefined,
  nextServiceOdometer: number | null | undefined,
): boolean {
  const remaining = kmUntilService(currentOdometer, nextServiceOdometer);
  if (remaining == null) return false;
  return remaining < 0;
}

/**
 * Returns true if the vehicle is due for service soon (within `withinKm` kilometres).
 * Returns false if either value is null/undefined.
 */
export function isOdometerDueSoon(
  currentOdometer: number | null | undefined,
  nextServiceOdometer: number | null | undefined,
  withinKm = 1000,
): boolean {
  const remaining = kmUntilService(currentOdometer, nextServiceOdometer);
  if (remaining == null) return false;
  return remaining >= 0 && remaining <= withinKm;
}

/**
 * Parse a user-entered odometer string (may include commas or spaces) into a number.
 * Returns null if the string cannot be parsed as a valid positive integer.
 */
export function parseOdometerInput(value: string): number | null {
  if (!value || value.trim() === '') return null;
  const cleaned = value.replace(/[,\s]/g, '');
  const parsed = parseInt(cleaned, 10);
  if (isNaN(parsed) || parsed < 0) return null;
  return parsed;
}

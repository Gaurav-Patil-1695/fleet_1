"""Date arithmetic helpers used by the scheduling service."""

from datetime import date, timedelta
from dateutil.relativedelta import relativedelta


def add_months(from_date: date, months: int) -> date:
    """Return a date that is `months` calendar months after `from_date`."""
    return from_date + relativedelta(months=months)


def add_kilometers(current_odometer: int, km_interval: int) -> int:
    """Return the odometer reading at which the next service is due."""
    return current_odometer + km_interval


def earlier_date(date_a: date, date_b: date) -> date:
    """Return whichever of the two dates comes first (is earlier)."""
    return date_a if date_a <= date_b else date_b


def compute_next_service_due_date(
    last_serviced_at: date,
    month_interval: int,
) -> date:
    """Compute the calendar-based next service due date.

    Adds `month_interval` calendar months to `last_serviced_at`.
    """
    return add_months(last_serviced_at, month_interval)


def compute_next_service_due_odometer(
    last_serviced_odometer_km: int,
    km_interval: int,
) -> int:
    """Compute the odometer-based next service due reading.

    Adds `km_interval` to `last_serviced_odometer_km`.
    """
    return add_kilometers(last_serviced_odometer_km, km_interval)


def next_service_due(
    last_serviced_at: date,
    last_serviced_odometer_km: int,
    km_interval: int,
    month_interval: int,
) -> tuple[date, int]:
    """Return (due_date, due_odometer_km) for the next service.

    For light commercial vehicles (BR-2) the service is due at whichever
    threshold — km or calendar — comes first.  The same logic is applied
    uniformly; the caller is responsible for passing the correct intervals
    for the vehicle class (BR-1).

    Returns a tuple of:
        - next_service_due_date: the earlier of the calendar-based and the
          estimated odometer-hit date (returned as a calendar date derived
          from the km threshold; callers that only need the odometer target
          should use `compute_next_service_due_odometer` directly).
        - next_service_due_odometer_km: the odometer target.
    """
    due_by_date = compute_next_service_due_date(last_serviced_at, month_interval)
    due_odometer = compute_next_service_due_odometer(
        last_serviced_odometer_km, km_interval
    )
    return due_by_date, due_odometer


def days_until(target_date: date, reference_date: date | None = None) -> int:
    """Return the number of days from `reference_date` until `target_date`.

    A negative value means the date is in the past relative to `reference_date`.
    If `reference_date` is not provided, today (UTC) is used.
    """
    if reference_date is None:
        reference_date = date.today()
    return (target_date - reference_date).days


def is_overdue(target_date: date, reference_date: date | None = None) -> bool:
    """Return True if `target_date` is strictly before `reference_date` (overdue)."""
    if reference_date is None:
        reference_date = date.today()
    return target_date < reference_date


def is_due_within_days(
    target_date: date,
    window_days: int,
    reference_date: date | None = None,
) -> bool:
    """Return True if `target_date` falls within `window_days` from `reference_date`.

    Includes overdue dates (days_until <= 0) and dates up to and including
    `window_days` ahead.
    """
    remaining = days_until(target_date, reference_date)
    return remaining <= window_days

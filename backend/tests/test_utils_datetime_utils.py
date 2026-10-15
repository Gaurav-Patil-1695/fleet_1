"""Smoke tests for app.utils.datetime_utils."""

from datetime import date

import pytest

from app.utils.datetime_utils import (
    add_months,
    add_kilometers,
    earlier_date,
    compute_next_service_due_date,
    compute_next_service_due_odometer,
    next_service_due,
    days_until,
    is_overdue,
    is_due_within_days,
)


def test_add_months_crosses_year_boundary():
    """Adding months should handle month/year rollovers correctly."""
    result = add_months(date(2024, 11, 15), 3)
    assert result == date(2025, 2, 15)


def test_add_months_end_of_month_clamping():
    """Adding months to January 31 should clamp to Feb 28 in a non-leap year."""
    result = add_months(date(2023, 1, 31), 1)
    assert result == date(2023, 2, 28)


def test_next_service_due_returns_date_and_odometer():
    """next_service_due returns a (date, int) tuple with correct values."""
    last_serviced_at = date(2024, 1, 1)
    last_odometer = 50_000
    km_interval = 10_000
    month_interval = 6

    due_date, due_odometer = next_service_due(
        last_serviced_at, last_odometer, km_interval, month_interval
    )

    assert due_date == date(2024, 7, 1)
    assert due_odometer == 60_000


def test_earlier_date_picks_the_smaller_date():
    """earlier_date should return the chronologically earlier date."""
    date_a = date(2024, 3, 1)
    date_b = date(2024, 6, 1)
    assert earlier_date(date_a, date_b) == date_a
    assert earlier_date(date_b, date_a) == date_a


def test_days_until_positive_and_negative():
    """days_until returns positive for future dates, negative for past dates."""
    ref = date(2024, 6, 15)
    assert days_until(date(2024, 6, 20), ref) == 5
    assert days_until(date(2024, 6, 10), ref) == -5
    assert days_until(ref, ref) == 0


def test_is_overdue_and_is_due_within_days():
    """is_overdue and is_due_within_days behave correctly relative to a reference date."""
    ref = date(2024, 6, 15)
    past = date(2024, 6, 10)
    future_near = date(2024, 6, 20)
    future_far = date(2024, 7, 20)

    assert is_overdue(past, ref) is True
    assert is_overdue(future_near, ref) is False

    # Within 10 days window: past dates and near-future dates qualify
    assert is_due_within_days(past, 10, ref) is True
    assert is_due_within_days(future_near, 10, ref) is True
    assert is_due_within_days(future_far, 10, ref) is False

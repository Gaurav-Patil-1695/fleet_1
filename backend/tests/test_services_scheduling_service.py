"""Unit tests for app.services.scheduling_service."""
from datetime import date
from unittest.mock import patch, MagicMock

import pytest

from app.services.scheduling_service import calculate_next_service_due


# ---------------------------------------------------------------------------
# Helper constants
# ---------------------------------------------------------------------------
LAST_SERVICED_AT = date(2024, 1, 1)
LAST_ODO = 50_000
KM_INTERVAL = 10_000
MONTH_INTERVAL = 6


# ---------------------------------------------------------------------------
# 1. Both anchors provided – delegates to next_service_due
# ---------------------------------------------------------------------------
def test_both_anchors_delegates_to_next_service_due():
    """When both last_serviced_at and last_serviced_odometer_km are given,
    the function calls next_service_due and returns its result."""
    expected_date = date(2024, 7, 1)
    expected_odo = 60_000

    with patch(
        "app.services.scheduling_service.next_service_due",
        return_value=(expected_date, expected_odo),
    ) as mock_nsd:
        result = calculate_next_service_due(
            last_serviced_at=LAST_SERVICED_AT,
            last_serviced_odometer_km=LAST_ODO,
            km_interval=KM_INTERVAL,
            month_interval=MONTH_INTERVAL,
        )

    mock_nsd.assert_called_once_with(
        last_serviced_at=LAST_SERVICED_AT,
        last_serviced_odometer_km=LAST_ODO,
        km_interval=KM_INTERVAL,
        month_interval=MONTH_INTERVAL,
    )
    assert result == (expected_date, expected_odo)


# ---------------------------------------------------------------------------
# 2. Only date anchor – computes due date, odometer is None
# ---------------------------------------------------------------------------
def test_only_date_anchor_returns_due_date_and_none_odometer():
    """When only last_serviced_at is provided, compute_next_service_due_date
    is called and the odometer component is None."""
    expected_date = date(2024, 7, 1)

    with patch(
        "app.services.scheduling_service.compute_next_service_due_date",
        return_value=expected_date,
    ) as mock_date, patch(
        "app.services.scheduling_service.compute_next_service_due_odometer"
    ) as mock_odo:
        result = calculate_next_service_due(
            last_serviced_at=LAST_SERVICED_AT,
            last_serviced_odometer_km=None,
            km_interval=KM_INTERVAL,
            month_interval=MONTH_INTERVAL,
        )

    mock_date.assert_called_once_with(
        last_serviced_at=LAST_SERVICED_AT,
        month_interval=MONTH_INTERVAL,
    )
    mock_odo.assert_not_called()
    assert result == (expected_date, None)


# ---------------------------------------------------------------------------
# 3. Only odometer anchor – computes due odometer, date is None
# ---------------------------------------------------------------------------
def test_only_odometer_anchor_returns_none_date_and_due_odometer():
    """When only last_serviced_odometer_km is provided,
    compute_next_service_due_odometer is called and the date component is None."""
    expected_odo = 60_000

    with patch(
        "app.services.scheduling_service.compute_next_service_due_odometer",
        return_value=expected_odo,
    ) as mock_odo, patch(
        "app.services.scheduling_service.compute_next_service_due_date"
    ) as mock_date:
        result = calculate_next_service_due(
            last_serviced_at=None,
            last_serviced_odometer_km=LAST_ODO,
            km_interval=KM_INTERVAL,
            month_interval=MONTH_INTERVAL,
        )

    mock_odo.assert_called_once_with(
        last_serviced_odometer_km=LAST_ODO,
        km_interval=KM_INTERVAL,
    )
    mock_date.assert_not_called()
    assert result == (None, expected_odo)


# ---------------------------------------------------------------------------
# 4. Neither anchor provided – returns (None, None)
# ---------------------------------------------------------------------------
def test_neither_anchor_returns_none_none():
    """When both anchors are None, returns (None, None) without calling helpers."""
    with patch(
        "app.services.scheduling_service.next_service_due"
    ) as mock_nsd, patch(
        "app.services.scheduling_service.compute_next_service_due_date"
    ) as mock_date, patch(
        "app.services.scheduling_service.compute_next_service_due_odometer"
    ) as mock_odo:
        result = calculate_next_service_due(
            last_serviced_at=None,
            last_serviced_odometer_km=None,
            km_interval=KM_INTERVAL,
            month_interval=MONTH_INTERVAL,
        )

    mock_nsd.assert_not_called()
    mock_date.assert_not_called()
    mock_odo.assert_not_called()
    assert result == (None, None)


# ---------------------------------------------------------------------------
# 5. Return type is always a 2-tuple
# ---------------------------------------------------------------------------
def test_return_type_is_tuple_of_two():
    """The return value is always a 2-tuple regardless of input combination."""
    with patch(
        "app.services.scheduling_service.next_service_due",
        return_value=(date(2024, 7, 1), 60_000),
    ):
        result = calculate_next_service_due(
            last_serviced_at=LAST_SERVICED_AT,
            last_serviced_odometer_km=LAST_ODO,
            km_interval=KM_INTERVAL,
            month_interval=MONTH_INTERVAL,
        )
    assert isinstance(result, tuple)
    assert len(result) == 2


# ---------------------------------------------------------------------------
# 6. km_interval and month_interval are forwarded correctly to helpers
# ---------------------------------------------------------------------------
def test_intervals_forwarded_to_next_service_due():
    """km_interval and month_interval values are forwarded unchanged to
    the underlying utility next_service_due."""
    km = 5_000
    months = 3

    with patch(
        "app.services.scheduling_service.next_service_due",
        return_value=(date(2024, 4, 1), 55_000),
    ) as mock_nsd:
        calculate_next_service_due(
            last_serviced_at=LAST_SERVICED_AT,
            last_serviced_odometer_km=LAST_ODO,
            km_interval=km,
            month_interval=months,
        )

    _, kwargs = mock_nsd.call_args
    assert kwargs["km_interval"] == km
    assert kwargs["month_interval"] == months


# ---------------------------------------------------------------------------
# 7. Both anchors with zero-interval edge values
# ---------------------------------------------------------------------------
def test_zero_intervals_both_anchors():
    """Zero intervals are forwarded without error; the utility determines the result."""
    expected = (date(2024, 1, 1), 50_000)
    with patch(
        "app.services.scheduling_service.next_service_due",
        return_value=expected,
    ):
        result = calculate_next_service_due(
            last_serviced_at=LAST_SERVICED_AT,
            last_serviced_odometer_km=LAST_ODO,
            km_interval=0,
            month_interval=0,
        )
    assert result == expected


# ---------------------------------------------------------------------------
# 8. Only odometer anchor – km_interval forwarded correctly
# ---------------------------------------------------------------------------
def test_km_interval_forwarded_to_odometer_helper():
    """km_interval is forwarded to compute_next_service_due_odometer."""
    km = 15_000

    with patch(
        "app.services.scheduling_service.compute_next_service_due_odometer",
        return_value=LAST_ODO + km,
    ) as mock_odo:
        result = calculate_next_service_due(
            last_serviced_at=None,
            last_serviced_odometer_km=LAST_ODO,
            km_interval=km,
            month_interval=MONTH_INTERVAL,
        )

    _, kwargs = mock_odo.call_args
    assert kwargs["km_interval"] == km
    assert result == (None, LAST_ODO + km)

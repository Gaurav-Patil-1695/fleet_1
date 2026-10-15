from datetime import date
from typing import Optional

from app.utils.datetime_utils import (
    compute_next_service_due_date,
    compute_next_service_due_odometer,
    next_service_due,
)


def calculate_next_service_due(
    last_serviced_at: Optional[date],
    last_serviced_odometer_km: Optional[int],
    km_interval: int,
    month_interval: int,
) -> tuple[Optional[date], Optional[int]]:
    """Calculate next_service_due_date and next_service_due_odometer.

    Returns a tuple of (next_service_due_date, next_service_due_odometer_km).
    Chooses whichever threshold (date or odometer) falls first.

    If both last_serviced_at and last_serviced_odometer_km are provided,
    both due values are computed and the earliest date is selected.
    If only one anchor is available, the corresponding due value is returned.
    If neither is available, (None, None) is returned.
    """
    if last_serviced_at is None and last_serviced_odometer_km is None:
        return None, None

    if last_serviced_at is not None and last_serviced_odometer_km is not None:
        due_date, due_odometer = next_service_due(
            last_serviced_at=last_serviced_at,
            last_serviced_odometer_km=last_serviced_odometer_km,
            km_interval=km_interval,
            month_interval=month_interval,
        )
        return due_date, due_odometer

    if last_serviced_at is not None:
        due_date = compute_next_service_due_date(
            last_serviced_at=last_serviced_at,
            month_interval=month_interval,
        )
        return due_date, None

    # last_serviced_odometer_km is not None
    due_odometer = compute_next_service_due_odometer(
        last_serviced_odometer_km=last_serviced_odometer_km,
        km_interval=km_interval,
    )
    return None, due_odometer

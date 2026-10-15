"""MockOdometerProvider — returns deterministic simulated readings.

Selected when TELEMATICS_MODE=mock. Does not make any network calls and
returns stable, schema-valid data suitable for automated tests.
"""

from datetime import datetime, timezone
from typing import List

from app.modules.telematics.providers import OdometerProvider, OdometerReading

# Base odometer value used to derive deterministic readings per vehicle.
_BASE_ODOMETER_KM = 50_000

# Fixed reference timestamp so readings are deterministic across runs.
_FIXED_TIMESTAMP = datetime(2024, 1, 15, 8, 0, 0, tzinfo=timezone.utc)


def _deterministic_odometer(vehicle_id: str) -> int:
    """Derive a deterministic odometer value from the vehicle_id string.

    Uses the sum of character ordinal values modulo 50 000 added to a base
    value so every vehicle_id always maps to the same reading.
    """
    checksum = sum(ord(c) for c in vehicle_id)
    return _BASE_ODOMETER_KM + (checksum % 50_000)


class MockOdometerProvider(OdometerProvider):
    """Deterministic mock implementation of OdometerProvider.

    Returns simulated odometer readings without any network I/O.  The
    readings are derived solely from the supplied vehicle_id values, so
    the same inputs always produce the same outputs — safe for unit and
    integration tests.

    Selected automatically by the factory when TELEMATICS_MODE=mock.
    Application code must not import this class directly; use the factory.
    """

    async def fetch_readings(self, vehicle_ids: List[str]) -> List[OdometerReading]:
        """Return one deterministic OdometerReading per supplied vehicle_id.

        Args:
            vehicle_ids: A list of vehicle identifiers for which readings
                         should be returned.

        Returns:
            A list of OdometerReading instances, exactly one per entry in
            ``vehicle_ids``, with stable values derived from the identifier.
        """
        readings: List[OdometerReading] = []
        for vehicle_id in vehicle_ids:
            odometer_km = _deterministic_odometer(vehicle_id)
            raw_payload = {
                "vehicle_id": vehicle_id,
                "odometer_km": odometer_km,
                "source": "telematics_mock",
                "timestamp": _FIXED_TIMESTAMP.isoformat(),
            }
            readings.append(
                OdometerReading(
                    vehicle_id=vehicle_id,
                    odometer_km=odometer_km,
                    reading_timestamp=_FIXED_TIMESTAMP,
                    raw_payload=raw_payload,
                )
            )
        return readings


__all__ = ["MockOdometerProvider"]

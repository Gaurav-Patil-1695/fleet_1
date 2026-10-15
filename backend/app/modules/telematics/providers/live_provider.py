"""LiveOdometerProvider — calls the real telematics HTTP endpoint.

Selected when TELEMATICS_MODE=live. Uses TELEMATICS_LIVE_BASE_URL,
TELEMATICS_API_KEY, and TELEMATICS_REQUEST_TIMEOUT_SECONDS from the
application settings to communicate with the external telematics service.

Application code must not import this class directly; always obtain a
provider through the factory.
"""

import logging
from typing import List

import httpx

from app.config import settings
from app.modules.telematics.providers import OdometerProvider, OdometerReading
from app.utils.datetime_utils import add_months  # noqa: F401 — imported for consistency; not used here

logger = logging.getLogger(__name__)


class LiveOdometerProvider(OdometerProvider):
    """Live implementation of OdometerProvider.

    Fetches real odometer readings from the external telematics HTTP
    endpoint configured via environment variables:

    - TELEMATICS_LIVE_BASE_URL: Base URL of the telematics REST API.
    - TELEMATICS_API_KEY: API key sent as a Bearer token.
    - TELEMATICS_REQUEST_TIMEOUT_SECONDS: Per-request HTTP timeout.

    Selected automatically by the factory when TELEMATICS_MODE=live.
    Application code must not import this class directly; use the factory.
    """

    def __init__(self) -> None:
        self._base_url: str = str(settings.TELEMATICS_LIVE_BASE_URL).rstrip("/")
        self._api_key: str = settings.TELEMATICS_API_KEY
        self._timeout: float = float(settings.TELEMATICS_REQUEST_TIMEOUT_SECONDS)

    async def fetch_readings(self, vehicle_ids: List[str]) -> List[OdometerReading]:
        """Fetch the latest odometer readings from the live telematics endpoint.

        Sends a POST request to ``{TELEMATICS_LIVE_BASE_URL}/readings/bulk``
        with the list of vehicle identifiers and parses the response into
        OdometerReading instances.

        The expected response body is a JSON object with a top-level
        ``readings`` array, where each element contains at minimum:

        .. code-block:: json

            {
                "vehicle_id": "<str>",
                "odometer_km": <int>,
                "reading_timestamp": "<ISO-8601 datetime string>"
            }

        Any additional fields are preserved in ``raw_payload``.

        Args:
            vehicle_ids: A list of vehicle identifiers for which readings
                         should be retrieved.

        Returns:
            A list of OdometerReading instances for vehicles where the
            provider returned data.  May be shorter than ``vehicle_ids``
            if the provider has no data for some vehicles.

        Raises:
            httpx.HTTPStatusError: If the telematics endpoint returns a
                non-2xx HTTP status.
            httpx.RequestError: On any transport-level failure (timeout,
                DNS, connection refused, etc.).
            KeyError: If an individual reading entry is missing a required
                field; the entry is skipped and the error is logged.
        """
        if not vehicle_ids:
            return []

        url = f"{self._base_url}/readings/bulk"
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        payload = {"vehicle_ids": vehicle_ids}

        logger.debug(
            "LiveOdometerProvider: fetching readings for %d vehicle(s) from %s",
            len(vehicle_ids),
            url,
        )

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

        raw_readings: List[dict] = data.get("readings", [])
        readings: List[OdometerReading] = []

        for entry in raw_readings:
            try:
                vehicle_id: str = entry["vehicle_id"]
                odometer_km: int = int(entry["odometer_km"])
                reading_timestamp_raw: str = entry["reading_timestamp"]

                # Parse the ISO-8601 timestamp; httpx guarantees UTF-8 JSON.
                from datetime import datetime, timezone  # local import to avoid shadowing

                reading_timestamp = datetime.fromisoformat(
                    reading_timestamp_raw.replace("Z", "+00:00")
                )
                if reading_timestamp.tzinfo is None:
                    reading_timestamp = reading_timestamp.replace(tzinfo=timezone.utc)

                readings.append(
                    OdometerReading(
                        vehicle_id=vehicle_id,
                        odometer_km=odometer_km,
                        reading_timestamp=reading_timestamp,
                        raw_payload=entry,
                    )
                )
            except (KeyError, ValueError, TypeError) as exc:
                logger.error(
                    "LiveOdometerProvider: skipping malformed reading entry %r — %s",
                    entry,
                    exc,
                )

        logger.debug(
            "LiveOdometerProvider: received %d valid reading(s) from telematics endpoint.",
            len(readings),
        )
        return readings


__all__ = ["LiveOdometerProvider"]

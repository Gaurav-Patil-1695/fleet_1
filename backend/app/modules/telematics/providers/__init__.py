"""OdometerProvider abstract base class — all telematics provider implementations
must satisfy this interface."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


@dataclass
class OdometerReading:
    """A single odometer reading returned by any provider implementation."""

    vehicle_id: str
    odometer_km: int
    reading_timestamp: datetime
    raw_payload: dict


class OdometerProvider(ABC):
    """Abstract interface for telematics odometer providers.

    All concrete providers (mock, live) must implement this interface.
    Application code must never import LiveProvider or MockProvider directly;
    always obtain a provider through the factory.
    """

    @abstractmethod
    async def fetch_readings(self, vehicle_ids: list[str]) -> list[OdometerReading]:
        """Fetch the latest odometer readings for the given vehicle identifiers.

        Args:
            vehicle_ids: A list of vehicle identifiers (registration numbers or
                         internal IDs) for which readings should be retrieved.

        Returns:
            A list of OdometerReading instances, one per vehicle where a
            reading could be obtained.  The list may be shorter than
            ``vehicle_ids`` if the provider has no data for some vehicles.

        Raises:
            Exception: Any provider-specific exception on transport or
                       parse failure; callers should handle generically.
        """
        ...


__all__ = ["OdometerProvider", "OdometerReading"]

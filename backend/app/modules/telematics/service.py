import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.modules.telematics.providers.factory import get_provider
from app.modules.telematics.schemas import (
    TelematicsIngestRequest,
    TelematicsIngestResponse,
    TelematicsIngestError,
)
from app.repositories.reading_repository import ReadingRepository
from app.repositories.vehicle_repository import VehicleRepository
from app.services.scheduling_service import calculate_next_service_due

logger = logging.getLogger(__name__)


class TelematicsService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._reading_repo = ReadingRepository(db)
        self._vehicle_repo = VehicleRepository(db)

    async def ingest_readings(
        self,
        request: TelematicsIngestRequest,
        current_user: User,
    ) -> TelematicsIngestResponse:
        provider = get_provider()
        is_mock = provider.__class__.__name__ == "MockOdometerProvider"
        source = "telematics_mock" if is_mock else "telematics"

        accepted = 0
        rejected = 0
        errors: list[TelematicsIngestError] = []

        for item in request.readings:
            vehicle_id: UUID = item.vehicle_id
            try:
                vehicle = await self._vehicle_repo.get_by_id(vehicle_id)
                if vehicle is None:
                    raise ValueError(f"Vehicle {vehicle_id} not found.")

                reading_data = {
                    "vehicle_id": vehicle_id,
                    "recorded_by_user_id": None,
                    "odometer_km": item.odometer_km,
                    "source": source,
                    "is_test_mode": is_mock,
                    "raw_payload": item.raw_payload,
                    "reading_timestamp": item.reading_timestamp,
                }

                reading = await self._reading_repo.create(reading_data)

                update_fields: dict = {
                    "last_known_odometer_km": item.odometer_km,
                    "last_odometer_recorded_at": item.reading_timestamp,
                }

                next_service = calculate_next_service_due(
                    vehicle=vehicle,
                    new_odometer_km=item.odometer_km,
                    reading_timestamp=item.reading_timestamp,
                )
                if next_service is not None:
                    due_date, due_odometer = next_service
                    update_fields["next_service_due_date"] = due_date
                    update_fields["next_service_due_odometer_km"] = due_odometer

                await self._vehicle_repo.update(vehicle_id, update_fields)

                accepted += 1
                logger.debug(
                    "Telematics reading accepted for vehicle %s: %s km",
                    vehicle_id,
                    item.odometer_km,
                )

            except Exception as exc:  # noqa: BLE001 — broad catch to isolate per-reading failures
                rejected += 1
                reason = str(exc)
                logger.warning(
                    "Telematics reading rejected for vehicle %s: %s",
                    vehicle_id,
                    reason,
                )
                errors.append(
                    TelematicsIngestError(
                        vehicle_id=vehicle_id,
                        reason=reason,
                    )
                )

        return TelematicsIngestResponse(
            accepted=accepted,
            rejected=rejected,
            errors=errors,
        )

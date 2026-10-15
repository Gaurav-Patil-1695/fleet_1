import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.modules.readings.schemas import ReadingCreate, ReadingListResponse, ReadingRead, Pagination
from app.repositories.reading_repository import ReadingRepository
from app.repositories.vehicle_repository import VehicleRepository
from app.services.scheduling_service import calculate_next_service_due

logger = logging.getLogger(__name__)


class ReadingService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._reading_repo = ReadingRepository(db)
        self._vehicle_repo = VehicleRepository(db)

    async def list_readings(
        self,
        vehicle_id: Optional[UUID] = None,
        source: Optional[str] = None,
        is_test_mode: Optional[bool] = None,
        from_: Optional[str] = None,
        to: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> ReadingListResponse:
        from_dt: Optional[datetime] = None
        to_dt: Optional[datetime] = None

        if from_:
            try:
                from_dt = datetime.fromisoformat(from_.replace("Z", "+00:00"))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"code": "INVALID_DATE", "message": "'from' must be a valid date-time value."},
                )

        if to:
            try:
                to_dt = datetime.fromisoformat(to.replace("Z", "+00:00"))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"code": "INVALID_DATE", "message": "'to' must be a valid date-time value."},
                )

        readings, total_items = await self._reading_repo.list_readings(
            vehicle_id=vehicle_id,
            source=source,
            is_test_mode=is_test_mode,
            from_dt=from_dt,
            to_dt=to_dt,
            page=page,
            page_size=page_size,
        )

        import math
        total_pages = max(1, math.ceil(total_items / page_size)) if total_items > 0 else 1

        return ReadingListResponse(
            data=[ReadingRead.model_validate(r) for r in readings],
            pagination=Pagination(
                page=page,
                page_size=page_size,
                total_items=total_items,
                total_pages=total_pages,
            ),
        )

    async def create_reading(
        self,
        body: ReadingCreate,
        current_user: User,
    ) -> ReadingRead:
        # Validate vehicle exists
        vehicle = await self._vehicle_repo.get_by_id(body.vehicle_id)
        if vehicle is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "VEHICLE_NOT_FOUND", "message": "Vehicle not found."},
            )

        # Enforce: manual readings must have a recorded_by_user_id
        recorded_by_user_id: Optional[UUID] = None
        if body.source == "manual":
            recorded_by_user_id = current_user.id

        # Determine is_test_mode
        is_test_mode = body.is_test_mode if body.is_test_mode is not None else False

        # Source stored in DB: manual -> manual, telematics -> telematics (or telematics_mock if test mode)
        stored_source = body.source
        if body.source == "telematics" and is_test_mode:
            stored_source = "telematics_mock"

        reading = await self._reading_repo.create(
            vehicle_id=body.vehicle_id,
            recorded_by_user_id=recorded_by_user_id,
            odometer_km=body.odometer_km,
            source=stored_source,
            is_test_mode=is_test_mode,
            raw_payload=body.raw_payload,
            reading_timestamp=body.reading_timestamp,
        )

        # Update vehicle's latest known odometer if this reading is newer
        try:
            await self._update_vehicle_odometer(vehicle, reading)
        except Exception as exc:
            logger.error("Failed to update vehicle odometer after reading creation: %s", exc)

        return ReadingRead.model_validate(reading)

    async def _update_vehicle_odometer(self, vehicle, reading) -> None:
        """
        Update vehicle's last_known_odometer_km and last_odometer_recorded_at
        if the new reading is more recent than what is stored, then recalculate
        the next service due date and odometer via the scheduling service.
        """
        should_update = (
            vehicle.last_odometer_recorded_at is None
            or reading.reading_timestamp > vehicle.last_odometer_recorded_at
        )

        if not should_update:
            return

        update_data = {
            "last_known_odometer_km": float(reading.odometer_km),
            "last_odometer_recorded_at": reading.reading_timestamp,
        }

        # Invoke scheduling service to recalculate next service due
        try:
            next_service = await calculate_next_service_due(
                db=self._db,
                vehicle=vehicle,
                current_odometer_km=float(reading.odometer_km),
                reading_date=reading.reading_timestamp,
            )
            if next_service is not None:
                if next_service.get("next_service_due_date") is not None:
                    update_data["next_service_due_date"] = next_service["next_service_due_date"]
                if next_service.get("next_service_due_odometer_km") is not None:
                    update_data["next_service_due_odometer_km"] = next_service["next_service_due_odometer_km"]
        except Exception as exc:
            logger.error("Scheduling service failed for vehicle %s: %s", vehicle.id, exc)

        await self._vehicle_repo.update(vehicle.id, update_data)

    async def get_reading(self, reading_id: UUID) -> ReadingRead:
        reading = await self._reading_repo.get_by_id(reading_id)
        if reading is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "READING_NOT_FOUND", "message": "Reading not found."},
            )
        return ReadingRead.model_validate(reading)

import logging
import math
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.schedule import Schedule as ScheduleModel
from app.models.vehicle import Vehicle as VehicleModel
from app.modules.schedules.schemas import (
    Pagination,
    Schedule,
    ScheduleCreate,
    ScheduleListResponse,
    ScheduleUpdate,
)
from app.repositories.schedule_repository import ScheduleRepository
from app.repositories.vehicle_repository import VehicleRepository
from app.services.scheduling_service import calculate_next_service_due

logger = logging.getLogger(__name__)


class ScheduleService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._schedule_repo = ScheduleRepository(db)
        self._vehicle_repo = VehicleRepository(db)

    async def list_schedules(
        self,
        page: int,
        limit: int,
        vehicle_type_id: str | None,
        vehicle_class: str | None,
        is_active: bool | None,
    ) -> ScheduleListResponse:
        stmt = select(ScheduleModel)

        if vehicle_type_id is not None:
            try:
                vt_uuid = UUID(vehicle_type_id)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "code": "INVALID_UUID",
                        "message": "Vehicle type ID must be a valid UUID.",
                    },
                )
            stmt = stmt.where(ScheduleModel.vehicle_type_id == vt_uuid)

        if vehicle_class is not None:
            stmt = stmt.where(ScheduleModel.vehicle_class == vehicle_class)

        if is_active is not None:
            stmt = stmt.where(ScheduleModel.is_active == is_active)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        count_result = await self._db.execute(count_stmt)
        total_items = count_result.scalar_one()

        offset = (page - 1) * limit
        stmt = (
            stmt.order_by(ScheduleModel.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self._db.execute(stmt)
        rows = result.scalars().all()

        total_pages = max(1, math.ceil(total_items / limit)) if total_items else 1

        return ScheduleListResponse(
            data=[Schedule.model_validate(row) for row in rows],
            pagination=Pagination(
                page=page,
                page_size=limit,
                total_items=total_items,
                total_pages=total_pages,
            ),
        )

    async def create_schedule(self, body: ScheduleCreate) -> Schedule:
        # Check for duplicate active schedule for the same vehicle_type_id
        if body.is_active is None or body.is_active is True:
            existing_stmt = select(ScheduleModel).where(
                ScheduleModel.vehicle_type_id == body.vehicle_type_id,
                ScheduleModel.is_active == True,  # noqa: E712
            )
            existing_result = await self._db.execute(existing_stmt)
            existing = existing_result.scalar_one_or_none()
            if existing is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "code": "CONFLICT",
                        "message": (
                            "An active schedule already exists for this vehicle type."
                        ),
                    },
                )

        new_schedule = ScheduleModel(
            vehicle_type_id=body.vehicle_type_id,
            vehicle_class=body.vehicle_class,
            km_interval=body.km_interval,
            month_interval=body.month_interval,
            is_active=body.is_active if body.is_active is not None else True,
        )
        self._db.add(new_schedule)
        await self._db.flush()
        await self._db.refresh(new_schedule)

        # Trigger recalculation for all vehicles of this vehicle type
        await self._recalculate_vehicles_for_type(
            vehicle_type_id=body.vehicle_type_id,
            km_interval=new_schedule.km_interval,
            month_interval=new_schedule.month_interval,
        )

        await self._db.commit()
        await self._db.refresh(new_schedule)

        return Schedule.model_validate(new_schedule)

    async def get_schedule(self, schedule_id: UUID) -> Schedule | None:
        stmt = select(ScheduleModel).where(ScheduleModel.id == schedule_id)
        result = await self._db.execute(stmt)
        row = result.scalar_one_or_none()
        if row is None:
            return None
        return Schedule.model_validate(row)

    async def update_schedule(
        self, schedule_id: UUID, body: ScheduleUpdate
    ) -> Schedule | None:
        stmt = select(ScheduleModel).where(ScheduleModel.id == schedule_id)
        result = await self._db.execute(stmt)
        row = result.scalar_one_or_none()
        if row is None:
            return None

        # If activating this schedule, check for conflicts
        if body.is_active is True and not row.is_active:
            conflict_stmt = select(ScheduleModel).where(
                ScheduleModel.vehicle_type_id == row.vehicle_type_id,
                ScheduleModel.is_active == True,  # noqa: E712
                ScheduleModel.id != schedule_id,
            )
            conflict_result = await self._db.execute(conflict_stmt)
            conflict = conflict_result.scalar_one_or_none()
            if conflict is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "code": "CONFLICT",
                        "message": (
                            "An active schedule already exists for this vehicle type."
                        ),
                    },
                )

        update_data = body.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(row, field, value)

        await self._db.flush()
        await self._db.refresh(row)

        # Trigger recalculation for all vehicles of this vehicle type
        await self._recalculate_vehicles_for_type(
            vehicle_type_id=row.vehicle_type_id,
            km_interval=row.km_interval,
            month_interval=row.month_interval,
        )

        await self._db.commit()
        await self._db.refresh(row)

        return Schedule.model_validate(row)

    async def delete_schedule(self, schedule_id: UUID) -> bool:
        stmt = select(ScheduleModel).where(ScheduleModel.id == schedule_id)
        result = await self._db.execute(stmt)
        row = result.scalar_one_or_none()
        if row is None:
            return False

        # Check if any vehicles are associated through vehicle_type_id that
        # depend on this. If there are vehicles using this vehicle type,
        # raise 409.
        vehicles_stmt = select(func.count()).select_from(VehicleModel).where(
            VehicleModel.vehicle_type_id == row.vehicle_type_id
        )
        vehicles_result = await self._db.execute(vehicles_stmt)
        vehicle_count = vehicles_result.scalar_one()
        if vehicle_count > 0 and row.is_active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "CONFLICT",
                    "message": (
                        "Cannot delete an active schedule that is used by vehicles."
                    ),
                },
            )

        await self._db.delete(row)
        await self._db.commit()
        return True

    async def _recalculate_vehicles_for_type(
        self,
        vehicle_type_id: UUID,
        km_interval: int,
        month_interval: int,
    ) -> None:
        """Recalculate next_service_due_date and next_service_due_odometer for
        all vehicles belonging to the given vehicle_type_id."""
        vehicles_stmt = select(VehicleModel).where(
            VehicleModel.vehicle_type_id == vehicle_type_id
        )
        vehicles_result = await self._db.execute(vehicles_stmt)
        vehicles = list(vehicles_result.scalars().all())

        for vehicle in vehicles:
            try:
                next_due_date, next_due_odometer = calculate_next_service_due(
                    last_serviced_at=vehicle.last_serviced_at,
                    last_serviced_odometer_km=vehicle.last_serviced_odometer_km,
                    km_interval=km_interval,
                    month_interval=month_interval,
                )
                vehicle.next_service_due_date = next_due_date
                vehicle.next_service_due_odometer_km = next_due_odometer
            except Exception:
                logger.exception(
                    "Failed to recalculate service due for vehicle %s", vehicle.id
                )

        await self._db.flush()

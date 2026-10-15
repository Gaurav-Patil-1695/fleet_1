import logging
import math
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reading import Reading
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.work_order import WorkOrder
from app.modules.work_orders.schemas import (
    Pagination,
    WorkOrderAssign,
    WorkOrderClose,
    WorkOrderCreate,
    WorkOrderListResponse,
    WorkOrderRead,
    WorkOrderUpdate,
)
from app.repositories.reading_repository import ReadingRepository
from app.repositories.vehicle_repository import VehicleRepository
from app.repositories.work_order_repository import WorkOrderRepository
from app.services.scheduling_service import calculate_next_service_due

logger = logging.getLogger(__name__)


class WorkOrderService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._work_order_repo = WorkOrderRepository(db)
        self._vehicle_repo = VehicleRepository(db)
        self._reading_repo = ReadingRepository(db)

    async def list_work_orders(
        self,
        page: int,
        page_size: int,
        status_filter: str | None = None,
        depot_id: str | None = None,
    ) -> WorkOrderListResponse:
        page = max(1, page)
        page_size = max(1, min(100, page_size))
        offset = (page - 1) * page_size

        query = select(WorkOrder)
        count_query = select(func.count()).select_from(WorkOrder)

        if status_filter:
            query = query.where(WorkOrder.status == status_filter)
            count_query = count_query.where(WorkOrder.status == status_filter)
        if depot_id:
            try:
                depot_uuid = UUID(depot_id)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"code": "INVALID_DEPOT_ID", "message": "Depot ID must be a valid UUID."},
                )
            query = query.where(WorkOrder.depot_id == depot_uuid)
            count_query = count_query.where(WorkOrder.depot_id == depot_uuid)

        query = query.order_by(WorkOrder.raised_at.desc()).offset(offset).limit(page_size)

        result = await self._db.execute(query)
        work_orders = result.scalars().all()

        count_result = await self._db.execute(count_query)
        total_items = count_result.scalar_one()
        total_pages = max(1, math.ceil(total_items / page_size))

        return WorkOrderListResponse(
            data=[WorkOrderRead.model_validate(wo) for wo in work_orders],
            pagination=Pagination(
                page=page,
                page_size=page_size,
                total_items=total_items,
                total_pages=total_pages,
            ),
        )

    async def list_my_work_orders(
        self,
        technician_id: UUID,
        page: int,
        page_size: int,
        status_filter: str | None = None,
    ) -> WorkOrderListResponse:
        page = max(1, page)
        page_size = max(1, min(100, page_size))
        offset = (page - 1) * page_size

        query = select(WorkOrder).where(WorkOrder.assigned_technician_id == technician_id)
        count_query = (
            select(func.count())
            .select_from(WorkOrder)
            .where(WorkOrder.assigned_technician_id == technician_id)
        )

        if status_filter:
            query = query.where(WorkOrder.status == status_filter)
            count_query = count_query.where(WorkOrder.status == status_filter)

        query = query.order_by(WorkOrder.raised_at.desc()).offset(offset).limit(page_size)

        result = await self._db.execute(query)
        work_orders = result.scalars().all()

        count_result = await self._db.execute(count_query)
        total_items = count_result.scalar_one()
        total_pages = max(1, math.ceil(total_items / page_size))

        return WorkOrderListResponse(
            data=[WorkOrderRead.model_validate(wo) for wo in work_orders],
            pagination=Pagination(
                page=page,
                page_size=page_size,
                total_items=total_items,
                total_pages=total_pages,
            ),
        )

    async def create_work_order(
        self,
        body: WorkOrderCreate,
        raised_by_user_id: UUID,
    ) -> WorkOrderRead:
        # Validate vehicle exists
        vehicle_result = await self._db.execute(
            select(Vehicle).where(Vehicle.id == body.vehicle_id)
        )
        vehicle = vehicle_result.scalar_one_or_none()
        if vehicle is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "VEHICLE_NOT_FOUND", "message": "Vehicle not found."},
            )

        work_order = WorkOrder(
            vehicle_id=body.vehicle_id,
            depot_id=body.depot_id,
            raised_by_user_id=raised_by_user_id,
            status="open",
            description=body.description,
        )
        self._db.add(work_order)
        await self._db.commit()
        await self._db.refresh(work_order)
        logger.info("Created work order %s for vehicle %s", work_order.id, body.vehicle_id)
        return WorkOrderRead.model_validate(work_order)

    async def get_work_order(self, work_order_id: UUID) -> WorkOrderRead:
        result = await self._db.execute(
            select(WorkOrder).where(WorkOrder.id == work_order_id)
        )
        work_order = result.scalar_one_or_none()
        if work_order is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "WORK_ORDER_NOT_FOUND", "message": "Work order not found."},
            )
        return WorkOrderRead.model_validate(work_order)

    async def update_work_order(
        self,
        work_order_id: UUID,
        body: WorkOrderUpdate,
    ) -> WorkOrderRead:
        result = await self._db.execute(
            select(WorkOrder).where(WorkOrder.id == work_order_id)
        )
        work_order = result.scalar_one_or_none()
        if work_order is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "WORK_ORDER_NOT_FOUND", "message": "Work order not found."},
            )
        if work_order.status in ("closed", "cancelled"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "WORK_ORDER_NOT_EDITABLE",
                    "message": "Cannot update a closed or cancelled work order.",
                },
            )

        update_data = body.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(work_order, field, value)

        await self._db.commit()
        await self._db.refresh(work_order)
        logger.info("Updated work order %s", work_order_id)
        return WorkOrderRead.model_validate(work_order)

    async def delete_work_order(self, work_order_id: UUID) -> None:
        result = await self._db.execute(
            select(WorkOrder).where(WorkOrder.id == work_order_id)
        )
        work_order = result.scalar_one_or_none()
        if work_order is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "WORK_ORDER_NOT_FOUND", "message": "Work order not found."},
            )
        if work_order.status != "open":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "WORK_ORDER_NOT_OPEN",
                    "message": "Only open work orders can be deleted.",
                },
            )
        await self._db.delete(work_order)
        await self._db.commit()
        logger.info("Deleted work order %s", work_order_id)

    async def assign_work_order(
        self,
        work_order_id: UUID,
        body: WorkOrderAssign,
    ) -> WorkOrderRead:
        result = await self._db.execute(
            select(WorkOrder).where(WorkOrder.id == work_order_id)
        )
        work_order = result.scalar_one_or_none()
        if work_order is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "WORK_ORDER_NOT_FOUND", "message": "Work order not found."},
            )
        if work_order.status in ("closed", "cancelled"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "WORK_ORDER_NOT_ASSIGNABLE",
                    "message": "Cannot assign a closed or cancelled work order.",
                },
            )

        # Validate technician exists and has technician role
        tech_result = await self._db.execute(
            select(User).where(
                User.id == body.assigned_technician_id,
                User.role == "technician",
                User.is_active.is_(True),
            )
        )
        technician = tech_result.scalar_one_or_none()
        if technician is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "TECHNICIAN_NOT_FOUND",
                    "message": "Technician ID must be a valid UUID.",
                },
            )

        work_order.assigned_technician_id = body.assigned_technician_id
        if work_order.status == "open":
            work_order.status = "in_progress"

        await self._db.commit()
        await self._db.refresh(work_order)
        logger.info(
            "Assigned technician %s to work order %s",
            body.assigned_technician_id,
            work_order_id,
        )
        return WorkOrderRead.model_validate(work_order)

    async def close_work_order(
        self,
        work_order_id: UUID,
        body: WorkOrderClose,
        closed_by_user_id: UUID,
    ) -> WorkOrderRead:
        result = await self._db.execute(
            select(WorkOrder).where(WorkOrder.id == work_order_id)
        )
        work_order = result.scalar_one_or_none()
        if work_order is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "WORK_ORDER_NOT_FOUND", "message": "Work order not found."},
            )
        if work_order.status == "closed":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "WORK_ORDER_ALREADY_CLOSED",
                    "message": "Work order is already closed.",
                },
            )
        if work_order.status == "cancelled":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "WORK_ORDER_CANCELLED",
                    "message": "Cannot close a cancelled work order.",
                },
            )

        # Fetch the vehicle to get its type for scheduling
        vehicle_result = await self._db.execute(
            select(Vehicle).where(Vehicle.id == work_order.vehicle_id)
        )
        vehicle = vehicle_result.scalar_one_or_none()
        if vehicle is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "VEHICLE_NOT_FOUND", "message": "Associated vehicle not found."},
            )

        from datetime import datetime, timezone

        now = datetime.now(tz=timezone.utc)

        # Persist a reading for the post-service odometer
        reading = Reading(
            vehicle_id=work_order.vehicle_id,
            recorded_by_user_id=closed_by_user_id,
            odometer_km=body.post_service_odometer_km,
            source="manual",
            is_test_mode=False,
            reading_timestamp=now,
        )
        self._db.add(reading)
        await self._db.flush()  # get reading.id before commit

        # Close the work order
        work_order.status = "closed"
        work_order.completion_notes = body.completion_notes
        work_order.post_service_odometer_km = body.post_service_odometer_km
        work_order.post_service_reading_id = reading.id
        work_order.closed_by_user_id = closed_by_user_id
        work_order.closed_at = now

        # Reset service clock on vehicle
        vehicle.last_serviced_odometer_km = int(body.post_service_odometer_km)
        vehicle.last_serviced_at = now
        vehicle.last_known_odometer_km = int(body.post_service_odometer_km)
        vehicle.last_odometer_recorded_at = now

        # Recalculate next service due using scheduling service
        next_due = await calculate_next_service_due(
            db=self._db,
            vehicle=vehicle,
            current_odometer_km=int(body.post_service_odometer_km),
            serviced_at=now,
        )
        if next_due is not None:
            vehicle.next_service_due_date = next_due.get("next_service_due_date")
            vehicle.next_service_due_odometer_km = next_due.get("next_service_due_odometer_km")

        await self._db.commit()
        await self._db.refresh(work_order)
        logger.info(
            "Closed work order %s by user %s with odometer %s",
            work_order_id,
            closed_by_user_id,
            body.post_service_odometer_km,
        )
        return WorkOrderRead.model_validate(work_order)

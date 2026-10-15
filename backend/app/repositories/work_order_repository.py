from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.work_order import WorkOrder


class WorkOrderRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_all(self) -> list[WorkOrder]:
        result = await self._session.execute(
            select(WorkOrder).order_by(WorkOrder.raised_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_id(self, work_order_id: UUID) -> WorkOrder | None:
        result = await self._session.execute(
            select(WorkOrder).where(WorkOrder.id == work_order_id)
        )
        return result.scalar_one_or_none()

    async def get_by_vehicle_id(self, vehicle_id: UUID) -> list[WorkOrder]:
        result = await self._session.execute(
            select(WorkOrder)
            .where(WorkOrder.vehicle_id == vehicle_id)
            .order_by(WorkOrder.raised_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_depot_id(self, depot_id: UUID) -> list[WorkOrder]:
        result = await self._session.execute(
            select(WorkOrder)
            .where(WorkOrder.depot_id == depot_id)
            .order_by(WorkOrder.raised_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_status(self, status: str) -> list[WorkOrder]:
        result = await self._session.execute(
            select(WorkOrder)
            .where(WorkOrder.status == status)
            .order_by(WorkOrder.raised_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_assigned_technician_id(
        self, assigned_technician_id: UUID
    ) -> list[WorkOrder]:
        result = await self._session.execute(
            select(WorkOrder)
            .where(WorkOrder.assigned_technician_id == assigned_technician_id)
            .order_by(WorkOrder.raised_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_assigned_technician_id_and_status(
        self, assigned_technician_id: UUID, status: str
    ) -> list[WorkOrder]:
        result = await self._session.execute(
            select(WorkOrder)
            .where(
                WorkOrder.assigned_technician_id == assigned_technician_id,
                WorkOrder.status == status,
            )
            .order_by(WorkOrder.raised_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_depot_id_and_status(
        self, depot_id: UUID, status: str
    ) -> list[WorkOrder]:
        result = await self._session.execute(
            select(WorkOrder)
            .where(
                WorkOrder.depot_id == depot_id,
                WorkOrder.status == status,
            )
            .order_by(WorkOrder.raised_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_raised_by_user_id(self, raised_by_user_id: UUID) -> list[WorkOrder]:
        result = await self._session.execute(
            select(WorkOrder)
            .where(WorkOrder.raised_by_user_id == raised_by_user_id)
            .order_by(WorkOrder.raised_at.desc())
        )
        return list(result.scalars().all())

    async def get_open_by_vehicle_id(self, vehicle_id: UUID) -> list[WorkOrder]:
        result = await self._session.execute(
            select(WorkOrder)
            .where(
                WorkOrder.vehicle_id == vehicle_id,
                WorkOrder.status.in_(["open", "in_progress"]),
            )
            .order_by(WorkOrder.raised_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_raised_at_range(
        self,
        start: datetime,
        end: datetime,
    ) -> list[WorkOrder]:
        result = await self._session.execute(
            select(WorkOrder)
            .where(
                WorkOrder.raised_at >= start,
                WorkOrder.raised_at <= end,
            )
            .order_by(WorkOrder.raised_at.desc())
        )
        return list(result.scalars().all())

    async def create(
        self,
        vehicle_id: UUID,
        depot_id: UUID,
        raised_by_user_id: UUID,
        status: str = "open",
        description: str | None = None,
        assigned_technician_id: UUID | None = None,
        raised_at: datetime | None = None,
    ) -> WorkOrder:
        kwargs: dict = {
            "vehicle_id": vehicle_id,
            "depot_id": depot_id,
            "raised_by_user_id": raised_by_user_id,
            "status": status,
            "description": description,
            "assigned_technician_id": assigned_technician_id,
        }
        if raised_at is not None:
            kwargs["raised_at"] = raised_at
        work_order = WorkOrder(**kwargs)
        self._session.add(work_order)
        await self._session.flush()
        await self._session.refresh(work_order)
        return work_order

    async def update(
        self,
        work_order: WorkOrder,
        vehicle_id: UUID | None = None,
        depot_id: UUID | None = None,
        assigned_technician_id: UUID | None = None,
        raised_by_user_id: UUID | None = None,
        closed_by_user_id: UUID | None = None,
        status: str | None = None,
        description: str | None = None,
        completion_notes: str | None = None,
        post_service_odometer_km: Decimal | None = None,
        post_service_reading_id: UUID | None = None,
        raised_at: datetime | None = None,
        closed_at: datetime | None = None,
    ) -> WorkOrder:
        if vehicle_id is not None:
            work_order.vehicle_id = vehicle_id
        if depot_id is not None:
            work_order.depot_id = depot_id
        if assigned_technician_id is not None:
            work_order.assigned_technician_id = assigned_technician_id
        if raised_by_user_id is not None:
            work_order.raised_by_user_id = raised_by_user_id
        if closed_by_user_id is not None:
            work_order.closed_by_user_id = closed_by_user_id
        if status is not None:
            work_order.status = status
        if description is not None:
            work_order.description = description
        if completion_notes is not None:
            work_order.completion_notes = completion_notes
        if post_service_odometer_km is not None:
            work_order.post_service_odometer_km = post_service_odometer_km
        if post_service_reading_id is not None:
            work_order.post_service_reading_id = post_service_reading_id
        if raised_at is not None:
            work_order.raised_at = raised_at
        if closed_at is not None:
            work_order.closed_at = closed_at
        self._session.add(work_order)
        await self._session.flush()
        await self._session.refresh(work_order)
        return work_order

    async def assign(
        self,
        work_order: WorkOrder,
        assigned_technician_id: UUID,
        status: str = "in_progress",
    ) -> WorkOrder:
        work_order.assigned_technician_id = assigned_technician_id
        work_order.status = status
        self._session.add(work_order)
        await self._session.flush()
        await self._session.refresh(work_order)
        return work_order

    async def close(
        self,
        work_order: WorkOrder,
        closed_by_user_id: UUID,
        completion_notes: str,
        post_service_odometer_km: Decimal,
        closed_at: datetime,
        post_service_reading_id: UUID | None = None,
    ) -> WorkOrder:
        work_order.status = "closed"
        work_order.closed_by_user_id = closed_by_user_id
        work_order.completion_notes = completion_notes
        work_order.post_service_odometer_km = post_service_odometer_km
        work_order.closed_at = closed_at
        if post_service_reading_id is not None:
            work_order.post_service_reading_id = post_service_reading_id
        self._session.add(work_order)
        await self._session.flush()
        await self._session.refresh(work_order)
        return work_order

    async def delete(self, work_order: WorkOrder) -> None:
        await self._session.delete(work_order)
        await self._session.flush()

    async def count(self) -> int:
        result = await self._session.execute(
            select(func.count()).select_from(WorkOrder)
        )
        return result.scalar_one()

    async def count_by_depot_id(self, depot_id: UUID) -> int:
        result = await self._session.execute(
            select(func.count())
            .select_from(WorkOrder)
            .where(WorkOrder.depot_id == depot_id)
        )
        return result.scalar_one()

    async def count_by_depot_id_and_status(self, depot_id: UUID, status: str) -> int:
        result = await self._session.execute(
            select(func.count())
            .select_from(WorkOrder)
            .where(WorkOrder.depot_id == depot_id, WorkOrder.status == status)
        )
        return result.scalar_one()

    async def count_by_vehicle_id(self, vehicle_id: UUID) -> int:
        result = await self._session.execute(
            select(func.count())
            .select_from(WorkOrder)
            .where(WorkOrder.vehicle_id == vehicle_id)
        )
        return result.scalar_one()

    async def count_by_assigned_technician_id(self, assigned_technician_id: UUID) -> int:
        result = await self._session.execute(
            select(func.count())
            .select_from(WorkOrder)
            .where(WorkOrder.assigned_technician_id == assigned_technician_id)
        )
        return result.scalar_one()

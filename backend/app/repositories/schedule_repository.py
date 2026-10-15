from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.schedule import Schedule


class ScheduleRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_all(self) -> list[Schedule]:
        result = await self._session.execute(
            select(Schedule).order_by(Schedule.created_at)
        )
        return list(result.scalars().all())

    async def get_by_id(self, schedule_id: UUID) -> Schedule | None:
        result = await self._session.execute(
            select(Schedule).where(Schedule.id == schedule_id)
        )
        return result.scalar_one_or_none()

    async def get_by_vehicle_type_id(self, vehicle_type_id: UUID) -> list[Schedule]:
        result = await self._session.execute(
            select(Schedule)
            .where(Schedule.vehicle_type_id == vehicle_type_id)
            .order_by(Schedule.created_at)
        )
        return list(result.scalars().all())

    async def get_active_by_vehicle_type_id(
        self, vehicle_type_id: UUID
    ) -> Schedule | None:
        result = await self._session.execute(
            select(Schedule).where(
                Schedule.vehicle_type_id == vehicle_type_id,
                Schedule.is_active.is_(True),
            )
        )
        return result.scalar_one_or_none()

    async def get_by_vehicle_class(self, vehicle_class: str) -> list[Schedule]:
        result = await self._session.execute(
            select(Schedule)
            .where(Schedule.vehicle_class == vehicle_class)
            .order_by(Schedule.created_at)
        )
        return list(result.scalars().all())

    async def get_active_by_vehicle_class(
        self, vehicle_class: str
    ) -> list[Schedule]:
        result = await self._session.execute(
            select(Schedule)
            .where(
                Schedule.vehicle_class == vehicle_class,
                Schedule.is_active.is_(True),
            )
            .order_by(Schedule.created_at)
        )
        return list(result.scalars().all())

    async def create(
        self,
        vehicle_type_id: UUID,
        vehicle_class: str,
        km_interval: int,
        month_interval: int,
        is_active: bool = True,
    ) -> Schedule:
        schedule = Schedule(
            vehicle_type_id=vehicle_type_id,
            vehicle_class=vehicle_class,
            km_interval=km_interval,
            month_interval=month_interval,
            is_active=is_active,
        )
        self._session.add(schedule)
        await self._session.flush()
        await self._session.refresh(schedule)
        return schedule

    async def update(
        self,
        schedule: Schedule,
        vehicle_type_id: UUID | None = None,
        vehicle_class: str | None = None,
        km_interval: int | None = None,
        month_interval: int | None = None,
        is_active: bool | None = None,
    ) -> Schedule:
        if vehicle_type_id is not None:
            schedule.vehicle_type_id = vehicle_type_id
        if vehicle_class is not None:
            schedule.vehicle_class = vehicle_class
        if km_interval is not None:
            schedule.km_interval = km_interval
        if month_interval is not None:
            schedule.month_interval = month_interval
        if is_active is not None:
            schedule.is_active = is_active
        self._session.add(schedule)
        await self._session.flush()
        await self._session.refresh(schedule)
        return schedule

    async def delete(self, schedule: Schedule) -> None:
        await self._session.delete(schedule)
        await self._session.flush()

    async def count(self) -> int:
        result = await self._session.execute(
            select(func.count()).select_from(Schedule)
        )
        return result.scalar_one()

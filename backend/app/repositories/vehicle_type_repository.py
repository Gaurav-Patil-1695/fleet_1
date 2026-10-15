from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.vehicle_type import VehicleType


class VehicleTypeRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_all(self) -> list[VehicleType]:
        result = await self._session.execute(
            select(VehicleType).order_by(VehicleType.name)
        )
        return list(result.scalars().all())

    async def get_by_id(self, vehicle_type_id: UUID) -> VehicleType | None:
        result = await self._session.execute(
            select(VehicleType).where(VehicleType.id == vehicle_type_id)
        )
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> VehicleType | None:
        result = await self._session.execute(
            select(VehicleType).where(VehicleType.name == name)
        )
        return result.scalar_one_or_none()

    async def get_by_class(self, vehicle_class: str) -> list[VehicleType]:
        result = await self._session.execute(
            select(VehicleType)
            .where(VehicleType.vehicle_class == vehicle_class)
            .order_by(VehicleType.name)
        )
        return list(result.scalars().all())

    async def create(
        self,
        name: str,
        vehicle_class: str,
    ) -> VehicleType:
        vehicle_type = VehicleType(name=name, vehicle_class=vehicle_class)
        self._session.add(vehicle_type)
        await self._session.flush()
        await self._session.refresh(vehicle_type)
        return vehicle_type

    async def update(
        self,
        vehicle_type: VehicleType,
        name: str | None = None,
        vehicle_class: str | None = None,
    ) -> VehicleType:
        if name is not None:
            vehicle_type.name = name
        if vehicle_class is not None:
            vehicle_type.vehicle_class = vehicle_class
        self._session.add(vehicle_type)
        await self._session.flush()
        await self._session.refresh(vehicle_type)
        return vehicle_type

    async def delete(self, vehicle_type: VehicleType) -> None:
        await self._session.delete(vehicle_type)
        await self._session.flush()

    async def count(self) -> int:
        result = await self._session.execute(
            select(func.count()).select_from(VehicleType)
        )
        return result.scalar_one()

from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.depot import Depot


class DepotRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_all(self) -> list[Depot]:
        result = await self._session.execute(
            select(Depot).order_by(Depot.name)
        )
        return list(result.scalars().all())

    async def get_by_id(self, depot_id: UUID) -> Depot | None:
        result = await self._session.execute(
            select(Depot).where(Depot.id == depot_id)
        )
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Depot | None:
        result = await self._session.execute(
            select(Depot).where(Depot.name == name)
        )
        return result.scalar_one_or_none()

    async def create(self, name: str, address: str | None = None) -> Depot:
        depot = Depot(name=name, address=address)
        self._session.add(depot)
        await self._session.flush()
        await self._session.refresh(depot)
        return depot

    async def update(
        self,
        depot: Depot,
        name: str | None = None,
        address: str | None = None,
    ) -> Depot:
        if name is not None:
            depot.name = name
        if address is not None:
            depot.address = address
        self._session.add(depot)
        await self._session.flush()
        await self._session.refresh(depot)
        return depot

    async def delete(self, depot: Depot) -> None:
        await self._session.delete(depot)
        await self._session.flush()

    async def count(self) -> int:
        result = await self._session.execute(
            select(func.count()).select_from(Depot)
        )
        return result.scalar_one()

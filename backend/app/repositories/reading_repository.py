from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reading import Reading


class ReadingRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_all(self) -> list[Reading]:
        result = await self._session.execute(
            select(Reading).order_by(Reading.reading_timestamp.desc())
        )
        return list(result.scalars().all())

    async def get_by_id(self, reading_id: UUID) -> Reading | None:
        result = await self._session.execute(
            select(Reading).where(Reading.id == reading_id)
        )
        return result.scalar_one_or_none()

    async def get_by_vehicle_id(
        self,
        vehicle_id: UUID,
        limit: int | None = None,
    ) -> list[Reading]:
        query = (
            select(Reading)
            .where(Reading.vehicle_id == vehicle_id)
            .order_by(Reading.reading_timestamp.desc())
        )
        if limit is not None:
            query = query.limit(limit)
        result = await self._session.execute(query)
        return list(result.scalars().all())

    async def get_latest_by_vehicle_id(self, vehicle_id: UUID) -> Reading | None:
        result = await self._session.execute(
            select(Reading)
            .where(Reading.vehicle_id == vehicle_id)
            .order_by(Reading.reading_timestamp.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_by_source(self, source: str) -> list[Reading]:
        result = await self._session.execute(
            select(Reading)
            .where(Reading.source == source)
            .order_by(Reading.reading_timestamp.desc())
        )
        return list(result.scalars().all())

    async def get_by_vehicle_id_and_source(
        self, vehicle_id: UUID, source: str
    ) -> list[Reading]:
        result = await self._session.execute(
            select(Reading)
            .where(
                Reading.vehicle_id == vehicle_id,
                Reading.source == source,
            )
            .order_by(Reading.reading_timestamp.desc())
        )
        return list(result.scalars().all())

    async def get_by_recorded_by_user_id(
        self, recorded_by_user_id: UUID
    ) -> list[Reading]:
        result = await self._session.execute(
            select(Reading)
            .where(Reading.recorded_by_user_id == recorded_by_user_id)
            .order_by(Reading.reading_timestamp.desc())
        )
        return list(result.scalars().all())

    async def get_by_timestamp_range(
        self,
        start: datetime,
        end: datetime,
    ) -> list[Reading]:
        result = await self._session.execute(
            select(Reading)
            .where(
                Reading.reading_timestamp >= start,
                Reading.reading_timestamp <= end,
            )
            .order_by(Reading.reading_timestamp.desc())
        )
        return list(result.scalars().all())

    async def get_by_vehicle_id_and_timestamp_range(
        self,
        vehicle_id: UUID,
        start: datetime,
        end: datetime,
    ) -> list[Reading]:
        result = await self._session.execute(
            select(Reading)
            .where(
                Reading.vehicle_id == vehicle_id,
                Reading.reading_timestamp >= start,
                Reading.reading_timestamp <= end,
            )
            .order_by(Reading.reading_timestamp.desc())
        )
        return list(result.scalars().all())

    async def create(
        self,
        vehicle_id: UUID,
        odometer_km: Decimal,
        source: str,
        recorded_by_user_id: UUID | None = None,
        is_test_mode: bool = False,
        raw_payload: dict | None = None,
        reading_timestamp: datetime | None = None,
    ) -> Reading:
        kwargs: dict = {
            "vehicle_id": vehicle_id,
            "odometer_km": odometer_km,
            "source": source,
            "recorded_by_user_id": recorded_by_user_id,
            "is_test_mode": is_test_mode,
            "raw_payload": raw_payload,
        }
        if reading_timestamp is not None:
            kwargs["reading_timestamp"] = reading_timestamp
        reading = Reading(**kwargs)
        self._session.add(reading)
        await self._session.flush()
        await self._session.refresh(reading)
        return reading

    async def delete(self, reading: Reading) -> None:
        await self._session.delete(reading)
        await self._session.flush()

    async def count(self) -> int:
        result = await self._session.execute(
            select(func.count()).select_from(Reading)
        )
        return result.scalar_one()

    async def count_by_vehicle_id(self, vehicle_id: UUID) -> int:
        result = await self._session.execute(
            select(func.count())
            .select_from(Reading)
            .where(Reading.vehicle_id == vehicle_id)
        )
        return result.scalar_one()

    async def count_by_source(self, source: str) -> int:
        result = await self._session.execute(
            select(func.count())
            .select_from(Reading)
            .where(Reading.source == source)
        )
        return result.scalar_one()

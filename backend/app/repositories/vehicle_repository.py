from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.vehicle import Vehicle


class VehicleRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_all(self) -> list[Vehicle]:
        result = await self._session.execute(
            select(Vehicle).order_by(Vehicle.registration_number)
        )
        return list(result.scalars().all())

    async def get_by_id(self, vehicle_id: UUID) -> Vehicle | None:
        result = await self._session.execute(
            select(Vehicle).where(Vehicle.id == vehicle_id)
        )
        return result.scalar_one_or_none()

    async def get_by_registration_number(self, registration_number: str) -> Vehicle | None:
        result = await self._session.execute(
            select(Vehicle).where(Vehicle.registration_number == registration_number)
        )
        return result.scalar_one_or_none()

    async def get_by_depot_id(self, depot_id: UUID) -> list[Vehicle]:
        result = await self._session.execute(
            select(Vehicle)
            .where(Vehicle.depot_id == depot_id)
            .order_by(Vehicle.registration_number)
        )
        return list(result.scalars().all())

    async def get_by_vehicle_type_id(self, vehicle_type_id: UUID) -> list[Vehicle]:
        result = await self._session.execute(
            select(Vehicle)
            .where(Vehicle.vehicle_type_id == vehicle_type_id)
            .order_by(Vehicle.registration_number)
        )
        return list(result.scalars().all())

    async def get_by_status(self, status: str) -> list[Vehicle]:
        result = await self._session.execute(
            select(Vehicle)
            .where(Vehicle.status == status)
            .order_by(Vehicle.registration_number)
        )
        return list(result.scalars().all())

    async def get_by_depot_id_and_status(
        self, depot_id: UUID, status: str
    ) -> list[Vehicle]:
        result = await self._session.execute(
            select(Vehicle)
            .where(Vehicle.depot_id == depot_id, Vehicle.status == status)
            .order_by(Vehicle.registration_number)
        )
        return list(result.scalars().all())

    async def get_due_for_service(
        self, depot_id: UUID, cutoff_date: date
    ) -> list[Vehicle]:
        result = await self._session.execute(
            select(Vehicle)
            .where(
                Vehicle.depot_id == depot_id,
                Vehicle.status == "active",
                Vehicle.next_service_due_date <= cutoff_date,
            )
            .order_by(Vehicle.next_service_due_date)
        )
        return list(result.scalars().all())

    async def create(
        self,
        depot_id: UUID,
        vehicle_type_id: UUID,
        registration_number: str,
        make: str,
        model: str,
        in_service_date: date,
        has_telematics: bool = False,
        last_known_odometer_km: Decimal | None = None,
        last_odometer_recorded_at: datetime | None = None,
        last_serviced_odometer_km: Decimal | None = None,
        last_serviced_at: datetime | None = None,
        next_service_due_date: date | None = None,
        next_service_due_odometer_km: Decimal | None = None,
        status: str = "active",
    ) -> Vehicle:
        vehicle = Vehicle(
            depot_id=depot_id,
            vehicle_type_id=vehicle_type_id,
            registration_number=registration_number,
            make=make,
            model=model,
            in_service_date=in_service_date,
            has_telematics=has_telematics,
            last_known_odometer_km=last_known_odometer_km,
            last_odometer_recorded_at=last_odometer_recorded_at,
            last_serviced_odometer_km=last_serviced_odometer_km,
            last_serviced_at=last_serviced_at,
            next_service_due_date=next_service_due_date,
            next_service_due_odometer_km=next_service_due_odometer_km,
            status=status,
        )
        self._session.add(vehicle)
        await self._session.flush()
        await self._session.refresh(vehicle)
        return vehicle

    async def update(
        self,
        vehicle: Vehicle,
        depot_id: UUID | None = None,
        vehicle_type_id: UUID | None = None,
        registration_number: str | None = None,
        make: str | None = None,
        model: str | None = None,
        in_service_date: date | None = None,
        has_telematics: bool | None = None,
        last_known_odometer_km: Decimal | None = None,
        last_odometer_recorded_at: datetime | None = None,
        last_serviced_odometer_km: Decimal | None = None,
        last_serviced_at: datetime | None = None,
        next_service_due_date: date | None = None,
        next_service_due_odometer_km: Decimal | None = None,
        status: str | None = None,
    ) -> Vehicle:
        if depot_id is not None:
            vehicle.depot_id = depot_id
        if vehicle_type_id is not None:
            vehicle.vehicle_type_id = vehicle_type_id
        if registration_number is not None:
            vehicle.registration_number = registration_number
        if make is not None:
            vehicle.make = make
        if model is not None:
            vehicle.model = model
        if in_service_date is not None:
            vehicle.in_service_date = in_service_date
        if has_telematics is not None:
            vehicle.has_telematics = has_telematics
        if last_known_odometer_km is not None:
            vehicle.last_known_odometer_km = last_known_odometer_km
        if last_odometer_recorded_at is not None:
            vehicle.last_odometer_recorded_at = last_odometer_recorded_at
        if last_serviced_odometer_km is not None:
            vehicle.last_serviced_odometer_km = last_serviced_odometer_km
        if last_serviced_at is not None:
            vehicle.last_serviced_at = last_serviced_at
        if next_service_due_date is not None:
            vehicle.next_service_due_date = next_service_due_date
        if next_service_due_odometer_km is not None:
            vehicle.next_service_due_odometer_km = next_service_due_odometer_km
        if status is not None:
            vehicle.status = status
        self._session.add(vehicle)
        await self._session.flush()
        await self._session.refresh(vehicle)
        return vehicle

    async def update_odometer(
        self,
        vehicle: Vehicle,
        odometer_km: Decimal,
        recorded_at: datetime,
    ) -> Vehicle:
        vehicle.last_known_odometer_km = odometer_km
        vehicle.last_odometer_recorded_at = recorded_at
        self._session.add(vehicle)
        await self._session.flush()
        await self._session.refresh(vehicle)
        return vehicle

    async def update_service_record(
        self,
        vehicle: Vehicle,
        last_serviced_odometer_km: Decimal,
        last_serviced_at: datetime,
        next_service_due_date: date | None = None,
        next_service_due_odometer_km: Decimal | None = None,
    ) -> Vehicle:
        vehicle.last_serviced_odometer_km = last_serviced_odometer_km
        vehicle.last_serviced_at = last_serviced_at
        if next_service_due_date is not None:
            vehicle.next_service_due_date = next_service_due_date
        if next_service_due_odometer_km is not None:
            vehicle.next_service_due_odometer_km = next_service_due_odometer_km
        self._session.add(vehicle)
        await self._session.flush()
        await self._session.refresh(vehicle)
        return vehicle

    async def delete(self, vehicle: Vehicle) -> None:
        await self._session.delete(vehicle)
        await self._session.flush()

    async def count(self) -> int:
        result = await self._session.execute(
            select(func.count()).select_from(Vehicle)
        )
        return result.scalar_one()

    async def count_by_depot_id(self, depot_id: UUID) -> int:
        result = await self._session.execute(
            select(func.count()).select_from(Vehicle).where(Vehicle.depot_id == depot_id)
        )
        return result.scalar_one()

    async def count_by_depot_id_and_status(self, depot_id: UUID, status: str) -> int:
        result = await self._session.execute(
            select(func.count())
            .select_from(Vehicle)
            .where(Vehicle.depot_id == depot_id, Vehicle.status == status)
        )
        return result.scalar_one()

from datetime import date
from math import ceil
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.depot import Depot
from app.models.vehicle import Vehicle
from app.modules.depots.schemas import (
    DepotCreate,
    DepotDashboard,
    DepotListResponse,
    DepotRead,
    DepotUpdate,
    Pagination,
    VehicleServiceSummary,
)


class DepotService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def list_depots(
        self,
        page: int,
        page_size: int,
        search: str | None,
    ) -> DepotListResponse:
        query = select(Depot)
        if search:
            pattern = f"%{search}%"
            query = query.where(
                or_(
                    Depot.name.ilike(pattern),
                    Depot.address.ilike(pattern),
                )
            )

        count_query = select(func.count()).select_from(query.subquery())
        total_items_result = await self._db.execute(count_query)
        total_items: int = total_items_result.scalar_one()

        offset = (page - 1) * page_size
        data_query = query.order_by(Depot.name).offset(offset).limit(page_size)
        result = await self._db.execute(data_query)
        depots = result.scalars().all()

        total_pages = max(1, ceil(total_items / page_size)) if total_items else 1

        return DepotListResponse(
            data=[DepotRead.model_validate(d) for d in depots],
            pagination=Pagination(
                page=page,
                page_size=page_size,
                total_items=total_items,
                total_pages=total_pages,
            ),
        )

    async def get_depot(self, depot_id: UUID) -> DepotRead:
        depot = await self._db.get(Depot, depot_id)
        if depot is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "DEPOT_NOT_FOUND", "message": "Depot not found."},
            )
        return DepotRead.model_validate(depot)

    async def create_depot(self, body: DepotCreate) -> DepotRead:
        existing = await self._db.execute(
            select(Depot).where(Depot.name == body.name)
        )
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "DEPOT_NAME_CONFLICT",
                    "message": "A depot with this name already exists.",
                },
            )

        depot = Depot(
            name=body.name,
            address=body.address,
        )
        self._db.add(depot)
        await self._db.commit()
        await self._db.refresh(depot)
        return DepotRead.model_validate(depot)

    async def update_depot(self, depot_id: UUID, body: DepotUpdate) -> DepotRead:
        depot = await self._db.get(Depot, depot_id)
        if depot is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "DEPOT_NOT_FOUND", "message": "Depot not found."},
            )

        update_data = body.model_dump(exclude_unset=True)

        if "name" in update_data and update_data["name"] != depot.name:
            conflict = await self._db.execute(
                select(Depot).where(Depot.name == update_data["name"])
            )
            if conflict.scalar_one_or_none() is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "code": "DEPOT_NAME_CONFLICT",
                        "message": "A depot with this name already exists.",
                    },
                )

        for field, value in update_data.items():
            setattr(depot, field, value)

        await self._db.commit()
        await self._db.refresh(depot)
        return DepotRead.model_validate(depot)

    async def delete_depot(self, depot_id: UUID) -> None:
        depot = await self._db.get(Depot, depot_id)
        if depot is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "DEPOT_NOT_FOUND", "message": "Depot not found."},
            )

        # Check for associated vehicles before deletion
        vehicle_count_result = await self._db.execute(
            select(func.count()).select_from(Vehicle).where(Vehicle.depot_id == depot_id)
        )
        vehicle_count: int = vehicle_count_result.scalar_one()
        if vehicle_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "DEPOT_HAS_VEHICLES",
                    "message": "Cannot delete a depot that has associated vehicles.",
                },
            )

        await self._db.delete(depot)
        await self._db.commit()

    async def get_depot_dashboard(self, depot_id: UUID) -> DepotDashboard:
        depot = await self._db.get(Depot, depot_id)
        if depot is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "DEPOT_NOT_FOUND", "message": "Depot not found."},
            )

        result = await self._db.execute(
            select(Vehicle).where(
                Vehicle.depot_id == depot_id,
                Vehicle.status == "active",
                Vehicle.next_service_due_date.is_not(None),
            ).order_by(Vehicle.next_service_due_date)
        )
        vehicles = result.scalars().all()

        today = date.today()
        due_for_service: list[VehicleServiceSummary] = []
        overdue: list[VehicleServiceSummary] = []

        for vehicle in vehicles:
            next_date: date | None = vehicle.next_service_due_date
            next_odometer = vehicle.next_service_due_odometer_km

            # A vehicle is overdue if the service date has passed OR odometer has been exceeded
            is_date_overdue = next_date is not None and next_date < today
            is_odometer_overdue = (
                next_odometer is not None
                and vehicle.last_known_odometer_km is not None
                and vehicle.last_known_odometer_km >= next_odometer
            )

            summary = VehicleServiceSummary(
                vehicle_id=vehicle.id,
                registration_number=vehicle.registration_number,
                make=vehicle.make,
                model=vehicle.model,
                last_known_odometer_km=vehicle.last_known_odometer_km,
                next_service_due_date=next_date,
                next_service_due_odometer_km=next_odometer,
            )

            if is_date_overdue or is_odometer_overdue:
                overdue.append(summary)
            else:
                due_for_service.append(summary)

        return DepotDashboard(
            depot_id=depot_id,
            due_for_service=due_for_service,
            overdue=overdue,
        )

import logging
import math
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.readings.schemas import ReadingListResponse, ReadingRead
from app.modules.vehicles.schemas import (
    Pagination,
    VehicleCreate,
    VehicleListResponse,
    VehicleRead,
    VehicleUpdate,
)
from app.modules.work_orders.schemas import WorkOrderListResponse, WorkOrderRead
from app.repositories.depot_repository import DepotRepository
from app.repositories.reading_repository import ReadingRepository
from app.repositories.schedule_repository import ScheduleRepository
from app.repositories.vehicle_repository import VehicleRepository
from app.repositories.vehicle_type_repository import VehicleTypeRepository
from app.repositories.work_order_repository import WorkOrderRepository
from app.services.scheduling_service import calculate_next_service_due

logger = logging.getLogger(__name__)


class VehicleService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._vehicle_repo = VehicleRepository(db)
        self._depot_repo = DepotRepository(db)
        self._vehicle_type_repo = VehicleTypeRepository(db)
        self._schedule_repo = ScheduleRepository(db)
        self._reading_repo = ReadingRepository(db)
        self._work_order_repo = WorkOrderRepository(db)

    async def list_vehicles(
        self,
        depot_id: Optional[UUID] = None,
        vehicle_type_id: Optional[UUID] = None,
        status: Optional[str] = None,
        has_telematics: Optional[bool] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> VehicleListResponse:
        vehicles, total = await self._vehicle_repo.list_vehicles(
            depot_id=depot_id,
            vehicle_type_id=vehicle_type_id,
            status=status,
            has_telematics=has_telematics,
            page=page,
            page_size=page_size,
        )
        total_pages = math.ceil(total / page_size) if total > 0 else 1
        return VehicleListResponse(
            data=[VehicleRead.model_validate(v) for v in vehicles],
            pagination=Pagination(
                page=page,
                page_size=page_size,
                total_items=total,
                total_pages=total_pages,
            ),
        )

    async def create_vehicle(self, body: VehicleCreate) -> VehicleRead:
        # Validate depot exists
        depot = await self._depot_repo.get_by_id(body.depot_id)
        if depot is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "DEPOT_NOT_FOUND", "message": "Depot ID must be a valid UUID."},
            )

        # Validate vehicle type exists
        vehicle_type = await self._vehicle_type_repo.get_by_id(body.vehicle_type_id)
        if vehicle_type is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "VEHICLE_TYPE_NOT_FOUND", "message": "Vehicle type ID must be a valid UUID."},
            )

        # Check registration number uniqueness
        existing = await self._vehicle_repo.get_by_registration_number(
            body.registration_number
        )
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "REGISTRATION_NUMBER_CONFLICT",
                    "message": "A vehicle with this registration number already exists.",
                },
            )

        # Calculate initial service due fields if a schedule exists for the vehicle class
        schedule = await self._schedule_repo.get_active_schedule_for_vehicle_class(
            vehicle_type.vehicle_class
        )

        next_service_due_date = None
        next_service_due_odometer_km = None

        if schedule is not None:
            result = calculate_next_service_due(
                last_serviced_at=None,
                last_serviced_odometer_km=None,
                current_odometer_km=None,
                in_service_date=body.in_service_date,
                km_interval=schedule.km_interval,
                month_interval=schedule.month_interval,
            )
            next_service_due_date = result.get("next_service_due_date")
            next_service_due_odometer_km = result.get("next_service_due_odometer_km")

        vehicle_data = body.model_dump()
        vehicle_data["next_service_due_date"] = next_service_due_date
        vehicle_data["next_service_due_odometer_km"] = next_service_due_odometer_km

        vehicle = await self._vehicle_repo.create(vehicle_data)
        return VehicleRead.model_validate(vehicle)

    async def get_vehicle(self, vehicle_id: UUID) -> VehicleRead:
        vehicle = await self._vehicle_repo.get_by_id(vehicle_id)
        if vehicle is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "VEHICLE_NOT_FOUND", "message": "Vehicle not found."},
            )
        return VehicleRead.model_validate(vehicle)

    async def update_vehicle(self, vehicle_id: UUID, body: VehicleUpdate) -> VehicleRead:
        vehicle = await self._vehicle_repo.get_by_id(vehicle_id)
        if vehicle is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "VEHICLE_NOT_FOUND", "message": "Vehicle not found."},
            )

        update_data = body.model_dump(exclude_unset=True)

        # Validate depot if provided
        if "depot_id" in update_data:
            depot = await self._depot_repo.get_by_id(update_data["depot_id"])
            if depot is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"code": "DEPOT_NOT_FOUND", "message": "Depot ID must be a valid UUID."},
                )

        # Validate vehicle type if provided
        new_vehicle_class = None
        if "vehicle_type_id" in update_data:
            vehicle_type = await self._vehicle_type_repo.get_by_id(
                update_data["vehicle_type_id"]
            )
            if vehicle_type is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"code": "VEHICLE_TYPE_NOT_FOUND", "message": "Vehicle type ID must be a valid UUID."},
                )
            new_vehicle_class = vehicle_type.vehicle_class

        # Check registration number uniqueness if changing
        if "registration_number" in update_data:
            reg = update_data["registration_number"]
            existing = await self._vehicle_repo.get_by_registration_number(reg)
            if existing is not None and existing.id != vehicle_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "code": "REGISTRATION_NUMBER_CONFLICT",
                        "message": "A vehicle with this registration number already exists.",
                    },
                )

        # Recalculate service due when vehicle type changes (different schedule)
        if new_vehicle_class is not None:
            schedule = await self._schedule_repo.get_active_schedule_for_vehicle_class(
                new_vehicle_class
            )
            if schedule is not None:
                result = calculate_next_service_due(
                    last_serviced_at=vehicle.last_serviced_at,
                    last_serviced_odometer_km=(
                        float(vehicle.last_serviced_odometer_km)
                        if vehicle.last_serviced_odometer_km is not None
                        else None
                    ),
                    current_odometer_km=(
                        float(vehicle.last_known_odometer_km)
                        if vehicle.last_known_odometer_km is not None
                        else None
                    ),
                    in_service_date=vehicle.in_service_date,
                    km_interval=schedule.km_interval,
                    month_interval=schedule.month_interval,
                )
                update_data["next_service_due_date"] = result.get(
                    "next_service_due_date"
                )
                update_data["next_service_due_odometer_km"] = result.get(
                    "next_service_due_odometer_km"
                )

        updated_vehicle = await self._vehicle_repo.update(vehicle_id, update_data)
        return VehicleRead.model_validate(updated_vehicle)

    async def delete_vehicle(self, vehicle_id: UUID) -> None:
        vehicle = await self._vehicle_repo.get_by_id(vehicle_id)
        if vehicle is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "VEHICLE_NOT_FOUND", "message": "Vehicle not found."},
            )

        # Check for open/in-progress work orders before deletion
        active_work_orders = await self._work_order_repo.count_active_for_vehicle(
            vehicle_id
        )
        if active_work_orders > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "VEHICLE_HAS_ACTIVE_WORK_ORDERS",
                    "message": "Cannot delete a vehicle with active work orders.",
                },
            )

        await self._vehicle_repo.delete(vehicle_id)

    async def list_vehicle_readings(
        self,
        vehicle_id: UUID,
        source: Optional[str] = None,
        is_test_mode: Optional[bool] = None,
        from_: Optional[str] = None,
        to: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> ReadingListResponse:
        vehicle = await self._vehicle_repo.get_by_id(vehicle_id)
        if vehicle is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "VEHICLE_NOT_FOUND", "message": "Vehicle not found."},
            )

        readings, total = await self._reading_repo.list_by_vehicle(
            vehicle_id=vehicle_id,
            source=source,
            is_test_mode=is_test_mode,
            from_=from_,
            to=to,
            page=page,
            page_size=page_size,
        )
        total_pages = math.ceil(total / page_size) if total > 0 else 1
        return ReadingListResponse(
            data=[ReadingRead.model_validate(r) for r in readings],
            pagination=Pagination(
                page=page,
                page_size=page_size,
                total_items=total,
                total_pages=total_pages,
            ),
        )

    async def list_vehicle_work_orders(
        self,
        vehicle_id: UUID,
        status: Optional[str] = None,
        assigned_technician_id: Optional[UUID] = None,
        from_: Optional[str] = None,
        to: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> WorkOrderListResponse:
        vehicle = await self._vehicle_repo.get_by_id(vehicle_id)
        if vehicle is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "VEHICLE_NOT_FOUND", "message": "Vehicle not found."},
            )

        work_orders, total = await self._work_order_repo.list_by_vehicle(
            vehicle_id=vehicle_id,
            status=status,
            assigned_technician_id=assigned_technician_id,
            from_=from_,
            to=to,
            page=page,
            page_size=page_size,
        )
        total_pages = math.ceil(total / page_size) if total > 0 else 1
        return WorkOrderListResponse(
            data=[WorkOrderRead.model_validate(wo) for wo in work_orders],
            pagination=Pagination(
                page=page,
                page_size=page_size,
                total_items=total,
                total_pages=total_pages,
            ),
        )

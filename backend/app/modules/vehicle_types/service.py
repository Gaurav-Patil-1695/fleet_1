import logging
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.vehicle_types.schemas import (
    VehicleTypeCreate,
    VehicleTypeListResponse,
    VehicleTypeRead,
    VehicleTypeUpdate,
)
from app.repositories.vehicle_type_repository import VehicleTypeRepository

logger = logging.getLogger(__name__)


class VehicleTypeService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = VehicleTypeRepository(db)

    async def list_vehicle_types(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        vehicle_class: str | None = None,
    ) -> VehicleTypeListResponse:
        items, total = await self._repo.list_vehicle_types(
            page=page,
            page_size=page_size,
            search=search,
            vehicle_class=vehicle_class,
        )
        total_pages = max(1, (total + page_size - 1) // page_size)
        data = [VehicleTypeRead.model_validate(item) for item in items]
        return VehicleTypeListResponse(
            data=data,
            pagination={
                "page": page,
                "page_size": page_size,
                "total_items": total,
                "total_pages": total_pages,
            },
        )

    async def create_vehicle_type(self, body: VehicleTypeCreate) -> VehicleTypeRead:
        existing = await self._repo.get_by_name(body.name)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "VEHICLE_TYPE_NAME_CONFLICT",
                    "message": "A vehicle type with this name already exists.",
                },
            )
        vehicle_type = await self._repo.create_vehicle_type(
            name=body.name,
            vehicle_class=body.vehicle_class,
        )
        return VehicleTypeRead.model_validate(vehicle_type)

    async def get_vehicle_type(self, vehicle_type_id: UUID) -> VehicleTypeRead:
        vehicle_type = await self._repo.get_by_id(vehicle_type_id)
        if vehicle_type is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "VEHICLE_TYPE_NOT_FOUND",
                    "message": "Vehicle type not found.",
                },
            )
        return VehicleTypeRead.model_validate(vehicle_type)

    async def update_vehicle_type(
        self, vehicle_type_id: UUID, body: VehicleTypeUpdate
    ) -> VehicleTypeRead:
        vehicle_type = await self._repo.get_by_id(vehicle_type_id)
        if vehicle_type is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "VEHICLE_TYPE_NOT_FOUND",
                    "message": "Vehicle type not found.",
                },
            )
        if body.name is not None and body.name != vehicle_type.name:
            existing = await self._repo.get_by_name(body.name)
            if existing is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "code": "VEHICLE_TYPE_NAME_CONFLICT",
                        "message": "A vehicle type with this name already exists.",
                    },
                )
        updates: dict = {}
        if body.name is not None:
            updates["name"] = body.name
        if body.vehicle_class is not None:
            updates["vehicle_class"] = body.vehicle_class
        updated = await self._repo.update_vehicle_type(vehicle_type_id, updates)
        return VehicleTypeRead.model_validate(updated)

    async def delete_vehicle_type(self, vehicle_type_id: UUID) -> None:
        vehicle_type = await self._repo.get_by_id(vehicle_type_id)
        if vehicle_type is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "VEHICLE_TYPE_NOT_FOUND",
                    "message": "Vehicle type not found.",
                },
            )
        try:
            await self._repo.delete_vehicle_type(vehicle_type_id)
        except Exception as exc:
            logger.error("Failed to delete vehicle type %s: %s", vehicle_type_id, exc)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "VEHICLE_TYPE_IN_USE",
                    "message": "Vehicle type cannot be deleted because it is in use.",
                },
            ) from exc

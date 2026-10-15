from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.middleware.rbac import require_role
from app.models.user import User
from app.modules.vehicle_types.schemas import (
    VehicleTypeCreate,
    VehicleTypeListResponse,
    VehicleTypeRead,
    VehicleTypeUpdate,
)
from app.modules.vehicle_types.service import VehicleTypeService

router = APIRouter(prefix="/vehicle-types", tags=["vehicle-types"])


@router.get(
    "",
    response_model=VehicleTypeListResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role("administrator", "manager", "technician"))],
)
async def list_vehicle_types(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    vehicle_class: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VehicleTypeListResponse:
    service = VehicleTypeService(db)
    return await service.list_vehicle_types(
        page=page,
        page_size=page_size,
        search=search,
        vehicle_class=vehicle_class,
    )


@router.post(
    "",
    response_model=VehicleTypeRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role("administrator"))],
)
async def create_vehicle_type(
    body: VehicleTypeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VehicleTypeRead:
    service = VehicleTypeService(db)
    return await service.create_vehicle_type(body)


@router.get(
    "/{vehicleTypeId}",
    response_model=VehicleTypeRead,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role("administrator", "manager", "technician"))],
)
async def get_vehicle_type(
    vehicleTypeId: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VehicleTypeRead:
    service = VehicleTypeService(db)
    return await service.get_vehicle_type(vehicleTypeId)


@router.put(
    "/{vehicleTypeId}",
    response_model=VehicleTypeRead,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role("administrator"))],
)
async def update_vehicle_type(
    vehicleTypeId: UUID,
    body: VehicleTypeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VehicleTypeRead:
    service = VehicleTypeService(db)
    return await service.update_vehicle_type(vehicleTypeId, body)


@router.delete(
    "/{vehicleTypeId}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role("administrator"))],
)
async def delete_vehicle_type(
    vehicleTypeId: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    service = VehicleTypeService(db)
    await service.delete_vehicle_type(vehicleTypeId)

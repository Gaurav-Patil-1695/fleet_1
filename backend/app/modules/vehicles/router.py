from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.middleware.rbac import require_role
from app.models.user import User
from app.modules.vehicles.schemas import (
    VehicleCreate,
    VehicleListResponse,
    VehicleRead,
    VehicleUpdate,
)
from app.modules.vehicles.service import VehicleService
from app.modules.readings.schemas import ReadingListResponse
from app.modules.work_orders.schemas import WorkOrderListResponse

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


@router.get("", response_model=VehicleListResponse, status_code=status.HTTP_200_OK)
async def list_vehicles(
    depot_id: Optional[UUID] = Query(None),
    vehicle_type_id: Optional[UUID] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    has_telematics: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_role("administrator", "manager", "technician")
    ),
) -> VehicleListResponse:
    service = VehicleService(db)
    return await service.list_vehicles(
        depot_id=depot_id,
        vehicle_type_id=vehicle_type_id,
        status=status_filter,
        has_telematics=has_telematics,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=VehicleRead, status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    body: VehicleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("administrator", "manager")),
) -> VehicleRead:
    service = VehicleService(db)
    return await service.create_vehicle(body)


@router.get(
    "/{vehicleId}", response_model=VehicleRead, status_code=status.HTTP_200_OK
)
async def get_vehicle(
    vehicleId: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_role("administrator", "manager", "technician")
    ),
) -> VehicleRead:
    service = VehicleService(db)
    return await service.get_vehicle(vehicleId)


@router.put(
    "/{vehicleId}", response_model=VehicleRead, status_code=status.HTTP_200_OK
)
async def update_vehicle(
    vehicleId: UUID,
    body: VehicleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("administrator", "manager")),
) -> VehicleRead:
    service = VehicleService(db)
    return await service.update_vehicle(vehicleId, body)


@router.delete("/{vehicleId}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vehicle(
    vehicleId: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("administrator")),
) -> Response:
    service = VehicleService(db)
    await service.delete_vehicle(vehicleId)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/{vehicleId}/readings",
    response_model=ReadingListResponse,
    status_code=status.HTTP_200_OK,
)
async def list_vehicle_readings(
    vehicleId: UUID,
    source: Optional[str] = Query(None),
    is_test_mode: Optional[bool] = Query(None),
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_role("administrator", "manager", "technician")
    ),
) -> ReadingListResponse:
    service = VehicleService(db)
    return await service.list_vehicle_readings(
        vehicle_id=vehicleId,
        source=source,
        is_test_mode=is_test_mode,
        from_=from_,
        to=to,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{vehicleId}/work-orders",
    response_model=WorkOrderListResponse,
    status_code=status.HTTP_200_OK,
)
async def list_vehicle_work_orders(
    vehicleId: UUID,
    status_filter: Optional[str] = Query(None, alias="status"),
    assigned_technician_id: Optional[UUID] = Query(None),
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_role("administrator", "manager", "technician")
    ),
) -> WorkOrderListResponse:
    service = VehicleService(db)
    return await service.list_vehicle_work_orders(
        vehicle_id=vehicleId,
        status=status_filter,
        assigned_technician_id=assigned_technician_id,
        from_=from_,
        to=to,
        page=page,
        page_size=page_size,
    )

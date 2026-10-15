from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.middleware.rbac import require_role
from app.models.user import User
from app.modules.depots.schemas import (
    DepotCreate,
    DepotDashboard,
    DepotListResponse,
    DepotRead,
    DepotUpdate,
)
from app.modules.depots.service import DepotService

router = APIRouter(prefix="/depots", tags=["depots"])


@router.get(
    "",
    response_model=DepotListResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role("administrator", "manager"))],
)
async def list_depots(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=200),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DepotListResponse:
    service = DepotService(db)
    return await service.list_depots(page=page, page_size=pageSize, search=search)


@router.post(
    "",
    response_model=DepotRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role("administrator"))],
)
async def create_depot(
    body: DepotCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DepotRead:
    service = DepotService(db)
    return await service.create_depot(body)


@router.get(
    "/{depotId}",
    response_model=DepotRead,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role("administrator", "manager"))],
)
async def get_depot(
    depotId: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DepotRead:
    service = DepotService(db)
    return await service.get_depot(depotId)


@router.put(
    "/{depotId}",
    response_model=DepotRead,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role("administrator"))],
)
async def update_depot(
    depotId: UUID,
    body: DepotUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DepotRead:
    service = DepotService(db)
    return await service.update_depot(depotId, body)


@router.delete(
    "/{depotId}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role("administrator"))],
)
async def delete_depot(
    depotId: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    service = DepotService(db)
    await service.delete_depot(depotId)


@router.get(
    "/{depotId}/dashboard",
    response_model=DepotDashboard,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role("manager", "technician"))],
)
async def get_depot_dashboard(
    depotId: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DepotDashboard:
    service = DepotService(db)
    return await service.get_depot_dashboard(depotId)

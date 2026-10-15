from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.middleware.rbac import require_role
from app.models.user import User
from app.modules.work_orders.schemas import (
    WorkOrderAssign,
    WorkOrderClose,
    WorkOrderCreate,
    WorkOrderListResponse,
    WorkOrderRead,
    WorkOrderUpdate,
)
from app.modules.work_orders.service import WorkOrderService

router = APIRouter(prefix="/work-orders", tags=["work-orders"])


@router.get(
    "/my",
    response_model=WorkOrderListResponse,
    dependencies=[Depends(require_role("technician"))],
)
async def list_my_work_orders(
    page: str = Query(default="1"),
    page_size: str = Query(default="20"),
    status: str = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkOrderListResponse:
    service = WorkOrderService(db)
    return await service.list_my_work_orders(
        technician_id=current_user.id,
        page=int(page),
        page_size=int(page_size),
        status_filter=status,
    )


@router.get(
    "",
    response_model=WorkOrderListResponse,
    dependencies=[Depends(require_role("manager", "technician"))],
)
async def list_work_orders(
    page: str = Query(default="1"),
    page_size: str = Query(default="20"),
    status: str = Query(default=None),
    depot_id: str = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkOrderListResponse:
    service = WorkOrderService(db)
    return await service.list_work_orders(
        page=int(page),
        page_size=int(page_size),
        status_filter=status,
        depot_id=depot_id,
    )


@router.post(
    "",
    response_model=WorkOrderRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role("administrator", "manager"))],
)
async def create_work_order(
    body: WorkOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkOrderRead:
    service = WorkOrderService(db)
    return await service.create_work_order(body=body, raised_by_user_id=current_user.id)


@router.get(
    "/{work_order_id}",
    response_model=WorkOrderRead,
    dependencies=[Depends(require_role("administrator", "manager", "technician"))],
)
async def get_work_order(
    work_order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkOrderRead:
    service = WorkOrderService(db)
    return await service.get_work_order(work_order_id=work_order_id)


@router.put(
    "/{work_order_id}",
    response_model=WorkOrderRead,
    dependencies=[Depends(require_role("administrator", "manager"))],
)
async def update_work_order(
    work_order_id: UUID,
    body: WorkOrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkOrderRead:
    service = WorkOrderService(db)
    return await service.update_work_order(work_order_id=work_order_id, body=body)


@router.delete(
    "/{work_order_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role("administrator"))],
)
async def delete_work_order(
    work_order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    service = WorkOrderService(db)
    await service.delete_work_order(work_order_id=work_order_id)


@router.post(
    "/{work_order_id}/close",
    response_model=WorkOrderRead,
    dependencies=[Depends(require_role("technician"))],
)
async def close_work_order(
    work_order_id: UUID,
    body: WorkOrderClose,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkOrderRead:
    service = WorkOrderService(db)
    return await service.close_work_order(
        work_order_id=work_order_id,
        body=body,
        closed_by_user_id=current_user.id,
    )


@router.post(
    "/{work_order_id}/assign",
    response_model=WorkOrderRead,
    dependencies=[Depends(require_role("administrator", "manager"))],
)
async def assign_work_order(
    work_order_id: UUID,
    body: WorkOrderAssign,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkOrderRead:
    service = WorkOrderService(db)
    return await service.assign_work_order(work_order_id=work_order_id, body=body)

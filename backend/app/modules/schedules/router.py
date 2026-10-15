from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.middleware.rbac import require_role
from app.models.user import User
from app.modules.schedules.schemas import (
    Schedule,
    ScheduleCreate,
    ScheduleListResponse,
    ScheduleUpdate,
)
from app.modules.schedules.service import ScheduleService

router = APIRouter(prefix="/schedules", tags=["schedules"])


@router.get("", response_model=ScheduleListResponse)
async def list_schedules(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    vehicle_type_id: str | None = Query(None),
    vehicle_class: str | None = Query(None),
    is_active: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_role("administrator", "manager")
    ),
) -> ScheduleListResponse:
    service = ScheduleService(db)
    return await service.list_schedules(
        page=page,
        limit=limit,
        vehicle_type_id=vehicle_type_id,
        vehicle_class=vehicle_class,
        is_active=is_active,
    )


@router.post("", response_model=Schedule, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    body: ScheduleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("administrator")),
) -> Schedule:
    service = ScheduleService(db)
    return await service.create_schedule(body)


@router.get("/{schedule_id}", response_model=Schedule)
async def get_schedule(
    schedule_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_role("administrator", "manager")
    ),
) -> Schedule:
    service = ScheduleService(db)
    schedule = await service.get_schedule(schedule_id)
    if schedule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Schedule not found."},
        )
    return schedule


@router.put("/{schedule_id}", response_model=Schedule)
async def update_schedule(
    schedule_id: UUID,
    body: ScheduleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("administrator")),
) -> Schedule:
    service = ScheduleService(db)
    schedule = await service.update_schedule(schedule_id, body)
    if schedule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Schedule not found."},
        )
    return schedule


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(
    schedule_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("administrator")),
) -> None:
    service = ScheduleService(db)
    deleted = await service.delete_schedule(schedule_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Schedule not found."},
        )

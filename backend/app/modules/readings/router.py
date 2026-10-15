from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.middleware.rbac import require_role
from app.models.user import User
from app.modules.readings.schemas import ReadingCreate, ReadingListResponse, ReadingRead
from app.modules.readings import service as _readings_service_module

router = APIRouter(prefix="/readings", tags=["readings"])


@router.get("", response_model=ReadingListResponse, status_code=status.HTTP_200_OK)
async def list_readings(
    vehicle_id: UUID | None = Query(None),
    source: str | None = Query(None),
    is_test_mode: bool | None = Query(None),
    from_: str | None = Query(None, alias="from"),
    to: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("administrator", "manager")),
) -> ReadingListResponse:
    service = _readings_service_module.ReadingService(db)
    return await service.list_readings(
        vehicle_id=vehicle_id,
        source=source,
        is_test_mode=is_test_mode,
        from_=from_,
        to=to,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=ReadingRead, status_code=status.HTTP_201_CREATED)
async def create_reading(
    body: ReadingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_role("administrator", "manager", "technician")
    ),
) -> ReadingRead:
    service = _readings_service_module.ReadingService(db)
    return await service.create_reading(body=body, current_user=current_user)


@router.get(
    "/{reading_id}", response_model=ReadingRead, status_code=status.HTTP_200_OK
)
async def get_reading(
    reading_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_role("administrator", "manager", "technician")
    ),
) -> ReadingRead:
    service = _readings_service_module.ReadingService(db)
    return await service.get_reading(reading_id=reading_id)

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.modules.telematics.schemas import TelematicsIngestRequest, TelematicsIngestResponse
from app.modules.telematics.service import TelematicsService

router = APIRouter(prefix="/telematics", tags=["telematics"])


@router.post("/ingest", response_model=TelematicsIngestResponse)
async def ingest_telematics_readings(
    body: TelematicsIngestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TelematicsIngestResponse:
    service = TelematicsService(db)
    return await service.ingest_readings(body, current_user)

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class TelematicsReadingPayload(BaseModel):
    vehicle_id: UUID = Field(..., description="Vehicle ID must be a valid UUID.")
    odometer_km: float = Field(..., ge=0, description="Odometer reading must be a non-negative number.")
    reading_timestamp: datetime = Field(..., description="Reading timestamp must be a valid date-time value.")
    raw_payload: dict[str, Any] | None = Field(default=None)


class TelematicsIngestRequest(BaseModel):
    readings: list[TelematicsReadingPayload] = Field(..., min_length=1)

    @field_validator("readings")
    @classmethod
    def readings_not_empty(cls, v: list[TelematicsReadingPayload]) -> list[TelematicsReadingPayload]:
        if not v:
            raise ValueError("At least one telematics reading is required.")
        return v


class TelematicsIngestError(BaseModel):
    vehicle_id: UUID | None = None
    reason: str | None = None


class TelematicsIngestResponse(BaseModel):
    accepted: int
    rejected: int
    errors: list[TelematicsIngestError] = Field(default_factory=list)


# Alias used by service layer
IngestResponse = TelematicsIngestResponse

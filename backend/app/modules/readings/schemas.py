from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class ReadingCreate(BaseModel):
    vehicle_id: UUID = Field(..., description="Vehicle ID must be a valid UUID.")
    odometer_km: float = Field(..., ge=0, description="Odometer reading is required and must be a non-negative number.")
    source: str = Field(..., max_length=20, description="Source must be either 'manual' or 'telematics'.")
    is_test_mode: Optional[bool] = Field(None, description="Test mode must be true or false.")
    raw_payload: Optional[Dict[str, Any]] = None
    reading_timestamp: datetime = Field(..., description="Reading timestamp is required and must be a valid date-time value.")

    @field_validator("source")
    @classmethod
    def validate_source(cls, v: str) -> str:
        allowed = {"manual", "telematics"}
        if v not in allowed:
            raise ValueError("Source must be either 'manual' or 'telematics'.")
        return v

    @field_validator("odometer_km")
    @classmethod
    def validate_odometer_km(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Odometer reading is required and must be a non-negative number.")
        return v


class ReadingRead(BaseModel):
    id: UUID
    vehicle_id: UUID
    recorded_by_user_id: Optional[UUID] = None
    odometer_km: float
    source: str
    is_test_mode: bool
    raw_payload: Optional[Dict[str, Any]] = None
    reading_timestamp: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


# Alias used by the API contract
Reading = ReadingRead


class Pagination(BaseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int


class ReadingListResponse(BaseModel):
    data: List[ReadingRead]
    pagination: Pagination

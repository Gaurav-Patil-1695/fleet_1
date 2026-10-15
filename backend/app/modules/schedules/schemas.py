from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class ScheduleCreate(BaseModel):
    vehicle_type_id: UUID
    vehicle_class: str = Field(..., max_length=50)
    km_interval: int
    month_interval: int
    is_active: bool | None = True

    @field_validator("vehicle_type_id", mode="before")
    @classmethod
    def validate_vehicle_type_id(cls, v: object) -> object:
        if v is None or (isinstance(v, str) and not v.strip()):
            raise ValueError("Vehicle type ID must be a valid UUID.")
        return v

    @field_validator("vehicle_class")
    @classmethod
    def validate_vehicle_class(cls, v: str) -> str:
        if not v or len(v) > 50:
            raise ValueError(
                "Vehicle class is required and must not exceed 50 characters."
            )
        return v

    @field_validator("km_interval")
    @classmethod
    def validate_km_interval(cls, v: int) -> int:
        if v < 1:
            raise ValueError(
                "Kilometre interval is required and must be a positive whole number."
            )
        return v

    @field_validator("month_interval")
    @classmethod
    def validate_month_interval(cls, v: int) -> int:
        if v < 1:
            raise ValueError(
                "Month interval is required and must be a positive whole number."
            )
        return v

    @field_validator("is_active")
    @classmethod
    def validate_is_active(cls, v: bool | None) -> bool | None:
        if v is not None and not isinstance(v, bool):
            raise ValueError("Active status must be true or false.")
        return v


class ScheduleUpdate(BaseModel):
    km_interval: int | None = None
    month_interval: int | None = None
    is_active: bool | None = None

    @field_validator("km_interval")
    @classmethod
    def validate_km_interval(cls, v: int | None) -> int | None:
        if v is not None and v < 1:
            raise ValueError("Kilometre interval must be a positive whole number.")
        return v

    @field_validator("month_interval")
    @classmethod
    def validate_month_interval(cls, v: int | None) -> int | None:
        if v is not None and v < 1:
            raise ValueError("Month interval must be a positive whole number.")
        return v

    @field_validator("is_active")
    @classmethod
    def validate_is_active(cls, v: bool | None) -> bool | None:
        if v is not None and not isinstance(v, bool):
            raise ValueError("Active status must be true or false.")
        return v


class ScheduleRead(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    vehicle_type_id: UUID
    vehicle_class: str
    km_interval: int
    month_interval: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class Pagination(BaseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int


class ScheduleListResponse(BaseModel):
    data: list[ScheduleRead]
    pagination: Pagination


# Alias used by the router and service layers
Schedule = ScheduleRead

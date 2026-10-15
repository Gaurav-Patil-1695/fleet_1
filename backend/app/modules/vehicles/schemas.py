from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class VehicleCreate(BaseModel):
    depot_id: UUID = Field(..., description="Depot ID must be a valid UUID.")
    vehicle_type_id: UUID = Field(..., description="Vehicle type ID must be a valid UUID.")
    registration_number: str = Field(
        ...,
        max_length=20,
        description="Registration number is required and must not exceed 20 characters.",
    )
    make: str = Field(
        ...,
        max_length=100,
        description="Vehicle make is required and must not exceed 100 characters.",
    )
    model: str = Field(
        ...,
        max_length=100,
        description="Vehicle model is required and must not exceed 100 characters.",
    )
    in_service_date: date = Field(
        ...,
        description="In-service date is required and must be a valid date.",
    )
    has_telematics: bool = Field(
        ...,
        description="Telematics flag is required and must be true or false.",
    )
    status: Optional[str] = Field(
        None,
        max_length=30,
        description="Status must not exceed 30 characters.",
    )

    @field_validator("registration_number")
    @classmethod
    def validate_registration_number(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(
                "Registration number is required and must not exceed 20 characters."
            )
        if len(v) > 20:
            raise ValueError(
                "Registration number is required and must not exceed 20 characters."
            )
        return v

    @field_validator("make")
    @classmethod
    def validate_make(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(
                "Vehicle make is required and must not exceed 100 characters."
            )
        if len(v) > 100:
            raise ValueError(
                "Vehicle make is required and must not exceed 100 characters."
            )
        return v

    @field_validator("model")
    @classmethod
    def validate_model(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(
                "Vehicle model is required and must not exceed 100 characters."
            )
        if len(v) > 100:
            raise ValueError(
                "Vehicle model is required and must not exceed 100 characters."
            )
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 30:
            raise ValueError("Status must not exceed 30 characters.")
        if v is not None and v not in ("active", "inactive", "decommissioned"):
            raise ValueError(
                "Status must be one of: active, inactive, decommissioned."
            )
        return v


class VehicleUpdate(BaseModel):
    depot_id: Optional[UUID] = Field(
        None, description="Depot ID must be a valid UUID."
    )
    vehicle_type_id: Optional[UUID] = Field(
        None, description="Vehicle type ID must be a valid UUID."
    )
    registration_number: Optional[str] = Field(
        None,
        max_length=20,
        description="Registration number must not exceed 20 characters.",
    )
    make: Optional[str] = Field(
        None,
        max_length=100,
        description="Vehicle make must not exceed 100 characters.",
    )
    model: Optional[str] = Field(
        None,
        max_length=100,
        description="Vehicle model must not exceed 100 characters.",
    )
    in_service_date: Optional[date] = Field(
        None,
        description="In-service date must be a valid date.",
    )
    has_telematics: Optional[bool] = Field(
        None,
        description="Telematics flag must be true or false.",
    )
    status: Optional[str] = Field(
        None,
        max_length=30,
        description="Status must not exceed 30 characters.",
    )

    @field_validator("registration_number")
    @classmethod
    def validate_registration_number(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 20:
            raise ValueError("Registration number must not exceed 20 characters.")
        return v

    @field_validator("make")
    @classmethod
    def validate_make(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 100:
            raise ValueError("Vehicle make must not exceed 100 characters.")
        return v

    @field_validator("model")
    @classmethod
    def validate_model(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 100:
            raise ValueError("Vehicle model must not exceed 100 characters.")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 30:
            raise ValueError("Status must not exceed 30 characters.")
        if v is not None and v not in ("active", "inactive", "decommissioned"):
            raise ValueError(
                "Status must be one of: active, inactive, decommissioned."
            )
        return v


class VehicleRead(BaseModel):
    id: UUID
    depot_id: UUID
    vehicle_type_id: UUID
    registration_number: str
    make: str
    model: str
    in_service_date: date
    has_telematics: bool
    last_known_odometer_km: Optional[float] = None
    last_odometer_recorded_at: Optional[datetime] = None
    last_serviced_odometer_km: Optional[float] = None
    last_serviced_at: Optional[datetime] = None
    next_service_due_date: Optional[date] = None
    next_service_due_odometer_km: Optional[float] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VehicleDetailRead(VehicleRead):
    """Extended vehicle read schema with additional detail fields if needed."""

    model_config = {"from_attributes": True}


class Pagination(BaseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int


class VehicleListResponse(BaseModel):
    data: List[VehicleRead]
    pagination: Pagination


# Alias used by the router and referenced by the naming contract
Vehicle = VehicleRead

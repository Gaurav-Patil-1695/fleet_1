from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class DepotCreate(BaseModel):
    name: str = Field(..., max_length=150)
    address: str | None = None

    @field_validator("name")
    @classmethod
    def name_required(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(
                "Depot name is required and must not exceed 150 characters."
            )
        if len(v) > 150:
            raise ValueError(
                "Depot name is required and must not exceed 150 characters."
            )
        return v


class DepotUpdate(BaseModel):
    name: str | None = Field(None, max_length=150)
    address: str | None = None

    @field_validator("name")
    @classmethod
    def name_max_length(cls, v: str | None) -> str | None:
        if v is not None and len(v) > 150:
            raise ValueError("Depot name must not exceed 150 characters.")
        return v

    @field_validator("address")
    @classmethod
    def address_valid(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("Enter a valid depot address.")
        return v


class DepotRead(BaseModel):
    id: UUID
    name: str
    address: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# Alias used by the router import
Depot = DepotRead


class Pagination(BaseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int


class DepotListResponse(BaseModel):
    data: list[DepotRead]
    pagination: Pagination


class VehicleServiceSummary(BaseModel):
    vehicle_id: UUID
    registration_number: str
    make: str
    model: str
    last_known_odometer_km: float | None = None
    next_service_due_date: date
    next_service_due_odometer_km: float | None = None


class DepotDashboard(BaseModel):
    depot_id: UUID
    due_for_service: list[VehicleServiceSummary]
    overdue: list[VehicleServiceSummary]


# Alias used in router and service
DepotDashboardResponse = DepotDashboard

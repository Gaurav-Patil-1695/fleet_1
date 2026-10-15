from datetime import datetime
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class VehicleTypeCreate(BaseModel):
    name: str = Field(
        ...,
        max_length=100,
        description="Vehicle type name is required and must not exceed 100 characters.",
    )
    vehicle_class: str = Field(
        ...,
        max_length=50,
        description="Vehicle class is required and must not exceed 50 characters.",
    )

    model_config = {"from_attributes": True}


class VehicleTypeUpdate(BaseModel):
    name: Optional[str] = Field(
        None,
        max_length=100,
        description="Vehicle type name must not exceed 100 characters.",
    )
    vehicle_class: Optional[str] = Field(
        None,
        max_length=50,
        description="Vehicle class must not exceed 50 characters.",
    )

    model_config = {"from_attributes": True}


class VehicleTypeRead(BaseModel):
    id: UUID
    name: str
    vehicle_class: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# Alias used by the router and service
VehicleType = VehicleTypeRead


class Pagination(BaseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int


class VehicleTypeListResponse(BaseModel):
    data: List[VehicleTypeRead]
    pagination: Pagination

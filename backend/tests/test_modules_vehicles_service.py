"""Unit tests for VehicleService (app.modules.vehicles.service)."""
import math
from datetime import date, datetime, timezone
from typing import Optional
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException

from app.modules.vehicles.service import VehicleService
from app.modules.vehicles.schemas import VehicleCreate, VehicleUpdate, VehicleRead

# ---------------------------------------------------------------------------
# Helpers / shared fixtures
# ---------------------------------------------------------------------------

DEPOT_ID = UUID("d1e2f3a4-b5c6-7890-abcd-111111111111")
VEHICLE_TYPE_ID = UUID("db98dfac-4cfe-50e6-96d2-c81126dd0ac1")
VEHICLE_ID = UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")


def _make_vehicle_orm(overrides: dict = None):
    """Return a lightweight mock that looks like a Vehicle ORM row."""
    v = MagicMock()
    v.id = VEHICLE_ID
    v.depot_id = DEPOT_ID
    v.vehicle_type_id = VEHICLE_TYPE_ID
    v.registration_number = "ABC-1234"
    v.make = "Mercedes-Benz"
    v.model = "Sprinter 316"
    v.in_service_date = date(2021, 3, 15)
    v.has_telematics = True
    v.last_known_odometer_km = 87432.5
    v.last_odometer_recorded_at = datetime(2024, 6, 10, 8, 45, tzinfo=timezone.utc)
    v.last_serviced_odometer_km = 80000.0
    v.last_serviced_at = datetime(2024, 1, 22, 10, 0, tzinfo=timezone.utc)
    v.next_service_due_date = date(2024, 7, 22)
    v.next_service_due_odometer_km = 90000.0
    v.status = "active"
    v.created_at = datetime(2021, 3, 15, 9, 0, tzinfo=timezone.utc)
    v.updated_at = datetime(2024, 6, 10, 8, 45, tzinfo=timezone.utc)
    if overrides:
        for k, val in overrides.items():
            setattr(v, k, val)
    return v


def _make_depot():
    d = MagicMock()
    d.id = DEPOT_ID
    d.name = "Main Depot"
    return d


def _make_vehicle_type(vehicle_class="heavy_truck"):
    vt = MagicMock()
    vt.id = VEHICLE_TYPE_ID
    vt.vehicle_class = vehicle_class
    return vt


def _make_service(overrides: dict = None):
    """Build a VehicleService whose repositories are all AsyncMocks."""
    db = AsyncMock()
    svc = VehicleService(db)
    svc._vehicle_repo = AsyncMock()
    svc._depot_repo = AsyncMock()
    svc._vehicle_type_repo = AsyncMock()
    svc._schedule_repo = AsyncMock()
    svc._reading_repo = AsyncMock()
    svc._work_order_repo = AsyncMock()
    return svc


# ---------------------------------------------------------------------------
# 1. list_vehicles – happy path with pagination
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_vehicles_returns_paginated_response():
    svc = _make_service()
    orm_vehicle = _make_vehicle_orm()
    svc._vehicle_repo.list_vehicles = AsyncMock(return_value=([orm_vehicle], 54))

    # Patch VehicleRead.model_validate to avoid ORM mapping complexity
    with patch.object(VehicleRead, "model_validate", return_value=VehicleRead(
        id=orm_vehicle.id,
        depot_id=orm_vehicle.depot_id,
        vehicle_type_id=orm_vehicle.vehicle_type_id,
        registration_number=orm_vehicle.registration_number,
        make=orm_vehicle.make,
        model=orm_vehicle.model,
        in_service_date=orm_vehicle.in_service_date,
        has_telematics=orm_vehicle.has_telematics,
        status=orm_vehicle.status,
        created_at=orm_vehicle.created_at,
        updated_at=orm_vehicle.updated_at,
    )):
        result = await svc.list_vehicles(page=1, page_size=20)

    assert result.pagination.total_items == 54
    assert result.pagination.page == 1
    assert result.pagination.page_size == 20
    assert result.pagination.total_pages == math.ceil(54 / 20)
    assert len(result.data) == 1


# ---------------------------------------------------------------------------
# 2. get_vehicle – happy path
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_vehicle_returns_vehicle_read():
    svc = _make_service()
    orm_vehicle = _make_vehicle_orm()
    svc._vehicle_repo.get_by_id = AsyncMock(return_value=orm_vehicle)

    with patch.object(VehicleRead, "model_validate", return_value=VehicleRead(
        id=orm_vehicle.id,
        depot_id=orm_vehicle.depot_id,
        vehicle_type_id=orm_vehicle.vehicle_type_id,
        registration_number=orm_vehicle.registration_number,
        make=orm_vehicle.make,
        model=orm_vehicle.model,
        in_service_date=orm_vehicle.in_service_date,
        has_telematics=orm_vehicle.has_telematics,
        status=orm_vehicle.status,
        created_at=orm_vehicle.created_at,
        updated_at=orm_vehicle.updated_at,
    )):
        result = await svc.get_vehicle(VEHICLE_ID)

    assert result.id == VEHICLE_ID
    assert result.registration_number == "ABC-1234"


# ---------------------------------------------------------------------------
# 3. get_vehicle – not found raises 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_vehicle_not_found_raises_404():
    svc = _make_service()
    svc._vehicle_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc_info:
        await svc.get_vehicle(VEHICLE_ID)

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail["code"] == "VEHICLE_NOT_FOUND"
    assert exc_info.value.detail["message"] == "Vehicle not found."


# ---------------------------------------------------------------------------
# 4. create_vehicle – happy path (no existing schedule)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_vehicle_happy_path():
    svc = _make_service()
    svc._depot_repo.get_by_id = AsyncMock(return_value=_make_depot())
    svc._vehicle_type_repo.get_by_id = AsyncMock(return_value=_make_vehicle_type())
    svc._vehicle_repo.get_by_registration_number = AsyncMock(return_value=None)
    svc._schedule_repo.get_active_schedule_for_vehicle_class = AsyncMock(return_value=None)

    created_orm = _make_vehicle_orm({"registration_number": "XYZ-9876", "make": "Ford", "model": "Transit Custom", "has_telematics": False, "status": "active"})
    svc._vehicle_repo.create = AsyncMock(return_value=created_orm)

    body = VehicleCreate(
        depot_id=DEPOT_ID,
        vehicle_type_id=VEHICLE_TYPE_ID,
        registration_number="XYZ-9876",
        make="Ford",
        model="Transit Custom",
        in_service_date=date(2024, 6, 1),
        has_telematics=False,
        status="active",
    )

    with patch.object(VehicleRead, "model_validate", return_value=VehicleRead(
        id=created_orm.id,
        depot_id=created_orm.depot_id,
        vehicle_type_id=created_orm.vehicle_type_id,
        registration_number="XYZ-9876",
        make="Ford",
        model="Transit Custom",
        in_service_date=date(2024, 6, 1),
        has_telematics=False,
        status="active",
        created_at=created_orm.created_at,
        updated_at=created_orm.updated_at,
    )):
        result = await svc.create_vehicle(body)

    assert result.registration_number == "XYZ-9876"
    assert result.make == "Ford"
    svc._vehicle_repo.create.assert_awaited_once()


# ---------------------------------------------------------------------------
# 5. create_vehicle – duplicate registration raises 409
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_vehicle_duplicate_registration_raises_409():
    svc = _make_service()
    svc._depot_repo.get_by_id = AsyncMock(return_value=_make_depot())
    svc._vehicle_type_repo.get_by_id = AsyncMock(return_value=_make_vehicle_type())
    svc._vehicle_repo.get_by_registration_number = AsyncMock(return_value=_make_vehicle_orm())

    body = VehicleCreate(
        depot_id=DEPOT_ID,
        vehicle_type_id=VEHICLE_TYPE_ID,
        registration_number="ABC-1234",
        make="Ford",
        model="Transit",
        in_service_date=date(2024, 1, 1),
        has_telematics=False,
        status="active",
    )

    with pytest.raises(HTTPException) as exc_info:
        await svc.create_vehicle(body)

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail["code"] == "REGISTRATION_NUMBER_CONFLICT"
    assert exc_info.value.detail["message"] == "A vehicle with this registration number already exists."


# ---------------------------------------------------------------------------
# 6. create_vehicle – invalid depot raises 400
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_vehicle_invalid_depot_raises_400():
    svc = _make_service()
    svc._depot_repo.get_by_id = AsyncMock(return_value=None)

    body = VehicleCreate(
        depot_id=DEPOT_ID,
        vehicle_type_id=VEHICLE_TYPE_ID,
        registration_number="NEW-001",
        make="Toyota",
        model="HiAce",
        in_service_date=date(2023, 5, 10),
        has_telematics=True,
        status="active",
    )

    with pytest.raises(HTTPException) as exc_info:
        await svc.create_vehicle(body)

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail["code"] == "DEPOT_NOT_FOUND"


# ---------------------------------------------------------------------------
# 7. delete_vehicle – blocks when active work orders exist
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_vehicle_with_active_work_orders_raises_409():
    svc = _make_service()
    svc._vehicle_repo.get_by_id = AsyncMock(return_value=_make_vehicle_orm())
    svc._work_order_repo.count_active_for_vehicle = AsyncMock(return_value=2)

    with pytest.raises(HTTPException) as exc_info:
        await svc.delete_vehicle(VEHICLE_ID)

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail["code"] == "VEHICLE_HAS_ACTIVE_WORK_ORDERS"
    assert exc_info.value.detail["message"] == "Cannot delete a vehicle with active work orders."
    svc._vehicle_repo.delete.assert_not_awaited()


# ---------------------------------------------------------------------------
# 8. list_vehicle_readings – vehicle not found raises 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_vehicle_readings_vehicle_not_found_raises_404():
    svc = _make_service()
    svc._vehicle_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc_info:
        await svc.list_vehicle_readings(vehicle_id=VEHICLE_ID)

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail["code"] == "VEHICLE_NOT_FOUND"
    assert exc_info.value.detail["message"] == "Vehicle not found."

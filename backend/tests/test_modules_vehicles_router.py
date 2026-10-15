"""Smoke tests for the vehicles router."""
from datetime import date, datetime, timezone
from typing import Optional
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.dependencies import get_current_user, get_db
from app.middleware.rbac import require_role
from app.modules.vehicles.schemas import (
    Pagination,
    VehicleListResponse,
    VehicleRead,
)
from app.modules.readings.schemas import ReadingListResponse, ReadingRead, Pagination as ReadingPagination
from app.modules.work_orders.schemas import WorkOrderListResponse, WorkOrderRead, Pagination as WoPagination

# ---------------------------------------------------------------------------
# Shared test data
# ---------------------------------------------------------------------------

DEPOT_ID = UUID("d1e2f3a4-b5c6-7890-abcd-111111111111")
VEHICLE_TYPE_ID = UUID("db98dfac-4cfe-50e6-96d2-c81126dd0ac1")
VEHICLE_ID = UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
NEW_VEHICLE_ID = UUID("b2c3d4e5-f6a7-8901-bcde-fa2345678901")

NOW = datetime(2024, 6, 10, 8, 45, 0, tzinfo=timezone.utc)
CREATED_AT = datetime(2021, 3, 15, 9, 0, 0, tzinfo=timezone.utc)
UPDATED_AT = datetime(2024, 6, 10, 8, 45, 0, tzinfo=timezone.utc)

SAMPLE_VEHICLE = VehicleRead(
    id=VEHICLE_ID,
    depot_id=DEPOT_ID,
    vehicle_type_id=VEHICLE_TYPE_ID,
    registration_number="ABC-1234",
    make="Mercedes-Benz",
    model="Sprinter 316",
    in_service_date=date(2021, 3, 15),
    has_telematics=True,
    last_known_odometer_km=87432.5,
    last_odometer_recorded_at=NOW,
    last_serviced_odometer_km=80000.0,
    last_serviced_at=datetime(2024, 1, 22, 10, 0, 0, tzinfo=timezone.utc),
    next_service_due_date=date(2024, 7, 22),
    next_service_due_odometer_km=90000.0,
    status="active",
    created_at=CREATED_AT,
    updated_at=UPDATED_AT,
)

NEW_VEHICLE = VehicleRead(
    id=NEW_VEHICLE_ID,
    depot_id=DEPOT_ID,
    vehicle_type_id=VEHICLE_TYPE_ID,
    registration_number="XYZ-9876",
    make="Ford",
    model="Transit Custom",
    in_service_date=date(2024, 6, 1),
    has_telematics=False,
    last_known_odometer_km=0.0,
    last_odometer_recorded_at=None,
    last_serviced_odometer_km=None,
    last_serviced_at=None,
    next_service_due_date=None,
    next_service_due_odometer_km=None,
    status="active",
    created_at=datetime(2024, 6, 1, 7, 30, 0, tzinfo=timezone.utc),
    updated_at=datetime(2024, 6, 1, 7, 30, 0, tzinfo=timezone.utc),
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fake_admin_user():
    user = MagicMock()
    user.id = UUID("f4fa6027-7c82-5543-bcaa-201a363fe6a4")
    user.role = "administrator"
    user.is_active = True
    return user


def _fake_manager_user():
    user = MagicMock()
    user.id = UUID("f4fa6027-7c82-5543-bcaa-201a363fe6a5")
    user.role = "manager"
    user.is_active = True
    return user


def _fake_technician_user():
    user = MagicMock()
    user.id = UUID("f4fa6027-7c82-5543-bcaa-201a363fe6a6")
    user.role = "technician"
    user.is_active = True
    return user


def _fake_db():
    return AsyncMock()


def _pagination(page=1, page_size=20, total_items=1, total_pages=1):
    return Pagination(
        page=page,
        page_size=page_size,
        total_items=total_items,
        total_pages=total_pages,
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_list_vehicles_returns_200_with_data(monkeypatch):
    """GET /vehicles returns 200 and vehicle list for authenticated users."""
    expected_response = VehicleListResponse(
        data=[SAMPLE_VEHICLE],
        pagination=_pagination(total_items=54, total_pages=3),
    )

    mock_service = AsyncMock()
    mock_service.list_vehicles = AsyncMock(return_value=expected_response)

    from app.modules.vehicles import service as vehicles_service_module
    monkeypatch.setattr(
        vehicles_service_module,
        "VehicleService",
        lambda db: mock_service,
    )

    admin = _fake_admin_user()
    app.dependency_overrides[get_db] = _fake_db
    app.dependency_overrides[require_role("administrator", "manager", "technician")] = lambda: admin

    try:
        client = TestClient(app)
        response = client.get("/v1/vehicles")
        assert response.status_code == 200
        body = response.json()
        assert "data" in body
        assert "pagination" in body
        assert len(body["data"]) >= 1
        assert body["data"][0]["registration_number"] == "ABC-1234"
        assert body["data"][0]["make"] == "Mercedes-Benz"
    finally:
        app.dependency_overrides.clear()


def test_create_vehicle_returns_201(monkeypatch):
    """POST /vehicles creates a vehicle and returns 201."""
    mock_service = AsyncMock()
    mock_service.create_vehicle = AsyncMock(return_value=NEW_VEHICLE)

    from app.modules.vehicles import service as vehicles_service_module
    monkeypatch.setattr(
        vehicles_service_module,
        "VehicleService",
        lambda db: mock_service,
    )

    admin = _fake_admin_user()
    app.dependency_overrides[get_db] = _fake_db
    app.dependency_overrides[require_role("administrator", "manager")] = lambda: admin

    payload = {
        "depot_id": str(DEPOT_ID),
        "vehicle_type_id": str(VEHICLE_TYPE_ID),
        "registration_number": "XYZ-9876",
        "make": "Ford",
        "model": "Transit Custom",
        "in_service_date": "2024-06-01",
        "has_telematics": False,
        "status": "active",
    }

    try:
        client = TestClient(app)
        response = client.post("/v1/vehicles", json=payload)
        assert response.status_code == 201
        body = response.json()
        assert body["registration_number"] == "XYZ-9876"
        assert body["make"] == "Ford"
        assert body["model"] == "Transit Custom"
        assert body["has_telematics"] is False
        assert body["status"] == "active"
        assert body["depot_id"] == str(DEPOT_ID)
    finally:
        app.dependency_overrides.clear()


def test_get_vehicle_returns_200(monkeypatch):
    """GET /vehicles/{vehicleId} returns 200 with correct vehicle data."""
    mock_service = AsyncMock()
    mock_service.get_vehicle = AsyncMock(return_value=SAMPLE_VEHICLE)

    from app.modules.vehicles import service as vehicles_service_module
    monkeypatch.setattr(
        vehicles_service_module,
        "VehicleService",
        lambda db: mock_service,
    )

    admin = _fake_admin_user()
    app.dependency_overrides[get_db] = _fake_db
    app.dependency_overrides[require_role("administrator", "manager", "technician")] = lambda: admin

    try:
        client = TestClient(app)
        response = client.get(f"/v1/vehicles/{VEHICLE_ID}")
        assert response.status_code == 200
        body = response.json()
        assert body["id"] == str(VEHICLE_ID)
        assert body["registration_number"] == "ABC-1234"
        assert body["has_telematics"] is True
        assert body["last_known_odometer_km"] == 87432.5
    finally:
        app.dependency_overrides.clear()


def test_update_vehicle_returns_200(monkeypatch):
    """PUT /vehicles/{vehicleId} returns 200 with updated data."""
    updated_vehicle = VehicleRead(
        id=VEHICLE_ID,
        depot_id=DEPOT_ID,
        vehicle_type_id=VEHICLE_TYPE_ID,
        registration_number="ABC-1234",
        make="Mercedes-Benz",
        model="Sprinter 319",
        in_service_date=date(2021, 3, 15),
        has_telematics=True,
        last_known_odometer_km=87432.5,
        last_odometer_recorded_at=NOW,
        last_serviced_odometer_km=80000.0,
        last_serviced_at=datetime(2024, 1, 22, 10, 0, 0, tzinfo=timezone.utc),
        next_service_due_date=date(2024, 9, 1),
        next_service_due_odometer_km=95000.0,
        status="active",
        created_at=CREATED_AT,
        updated_at=datetime(2024, 6, 11, 14, 22, 0, tzinfo=timezone.utc),
    )

    mock_service = AsyncMock()
    mock_service.update_vehicle = AsyncMock(return_value=updated_vehicle)

    from app.modules.vehicles import service as vehicles_service_module
    monkeypatch.setattr(
        vehicles_service_module,
        "VehicleService",
        lambda db: mock_service,
    )

    admin = _fake_admin_user()
    app.dependency_overrides[get_db] = _fake_db
    app.dependency_overrides[require_role("administrator", "manager")] = lambda: admin

    payload = {
        "depot_id": str(DEPOT_ID),
        "vehicle_type_id": str(VEHICLE_TYPE_ID),
        "registration_number": "ABC-1234",
        "make": "Mercedes-Benz",
        "model": "Sprinter 319",
        "in_service_date": "2021-03-15",
        "has_telematics": True,
        "status": "active",
    }

    try:
        client = TestClient(app)
        response = client.put(f"/v1/vehicles/{VEHICLE_ID}", json=payload)
        assert response.status_code == 200
        body = response.json()
        assert body["model"] == "Sprinter 319"
        assert body["next_service_due_odometer_km"] == 95000.0
    finally:
        app.dependency_overrides.clear()


def test_delete_vehicle_returns_204(monkeypatch):
    """DELETE /vehicles/{vehicleId} returns 204 for administrator."""
    mock_service = AsyncMock()
    mock_service.delete_vehicle = AsyncMock(return_value=None)

    from app.modules.vehicles import service as vehicles_service_module
    monkeypatch.setattr(
        vehicles_service_module,
        "VehicleService",
        lambda db: mock_service,
    )

    admin = _fake_admin_user()
    app.dependency_overrides[get_db] = _fake_db
    app.dependency_overrides[require_role("administrator")] = lambda: admin

    try:
        client = TestClient(app)
        response = client.delete(f"/v1/vehicles/{VEHICLE_ID}")
        assert response.status_code == 204
    finally:
        app.dependency_overrides.clear()


def test_list_vehicle_readings_returns_200(monkeypatch):
    """GET /vehicles/{vehicleId}/readings returns 200 with readings."""
    reading_id = UUID("c3d4e5f6-a7b8-9012-cdef-ab3456789012")
    user_id = UUID("f4fa6027-7c82-5543-bcaa-201a363fe6a4")
    reading = ReadingRead(
        id=reading_id,
        vehicle_id=VEHICLE_ID,
        recorded_by_user_id=user_id,
        odometer_km=87432.5,
        source="manual",
        is_test_mode=False,
        raw_payload=None,
        reading_timestamp=NOW,
        created_at=NOW,
    )
    readings_response = ReadingListResponse(
        data=[reading],
        pagination=ReadingPagination(page=1, page_size=20, total_items=38, total_pages=2),
    )

    mock_service = AsyncMock()
    mock_service.list_vehicle_readings = AsyncMock(return_value=readings_response)

    from app.modules.vehicles import service as vehicles_service_module
    monkeypatch.setattr(
        vehicles_service_module,
        "VehicleService",
        lambda db: mock_service,
    )

    admin = _fake_admin_user()
    app.dependency_overrides[get_db] = _fake_db
    app.dependency_overrides[require_role("administrator", "manager", "technician")] = lambda: admin

    try:
        client = TestClient(app)
        response = client.get(f"/v1/vehicles/{VEHICLE_ID}/readings")
        assert response.status_code == 200
        body = response.json()
        assert "data" in body
        assert len(body["data"]) == 1
        assert body["data"][0]["source"] == "manual"
        assert body["data"][0]["odometer_km"] == 87432.5
        assert body["pagination"]["total_items"] == 38
    finally:
        app.dependency_overrides.clear()


def test_list_vehicle_work_orders_returns_200(monkeypatch):
    """GET /vehicles/{vehicleId}/work-orders returns 200 with work orders."""
    wo_id = UUID("e5f6a7b8-c9d0-1234-efab-cd5678901234")
    tech_id = UUID("aa701034-5482-5875-97b9-36da864edbe3")
    raiser_id = UUID("f4fa6027-7c82-5543-bcaa-201a363fe6a4")
    wo = WorkOrderRead(
        id=wo_id,
        vehicle_id=VEHICLE_ID,
        depot_id=DEPOT_ID,
        assigned_technician_id=tech_id,
        raised_by_user_id=raiser_id,
        closed_by_user_id=None,
        status="in_progress",
        description="Scheduled 90,000 km service and brake pad replacement.",
        completion_notes=None,
        post_service_odometer_km=None,
        post_service_reading_id=None,
        raised_at=NOW,
        closed_at=None,
        created_at=NOW,
        updated_at=NOW,
    )
    wo_response = WorkOrderListResponse(
        data=[wo],
        pagination=WoPagination(page=1, page_size=20, total_items=3, total_pages=1),
    )

    mock_service = AsyncMock()
    mock_service.list_vehicle_work_orders = AsyncMock(return_value=wo_response)

    from app.modules.vehicles import service as vehicles_service_module
    monkeypatch.setattr(
        vehicles_service_module,
        "VehicleService",
        lambda db: mock_service,
    )

    admin = _fake_admin_user()
    app.dependency_overrides[get_db] = _fake_db
    app.dependency_overrides[require_role("administrator", "manager", "technician")] = lambda: admin

    try:
        client = TestClient(app)
        response = client.get(f"/v1/vehicles/{VEHICLE_ID}/work-orders")
        assert response.status_code == 200
        body = response.json()
        assert "data" in body
        assert len(body["data"]) == 1
        assert body["data"][0]["status"] == "in_progress"
        assert body["pagination"]["total_items"] == 3
    finally:
        app.dependency_overrides.clear()


def test_create_vehicle_validation_error_missing_required_fields():
    """POST /vehicles returns 422 when required fields are missing."""
    admin = _fake_admin_user()
    app.dependency_overrides[get_db] = _fake_db
    app.dependency_overrides[require_role("administrator", "manager")] = lambda: admin

    # Missing make, model, in_service_date, has_telematics
    payload = {
        "depot_id": str(DEPOT_ID),
        "vehicle_type_id": str(VEHICLE_TYPE_ID),
        "registration_number": "XYZ-9876",
    }

    try:
        client = TestClient(app)
        response = client.post("/v1/vehicles", json=payload)
        assert response.status_code == 422
    finally:
        app.dependency_overrides.clear()

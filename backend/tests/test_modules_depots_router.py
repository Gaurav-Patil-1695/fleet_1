"""Smoke tests for the depots router."""
from datetime import datetime, date
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.dependencies import get_current_user, get_db
from app.middleware.rbac import require_role
from app.modules.depots.schemas import (
    DepotRead,
    DepotListResponse,
    DepotDashboard,
    Pagination,
    VehicleServiceSummary,
)
from app.modules.depots.service import DepotService


# ---------------------------------------------------------------------------
# Helpers / shared data
# ---------------------------------------------------------------------------

DEPOT_ID = UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
NOW = datetime(2024, 1, 10, 8, 0, 0)

SAMPLE_DEPOT = DepotRead(
    id=DEPOT_ID,
    name="North Depot",
    address="123 Industrial Ave, Springfield, IL 62701",
    created_at=NOW,
    updated_at=NOW,
)


def _make_admin_user():
    user = MagicMock()
    user.role = "administrator"
    user.id = UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
    return user


def _make_manager_user():
    user = MagicMock()
    user.role = "manager"
    user.id = UUID("aaaaaaaa-bbbb-cccc-dddd-ffffffffffff")
    return user


def _noop_require_role(*roles):
    """Return a dependency that always succeeds (no RBAC enforcement)."""
    async def _inner():
        pass
    return _inner


@pytest.fixture(autouse=True)
def clear_overrides():
    """Ensure dependency overrides are cleaned up after every test."""
    yield
    app.dependency_overrides.clear()


@pytest.fixture()
def client():
    return TestClient(app, raise_server_exceptions=False)


def _override_db():
    """Return an empty async mock session."""
    db = AsyncMock()
    return db


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_list_depots_returns_200_with_pagination(client):
    """GET /v1/depots returns 200 with data and pagination fields."""
    depot2_id = UUID("b2c3d4e5-f6a7-8901-bcde-f12345678901")
    sample_response = DepotListResponse(
        data=[
            SAMPLE_DEPOT,
            DepotRead(
                id=depot2_id,
                name="South Depot",
                address="456 Commerce Blvd, Springfield, IL 62702",
                created_at=NOW,
                updated_at=NOW,
            ),
        ],
        pagination=Pagination(page=1, page_size=20, total_items=2, total_pages=1),
    )

    mock_service = AsyncMock(spec=DepotService)
    mock_service.list_depots.return_value = sample_response

    app.dependency_overrides[get_db] = lambda: _override_db()
    app.dependency_overrides[get_current_user] = lambda: _make_admin_user()
    app.dependency_overrides[require_role] = _noop_require_role

    # Patch the service inside the router module
    import app.modules.depots.router as depot_router
    original = depot_router.DepotService
    depot_router.DepotService = lambda db: mock_service
    try:
        resp = client.get("/v1/depots")
    finally:
        depot_router.DepotService = original

    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    assert "pagination" in body
    assert body["pagination"]["total_items"] == 2
    assert body["pagination"]["page"] == 1
    assert len(body["data"]) == 2


def test_create_depot_returns_201(client):
    """POST /v1/depots returns 201 with the created depot."""
    new_id = UUID("c3d4e5f6-a7b8-9012-cdef-123456789012")
    created = DepotRead(
        id=new_id,
        name="East Depot",
        address="789 Logistics Park, Springfield, IL 62703",
        created_at=datetime(2024, 4, 1, 10, 0, 0),
        updated_at=datetime(2024, 4, 1, 10, 0, 0),
    )

    mock_service = AsyncMock(spec=DepotService)
    mock_service.create_depot.return_value = created

    app.dependency_overrides[get_db] = lambda: _override_db()
    app.dependency_overrides[get_current_user] = lambda: _make_admin_user()
    app.dependency_overrides[require_role] = _noop_require_role

    import app.modules.depots.router as depot_router
    original = depot_router.DepotService
    depot_router.DepotService = lambda db: mock_service
    try:
        resp = client.post(
            "/v1/depots",
            json={"name": "East Depot", "address": "789 Logistics Park, Springfield, IL 62703"},
        )
    finally:
        depot_router.DepotService = original

    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "East Depot"
    assert body["address"] == "789 Logistics Park, Springfield, IL 62703"
    assert body["id"] == str(new_id)


def test_get_depot_returns_200(client):
    """GET /v1/depots/{depot_id} returns 200 with depot details."""
    mock_service = AsyncMock(spec=DepotService)
    mock_service.get_depot.return_value = SAMPLE_DEPOT

    app.dependency_overrides[get_db] = lambda: _override_db()
    app.dependency_overrides[get_current_user] = lambda: _make_admin_user()
    app.dependency_overrides[require_role] = _noop_require_role

    import app.modules.depots.router as depot_router
    original = depot_router.DepotService
    depot_router.DepotService = lambda db: mock_service
    try:
        resp = client.get(f"/v1/depots/{DEPOT_ID}")
    finally:
        depot_router.DepotService = original

    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == str(DEPOT_ID)
    assert body["name"] == "North Depot"


def test_update_depot_returns_200(client):
    """PUT /v1/depots/{depot_id} returns 200 with updated depot."""
    updated = DepotRead(
        id=DEPOT_ID,
        name="North Depot (Relocated)",
        address="321 New Industrial Ave, Springfield, IL 62701",
        created_at=NOW,
        updated_at=datetime(2024, 4, 5, 9, 45, 0),
    )

    mock_service = AsyncMock(spec=DepotService)
    mock_service.update_depot.return_value = updated

    app.dependency_overrides[get_db] = lambda: _override_db()
    app.dependency_overrides[get_current_user] = lambda: _make_admin_user()
    app.dependency_overrides[require_role] = _noop_require_role

    import app.modules.depots.router as depot_router
    original = depot_router.DepotService
    depot_router.DepotService = lambda db: mock_service
    try:
        resp = client.put(
            f"/v1/depots/{DEPOT_ID}",
            json={
                "name": "North Depot (Relocated)",
                "address": "321 New Industrial Ave, Springfield, IL 62701",
            },
        )
    finally:
        depot_router.DepotService = original

    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "North Depot (Relocated)"
    assert body["address"] == "321 New Industrial Ave, Springfield, IL 62701"


def test_delete_depot_returns_204(client):
    """DELETE /v1/depots/{depot_id} returns 204 with no body."""
    mock_service = AsyncMock(spec=DepotService)
    mock_service.delete_depot.return_value = None

    app.dependency_overrides[get_db] = lambda: _override_db()
    app.dependency_overrides[get_current_user] = lambda: _make_admin_user()
    app.dependency_overrides[require_role] = _noop_require_role

    import app.modules.depots.router as depot_router
    original = depot_router.DepotService
    depot_router.DepotService = lambda db: mock_service
    try:
        resp = client.delete(f"/v1/depots/{DEPOT_ID}")
    finally:
        depot_router.DepotService = original

    assert resp.status_code == 204
    assert resp.content == b""


def test_get_depot_dashboard_returns_due_and_overdue(client):
    """GET /v1/depots/{depot_id}/dashboard returns due_for_service and overdue lists (REQ-1)."""
    dashboard_depot_id = UUID("f47ac10b-58cc-4afd-a567-0b576ea13e09")
    vehicle1_id = UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
    vehicle2_id = UUID("b2c3d4e5-f6a7-8901-bcde-f12345678901")

    dashboard = DepotDashboard(
        depot_id=dashboard_depot_id,
        due_for_service=[
            VehicleServiceSummary(
                vehicle_id=vehicle1_id,
                registration_number="ABC-1234",
                make="Toyota",
                model="HiAce",
                last_known_odometer_km=48500.0,
                next_service_due_date=date(2024, 8, 15),
                next_service_due_odometer_km=50000.0,
            )
        ],
        overdue=[
            VehicleServiceSummary(
                vehicle_id=vehicle2_id,
                registration_number="XYZ-5678",
                make="Ford",
                model="Transit",
                last_known_odometer_km=75200.0,
                next_service_due_date=date(2024, 7, 1),
                next_service_due_odometer_km=70000.0,
            )
        ],
    )

    mock_service = AsyncMock(spec=DepotService)
    mock_service.get_depot_dashboard.return_value = dashboard

    app.dependency_overrides[get_db] = lambda: _override_db()
    app.dependency_overrides[get_current_user] = lambda: _make_manager_user()
    app.dependency_overrides[require_role] = _noop_require_role

    import app.modules.depots.router as depot_router
    original = depot_router.DepotService
    depot_router.DepotService = lambda db: mock_service
    try:
        resp = client.get(f"/v1/depots/{dashboard_depot_id}/dashboard")
    finally:
        depot_router.DepotService = original

    assert resp.status_code == 200
    body = resp.json()
    assert body["depot_id"] == str(dashboard_depot_id)
    assert len(body["due_for_service"]) == 1
    assert len(body["overdue"]) == 1
    # Validate sample payload fields
    due_entry = body["due_for_service"][0]
    assert due_entry["registration_number"] == "ABC-1234"
    assert due_entry["make"] == "Toyota"
    assert due_entry["model"] == "HiAce"
    assert due_entry["last_known_odometer_km"] == 48500.0
    overdue_entry = body["overdue"][0]
    assert overdue_entry["registration_number"] == "XYZ-5678"
    assert overdue_entry["last_known_odometer_km"] == 75200.0


def test_create_depot_name_validation_too_long(client):
    """POST /v1/depots rejects name longer than 150 chars with validation message."""
    app.dependency_overrides[get_db] = lambda: _override_db()
    app.dependency_overrides[get_current_user] = lambda: _make_admin_user()
    app.dependency_overrides[require_role] = _noop_require_role

    import app.modules.depots.router as depot_router
    mock_service = AsyncMock(spec=DepotService)
    original = depot_router.DepotService
    depot_router.DepotService = lambda db: mock_service
    try:
        resp = client.post(
            "/v1/depots",
            json={"name": "A" * 151, "address": "Some address"},
        )
    finally:
        depot_router.DepotService = original

    assert resp.status_code == 422


def test_get_depot_not_found_returns_404(client):
    """GET /v1/depots/{depot_id} propagates 404 when depot does not exist."""
    from fastapi import HTTPException

    mock_service = AsyncMock(spec=DepotService)
    mock_service.get_depot.side_effect = HTTPException(
        status_code=404,
        detail={"code": "DEPOT_NOT_FOUND", "message": "Depot not found."},
    )

    app.dependency_overrides[get_db] = lambda: _override_db()
    app.dependency_overrides[get_current_user] = lambda: _make_admin_user()
    app.dependency_overrides[require_role] = _noop_require_role

    import app.modules.depots.router as depot_router
    original = depot_router.DepotService
    depot_router.DepotService = lambda db: mock_service
    try:
        missing_id = UUID("00000000-0000-0000-0000-000000000000")
        resp = client.get(f"/v1/depots/{missing_id}")
    finally:
        depot_router.DepotService = original

    assert resp.status_code == 404

"""Smoke tests for the vehicle-types router."""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.dependencies import get_current_user, get_db
from app.main import app
from app.middleware.rbac import require_role
from app.modules.vehicle_types.schemas import (
    VehicleTypeListResponse,
    VehicleTypeRead,
    Pagination,
)

# ---------------------------------------------------------------------------
# Shared constants
# ---------------------------------------------------------------------------
VT_ID_1 = UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
VT_ID_2 = UUID("b2c3d4e5-f6a7-8901-bcde-f12345678901")
NOW = datetime(2023, 1, 15, 8, 0, 0, tzinfo=timezone.utc)
NOW2 = datetime(2023, 6, 10, 14, 30, 0, tzinfo=timezone.utc)


def _make_vt_read(
    vt_id: UUID = VT_ID_1,
    name: str = "Standard City Bus",
    vehicle_class: str = "heavy_truck",
    created_at: datetime = NOW,
    updated_at: datetime = NOW2,
) -> VehicleTypeRead:
    return VehicleTypeRead(
        id=vt_id,
        name=name,
        vehicle_class=vehicle_class,
        created_at=created_at,
        updated_at=updated_at,
    )


# ---------------------------------------------------------------------------
# Fake user helpers
# ---------------------------------------------------------------------------

def _fake_user(role: str = "administrator"):
    u = MagicMock()
    u.id = UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    u.role = role
    u.is_active = True
    return u


def _noop_require_role(*_roles):
    """Returns a dependency that does nothing (bypasses RBAC)."""
    async def _dep():
        return None
    return _dep


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _clear_overrides():
    """Ensure dependency overrides are cleared after each test."""
    yield
    app.dependency_overrides.clear()


@pytest.fixture()
def client():
    return TestClient(app, raise_server_exceptions=False)


def _setup_overrides(role: str = "administrator", service_mock=None):
    """Inject fake db session, current user, role check, and optionally patch service."""
    fake_db = AsyncMock()
    app.dependency_overrides[get_db] = lambda: fake_db
    app.dependency_overrides[get_current_user] = lambda: _fake_user(role)
    # Patch require_role globally so all route-level dependencies pass
    app.dependency_overrides[require_role] = _noop_require_role
    return fake_db


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_list_vehicle_types_returns_200(client, monkeypatch):
    """GET /v1/vehicle-types returns 200 with paginated data."""
    _setup_overrides(role="administrator")

    vt1 = _make_vt_read(VT_ID_1, "Standard City Bus", "heavy_truck")
    vt2 = _make_vt_read(VT_ID_2, "Midi Coach", "light_commercial",
                        datetime(2023, 2, 20, 9, 15, 0, tzinfo=timezone.utc),
                        datetime(2023, 7, 5, 11, 45, 0, tzinfo=timezone.utc))
    expected_response = VehicleTypeListResponse(
        data=[vt1, vt2],
        pagination=Pagination(page=1, page_size=20, total_items=2, total_pages=1),
    )

    async def fake_list(*args, **kwargs):
        return expected_response

    from app.modules.vehicle_types import service as svc_module
    monkeypatch.setattr(svc_module.VehicleTypeService, "list_vehicle_types", fake_list)

    resp = client.get("/v1/vehicle-types")
    assert resp.status_code == 200
    body = resp.json()
    assert body["pagination"]["total_items"] == 2
    assert body["pagination"]["page"] == 1
    assert len(body["data"]) == 2
    assert body["data"][0]["name"] == "Standard City Bus"


def test_create_vehicle_type_returns_201(client, monkeypatch):
    """POST /v1/vehicle-types creates a vehicle type and returns 201."""
    _setup_overrides(role="administrator")

    new_vt = _make_vt_read(
        UUID("c3d4e5f6-a7b8-9012-cdef-123456789012"),
        "Articulated Bus",
        "heavy_truck",
        datetime(2024, 3, 1, 10, 0, 0, tzinfo=timezone.utc),
        datetime(2024, 3, 1, 10, 0, 0, tzinfo=timezone.utc),
    )

    async def fake_create(self, body):
        return new_vt

    from app.modules.vehicle_types import service as svc_module
    monkeypatch.setattr(svc_module.VehicleTypeService, "create_vehicle_type", fake_create)

    resp = client.post("/v1/vehicle-types", json={"name": "Articulated Bus", "vehicle_class": "Heavy"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Articulated Bus"
    assert body["vehicle_class"] == "heavy_truck"
    assert body["id"] == "c3d4e5f6-a7b8-9012-cdef-123456789012"


def test_get_vehicle_type_returns_200(client, monkeypatch):
    """GET /v1/vehicle-types/{vehicleTypeId} returns 200 for existing type."""
    _setup_overrides(role="technician")

    vt = _make_vt_read(VT_ID_1, "Standard City Bus", "heavy_truck")

    async def fake_get(self, vehicle_type_id):
        return vt

    from app.modules.vehicle_types import service as svc_module
    monkeypatch.setattr(svc_module.VehicleTypeService, "get_vehicle_type", fake_get)

    resp = client.get(f"/v1/vehicle-types/{VT_ID_1}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == str(VT_ID_1)
    assert body["name"] == "Standard City Bus"
    assert body["vehicle_class"] == "heavy_truck"


def test_get_vehicle_type_not_found_returns_404(client, monkeypatch):
    """GET /v1/vehicle-types/{vehicleTypeId} returns 404 when not found."""
    _setup_overrides(role="administrator")

    from fastapi import HTTPException, status as http_status

    async def fake_get(self, vehicle_type_id):
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail={
                "code": "VEHICLE_TYPE_NOT_FOUND",
                "message": "Vehicle type not found.",
            },
        )

    from app.modules.vehicle_types import service as svc_module
    monkeypatch.setattr(svc_module.VehicleTypeService, "get_vehicle_type", fake_get)

    resp = client.get(f"/v1/vehicle-types/{VT_ID_1}")
    assert resp.status_code == 404


def test_update_vehicle_type_returns_200(client, monkeypatch):
    """PUT /v1/vehicle-types/{vehicleTypeId} updates and returns 200."""
    _setup_overrides(role="administrator")

    updated_vt = _make_vt_read(
        VT_ID_1,
        "Standard City Bus (Revised)",
        "heavy_truck",
        NOW,
        datetime(2024, 4, 22, 9, 0, 0, tzinfo=timezone.utc),
    )

    async def fake_update(self, vehicle_type_id, body):
        return updated_vt

    from app.modules.vehicle_types import service as svc_module
    monkeypatch.setattr(svc_module.VehicleTypeService, "update_vehicle_type", fake_update)

    resp = client.put(
        f"/v1/vehicle-types/{VT_ID_1}",
        json={"name": "Standard City Bus (Revised)", "vehicle_class": "Heavy"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "Standard City Bus (Revised)"
    assert body["vehicle_class"] == "heavy_truck"


def test_delete_vehicle_type_returns_204(client, monkeypatch):
    """DELETE /v1/vehicle-types/{vehicleTypeId} returns 204 on success."""
    _setup_overrides(role="administrator")

    async def fake_delete(self, vehicle_type_id):
        return None

    from app.modules.vehicle_types import service as svc_module
    monkeypatch.setattr(svc_module.VehicleTypeService, "delete_vehicle_type", fake_delete)

    resp = client.delete(f"/v1/vehicle-types/{VT_ID_1}")
    assert resp.status_code == 204


def test_create_vehicle_type_conflict_returns_409(client, monkeypatch):
    """POST /v1/vehicle-types returns 409 when name already exists."""
    _setup_overrides(role="administrator")

    from fastapi import HTTPException, status as http_status

    async def fake_create(self, body):
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail={
                "code": "VEHICLE_TYPE_NAME_CONFLICT",
                "message": "A vehicle type with this name already exists.",
            },
        )

    from app.modules.vehicle_types import service as svc_module
    monkeypatch.setattr(svc_module.VehicleTypeService, "create_vehicle_type", fake_create)

    resp = client.post("/v1/vehicle-types", json={"name": "Standard City Bus", "vehicle_class": "heavy_truck"})
    assert resp.status_code == 409


def test_create_vehicle_type_missing_required_fields_returns_422(client):
    """POST /v1/vehicle-types with missing name/vehicle_class returns 422."""
    _setup_overrides(role="administrator")

    resp = client.post("/v1/vehicle-types", json={})
    assert resp.status_code == 422

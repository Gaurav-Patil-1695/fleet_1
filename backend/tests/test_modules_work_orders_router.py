"""Smoke tests for app.modules.work_orders.router."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.dependencies import get_current_user, get_db
from app.main import app
from app.middleware.rbac import require_role
from app.modules.work_orders.schemas import (
    Pagination,
    WorkOrderListResponse,
    WorkOrderRead,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

NOW = datetime(2024, 6, 10, 7, 30, 0, tzinfo=timezone.utc)

WO_ID = uuid.UUID("a1b2c3d4-0010-4000-8000-000000000010")
VEHICLE_ID = uuid.UUID("b2c3d4e5-0002-4000-8000-000000000002")
DEPOT_ID = uuid.UUID("c3d4e5f6-0003-4000-8000-000000000003")
TECH_ID = uuid.UUID("d4e5f6a7-0004-4000-8000-000000000004")
USER_ID = uuid.UUID("e5f6a7b8-0005-4000-8000-000000000005")
READING_ID = uuid.UUID("f7a8b9c0-0006-4000-8000-000000000006")


def _make_wo(**overrides) -> WorkOrderRead:
    base = dict(
        id=WO_ID,
        vehicle_id=VEHICLE_ID,
        depot_id=DEPOT_ID,
        assigned_technician_id=None,
        raised_by_user_id=USER_ID,
        closed_by_user_id=None,
        status="open",
        description="Scheduled 10,000 km service – oil, filters, tyre rotation",
        completion_notes=None,
        post_service_odometer_km=None,
        post_service_reading_id=None,
        raised_at=NOW,
        closed_at=None,
        created_at=NOW,
        updated_at=NOW,
    )
    base.update(overrides)
    return WorkOrderRead(**base)


def _make_list_response(items=None, total=1) -> WorkOrderListResponse:
    items = items or [_make_wo()]
    return WorkOrderListResponse(
        data=items,
        pagination=Pagination(page=1, page_size=20, total_items=total, total_pages=1),
    )


def _fake_db():
    return MagicMock()


def _make_user(role: str = "manager"):
    u = MagicMock()
    u.id = USER_ID
    u.role = role
    return u


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def client():
    """TestClient with all dependencies overridden; cleaned up after every test."""
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


def _override_role(*_roles):
    """Return a no-op dependency that replaces require_role for any role set."""
    def _dep():
        return None
    return _dep


def _install_overrides(role: str = "manager"):
    """Install db, current_user and all require_role overrides."""
    app.dependency_overrides[get_db] = lambda: _fake_db()
    app.dependency_overrides[get_current_user] = lambda: _make_user(role)
    # Blanket override for every require_role variant used in the router
    for roles in [
        ("technician",),
        ("manager", "technician"),
        ("administrator", "manager"),
        ("administrator", "manager", "technician"),
        ("administrator",),
    ]:
        dep = require_role(*roles)
        app.dependency_overrides[dep] = _override_role(*roles)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_list_work_orders_returns_200(client):
    """GET /work-orders returns 200 with data + pagination."""
    _install_overrides("manager")
    expected = _make_list_response(total=42)

    with patch(
        "app.modules.work_orders.service.WorkOrderService.list_work_orders",
        new=AsyncMock(return_value=expected),
    ):
        resp = client.get("/v1/work-orders")

    assert resp.status_code == 200
    body = resp.json()
    assert body["pagination"]["total_items"] == 42
    assert len(body["data"]) == 1
    assert body["data"][0]["status"] == "open"


def test_create_work_order_returns_201(client):
    """POST /work-orders creates a work order and returns 201."""
    _install_overrides("manager")
    wo = _make_wo()

    with patch(
        "app.modules.work_orders.service.WorkOrderService.create_work_order",
        new=AsyncMock(return_value=wo),
    ):
        resp = client.post(
            "/v1/work-orders",
            json={
                "vehicle_id": str(VEHICLE_ID),
                "depot_id": str(DEPOT_ID),
                "description": "Scheduled 10,000 km service – oil, filters, tyre rotation",
            },
        )

    assert resp.status_code == 201
    body = resp.json()
    assert body["vehicle_id"] == str(VEHICLE_ID)
    assert body["depot_id"] == str(DEPOT_ID)
    assert body["status"] == "open"


def test_get_work_order_returns_200(client):
    """GET /work-orders/{id} returns the work order."""
    _install_overrides("manager")
    wo = _make_wo(assigned_technician_id=TECH_ID)

    with patch(
        "app.modules.work_orders.service.WorkOrderService.get_work_order",
        new=AsyncMock(return_value=wo),
    ):
        resp = client.get(f"/v1/work-orders/{WO_ID}")

    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == str(WO_ID)
    assert body["assigned_technician_id"] == str(TECH_ID)


def test_assign_work_order_transitions_to_in_progress(client):
    """POST /work-orders/{id}/assign assigns technician; status becomes in_progress."""
    _install_overrides("manager")
    assigned = _make_wo(assigned_technician_id=TECH_ID, status="in_progress")

    with patch(
        "app.modules.work_orders.service.WorkOrderService.assign_work_order",
        new=AsyncMock(return_value=assigned),
    ):
        resp = client.post(
            f"/v1/work-orders/{WO_ID}/assign",
            json={"assigned_technician_id": str(TECH_ID)},
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["assigned_technician_id"] == str(TECH_ID)
    assert body["status"] == "in_progress"


def test_close_work_order_resets_service_clock(client):
    """POST /work-orders/{id}/close closes the order and records odometer."""
    _install_overrides("technician")
    closed_wo = _make_wo(
        status="closed",
        completion_notes="Oil changed, brake pads replaced on front axle, tyres rotated. Vehicle in good condition.",
        post_service_odometer_km=Decimal("10234.5"),
        post_service_reading_id=READING_ID,
        closed_by_user_id=TECH_ID,
        assigned_technician_id=TECH_ID,
        closed_at=datetime(2024, 6, 10, 15, 0, 0, tzinfo=timezone.utc),
    )

    with patch(
        "app.modules.work_orders.service.WorkOrderService.close_work_order",
        new=AsyncMock(return_value=closed_wo),
    ):
        resp = client.post(
            f"/v1/work-orders/{WO_ID}/close",
            json={
                "completion_notes": "Oil changed, brake pads replaced on front axle, tyres rotated. Vehicle in good condition.",
                "post_service_odometer_km": 10234.5,
            },
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "closed"
    assert body["closed_by_user_id"] == str(TECH_ID)
    assert body["post_service_reading_id"] == str(READING_ID)
    assert float(body["post_service_odometer_km"]) == pytest.approx(10234.5)


def test_create_work_order_missing_vehicle_id_returns_422(client):
    """POST /work-orders without vehicle_id fails schema validation."""
    _install_overrides("manager")
    resp = client.post(
        "/v1/work-orders",
        json={
            "depot_id": str(DEPOT_ID),
            "description": "Some description",
        },
    )
    assert resp.status_code == 422


def test_close_work_order_missing_completion_notes_returns_422(client):
    """POST /work-orders/{id}/close without completion_notes fails schema validation."""
    _install_overrides("technician")
    resp = client.post(
        f"/v1/work-orders/{WO_ID}/close",
        json={"post_service_odometer_km": 10234.5},
    )
    assert resp.status_code == 422


def test_list_my_work_orders_returns_200(client):
    """GET /work-orders/my returns technician's work orders."""
    # Use technician role for this endpoint
    app.dependency_overrides[get_db] = lambda: _fake_db()
    tech_user = _make_user("technician")
    tech_user.id = TECH_ID
    app.dependency_overrides[get_current_user] = lambda: tech_user
    for roles in [
        ("technician",),
        ("manager", "technician"),
        ("administrator", "manager"),
        ("administrator", "manager", "technician"),
        ("administrator",),
    ]:
        dep = require_role(*roles)
        app.dependency_overrides[dep] = _override_role(*roles)

    my_wo = _make_wo(assigned_technician_id=TECH_ID)
    expected = WorkOrderListResponse(
        data=[my_wo],
        pagination=Pagination(page=1, page_size=20, total_items=1, total_pages=1),
    )

    with patch(
        "app.modules.work_orders.service.WorkOrderService.list_my_work_orders",
        new=AsyncMock(return_value=expected),
    ):
        resp = client.get("/v1/work-orders/my")

    assert resp.status_code == 200
    body = resp.json()
    assert body["pagination"]["total_items"] == 1
    assert body["data"][0]["assigned_technician_id"] == str(TECH_ID)

"""Smoke tests for app.modules.schedules.router."""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.dependencies import get_current_user, get_db
from app.main import app
from app.middleware.rbac import require_role
from app.modules.schedules.schemas import (
    Pagination,
    Schedule,
    ScheduleListResponse,
)

# ---------------------------------------------------------------------------
# Fixed IDs used across tests (match sample payloads)
# ---------------------------------------------------------------------------
SCHEDULE_ID = UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
VEHICLE_TYPE_ID = UUID("b2c3d4e5-f6a7-8901-bcde-f12345678901")

CREATED_AT = datetime(2024, 1, 15, 8, 0, 0, tzinfo=timezone.utc)
UPDATED_AT = datetime(2024, 3, 10, 12, 30, 0, tzinfo=timezone.utc)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_schedule(
    schedule_id: UUID = SCHEDULE_ID,
    vehicle_type_id: UUID = VEHICLE_TYPE_ID,
    vehicle_class: str = "heavy_truck",
    km_interval: int = 10000,
    month_interval: int = 6,
    is_active: bool = True,
    created_at: datetime = CREATED_AT,
    updated_at: datetime = UPDATED_AT,
) -> Schedule:
    return Schedule(
        id=schedule_id,
        vehicle_type_id=vehicle_type_id,
        vehicle_class=vehicle_class,
        km_interval=km_interval,
        month_interval=month_interval,
        is_active=is_active,
        created_at=created_at,
        updated_at=updated_at,
    )


def _make_admin_user():
    user = MagicMock()
    user.id = uuid4()
    user.role = "administrator"
    user.is_active = True
    return user


def _make_manager_user():
    user = MagicMock()
    user.id = uuid4()
    user.role = "manager"
    user.is_active = True
    return user


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def clear_overrides():
    """Ensure overrides are cleaned up after every test."""
    yield
    app.dependency_overrides.clear()


@pytest.fixture()
def client():
    return TestClient(app, raise_server_exceptions=True)


# ---------------------------------------------------------------------------
# 1. GET /schedules  — list returns pagination + data
# ---------------------------------------------------------------------------

def test_list_schedules_returns_200(client):
    schedule = _make_schedule()
    expected_response = ScheduleListResponse(
        data=[schedule],
        pagination=Pagination(page=1, page_size=20, total_items=1, total_pages=1),
    )

    mock_service = AsyncMock()
    mock_service.list_schedules.return_value = expected_response

    # Patch ScheduleService inside the router module
    import app.modules.schedules.router as schedule_router
    original = schedule_router.ScheduleService
    schedule_router.ScheduleService = MagicMock(return_value=mock_service)

    app.dependency_overrides[get_db] = lambda: AsyncMock()
    app.dependency_overrides[require_role("administrator", "manager")] = lambda: _make_admin_user()

    try:
        resp = client.get("/v1/schedules")
    finally:
        schedule_router.ScheduleService = original

    assert resp.status_code == 200
    body = resp.json()
    assert body["pagination"]["total_items"] == 1
    assert body["pagination"]["page"] == 1
    assert len(body["data"]) == 1
    assert body["data"][0]["km_interval"] == 10000
    assert body["data"][0]["month_interval"] == 6


# ---------------------------------------------------------------------------
# 2. POST /schedules  — administrator creates a schedule (201)
# ---------------------------------------------------------------------------

def test_create_schedule_returns_201(client):
    new_schedule = _make_schedule(
        created_at=datetime(2024, 4, 20, 10, 0, 0, tzinfo=timezone.utc),
        updated_at=datetime(2024, 4, 20, 10, 0, 0, tzinfo=timezone.utc),
    )

    mock_service = AsyncMock()
    mock_service.create_schedule.return_value = new_schedule

    import app.modules.schedules.router as schedule_router
    original = schedule_router.ScheduleService
    schedule_router.ScheduleService = MagicMock(return_value=mock_service)

    app.dependency_overrides[get_db] = lambda: AsyncMock()
    app.dependency_overrides[require_role("administrator")] = lambda: _make_admin_user()

    payload = {
        "vehicle_type_id": str(VEHICLE_TYPE_ID),
        "vehicle_class": "heavy_truck",
        "km_interval": 10000,
        "month_interval": 6,
        "is_active": True,
    }

    try:
        resp = client.post("/v1/schedules", json=payload)
    finally:
        schedule_router.ScheduleService = original

    assert resp.status_code == 201
    body = resp.json()
    assert body["km_interval"] == 10000
    assert body["month_interval"] == 6
    assert body["vehicle_class"] == "heavy_truck"
    assert body["is_active"] is True


# ---------------------------------------------------------------------------
# 3. GET /schedules/{schedule_id} — returns 200 with correct data
# ---------------------------------------------------------------------------

def test_get_schedule_returns_200(client):
    schedule = _make_schedule()

    mock_service = AsyncMock()
    mock_service.get_schedule.return_value = schedule

    import app.modules.schedules.router as schedule_router
    original = schedule_router.ScheduleService
    schedule_router.ScheduleService = MagicMock(return_value=mock_service)

    app.dependency_overrides[get_db] = lambda: AsyncMock()
    app.dependency_overrides[require_role("administrator", "manager")] = lambda: _make_admin_user()

    try:
        resp = client.get(f"/v1/schedules/{SCHEDULE_ID}")
    finally:
        schedule_router.ScheduleService = original

    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == str(SCHEDULE_ID)
    assert body["vehicle_type_id"] == str(VEHICLE_TYPE_ID)
    assert body["km_interval"] == 10000
    assert body["month_interval"] == 6


# ---------------------------------------------------------------------------
# 4. GET /schedules/{schedule_id} — 404 when not found
# ---------------------------------------------------------------------------

def test_get_schedule_returns_404(client):
    mock_service = AsyncMock()
    mock_service.get_schedule.return_value = None

    import app.modules.schedules.router as schedule_router
    original = schedule_router.ScheduleService
    schedule_router.ScheduleService = MagicMock(return_value=mock_service)

    app.dependency_overrides[get_db] = lambda: AsyncMock()
    app.dependency_overrides[require_role("administrator", "manager")] = lambda: _make_admin_user()

    try:
        resp = client.get(f"/v1/schedules/{SCHEDULE_ID}")
    finally:
        schedule_router.ScheduleService = original

    assert resp.status_code == 404
    body = resp.json()
    assert body["code"] == "NOT_FOUND"
    assert body["message"] == "Schedule not found."


# ---------------------------------------------------------------------------
# 5. PUT /schedules/{schedule_id} — update returns updated schedule
# ---------------------------------------------------------------------------

def test_update_schedule_returns_200(client):
    updated = _make_schedule(
        km_interval=15000,
        month_interval=9,
        updated_at=datetime(2024, 4, 21, 14, 45, 0, tzinfo=timezone.utc),
    )

    mock_service = AsyncMock()
    mock_service.update_schedule.return_value = updated

    import app.modules.schedules.router as schedule_router
    original = schedule_router.ScheduleService
    schedule_router.ScheduleService = MagicMock(return_value=mock_service)

    app.dependency_overrides[get_db] = lambda: AsyncMock()
    app.dependency_overrides[require_role("administrator")] = lambda: _make_admin_user()

    payload = {"km_interval": 15000, "month_interval": 9, "is_active": True}

    try:
        resp = client.put(f"/v1/schedules/{SCHEDULE_ID}", json=payload)
    finally:
        schedule_router.ScheduleService = original

    assert resp.status_code == 200
    body = resp.json()
    assert body["km_interval"] == 15000
    assert body["month_interval"] == 9


# ---------------------------------------------------------------------------
# 6. DELETE /schedules/{schedule_id} — 204 on success
# ---------------------------------------------------------------------------

def test_delete_schedule_returns_204(client):
    mock_service = AsyncMock()
    mock_service.delete_schedule.return_value = True

    import app.modules.schedules.router as schedule_router
    original = schedule_router.ScheduleService
    schedule_router.ScheduleService = MagicMock(return_value=mock_service)

    app.dependency_overrides[get_db] = lambda: AsyncMock()
    app.dependency_overrides[require_role("administrator")] = lambda: _make_admin_user()

    try:
        resp = client.delete(f"/v1/schedules/{SCHEDULE_ID}")
    finally:
        schedule_router.ScheduleService = original

    assert resp.status_code == 204


# ---------------------------------------------------------------------------
# 7. DELETE /schedules/{schedule_id} — 404 when not found
# ---------------------------------------------------------------------------

def test_delete_schedule_returns_404(client):
    mock_service = AsyncMock()
    mock_service.delete_schedule.return_value = False

    import app.modules.schedules.router as schedule_router
    original = schedule_router.ScheduleService
    schedule_router.ScheduleService = MagicMock(return_value=mock_service)

    app.dependency_overrides[get_db] = lambda: AsyncMock()
    app.dependency_overrides[require_role("administrator")] = lambda: _make_admin_user()

    try:
        resp = client.delete(f"/v1/schedules/{SCHEDULE_ID}")
    finally:
        schedule_router.ScheduleService = original

    assert resp.status_code == 404
    body = resp.json()
    assert body["code"] == "NOT_FOUND"
    assert body["message"] == "Schedule not found."


# ---------------------------------------------------------------------------
# 8. POST /schedules — validation rejects km_interval < 1
# ---------------------------------------------------------------------------

def test_create_schedule_validation_km_interval(client):
    """km_interval must be >= 1; Pydantic rejects 0 before the service is called."""
    import app.modules.schedules.router as schedule_router
    original = schedule_router.ScheduleService
    mock_service = AsyncMock()
    schedule_router.ScheduleService = MagicMock(return_value=mock_service)

    app.dependency_overrides[get_db] = lambda: AsyncMock()
    app.dependency_overrides[require_role("administrator")] = lambda: _make_admin_user()

    payload = {
        "vehicle_type_id": str(VEHICLE_TYPE_ID),
        "vehicle_class": "heavy_truck",
        "km_interval": 0,
        "month_interval": 6,
        "is_active": True,
    }

    try:
        resp = client.post("/v1/schedules", json=payload)
    finally:
        schedule_router.ScheduleService = original

    assert resp.status_code == 422
    # Service should NOT have been called
    mock_service.create_schedule.assert_not_called()

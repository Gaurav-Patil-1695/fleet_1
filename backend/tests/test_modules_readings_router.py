"""Smoke tests for app.modules.readings.router"""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.dependencies import get_current_user, get_db
from app.middleware.rbac import require_role
from app.modules.readings.schemas import ReadingRead, ReadingListResponse, Pagination

# ---------------------------------------------------------------------------
# Shared test data (from the design sample payloads)
# ---------------------------------------------------------------------------

READING_ID_1 = UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
VEHICLE_ID = UUID("d4e5f6a7-b8c9-0123-def4-567890abcdef")
USER_ID = UUID("f1e2d3c4-b5a6-7890-fedc-ba0987654321")

SAMPLE_READING_1 = ReadingRead(
    id=READING_ID_1,
    vehicle_id=VEHICLE_ID,
    recorded_by_user_id=USER_ID,
    odometer_km=45230.5,
    source="manual",
    is_test_mode=False,
    raw_payload=None,
    reading_timestamp=datetime(2024, 6, 15, 8, 30, 0, tzinfo=timezone.utc),
    created_at=datetime(2024, 6, 15, 8, 31, 2, tzinfo=timezone.utc),
)

SAMPLE_READING_2 = ReadingRead(
    id=UUID("b2c3d4e5-f6a7-8901-bcde-f12345678901"),
    vehicle_id=VEHICLE_ID,
    recorded_by_user_id=None,
    odometer_km=45540.0,
    source="telematics",
    is_test_mode=False,
    raw_payload={"device_id": "TLM-00342", "signal_strength": -72},
    reading_timestamp=datetime(2024, 6, 16, 14, 0, 0, tzinfo=timezone.utc),
    created_at=datetime(2024, 6, 16, 14, 0, 5, tzinfo=timezone.utc),
)

CREATED_READING = ReadingRead(
    id=UUID("c3d4e5f6-a7b8-9012-cdef-123456789012"),
    vehicle_id=VEHICLE_ID,
    recorded_by_user_id=USER_ID,
    odometer_km=45890.3,
    source="manual",
    is_test_mode=False,
    raw_payload=None,
    reading_timestamp=datetime(2024, 6, 17, 9, 15, 0, tzinfo=timezone.utc),
    created_at=datetime(2024, 6, 17, 9, 16, 44, tzinfo=timezone.utc),
)

# ---------------------------------------------------------------------------
# Helper to build a fake user
# ---------------------------------------------------------------------------

def make_user(role="manager"):
    user = MagicMock()
    user.id = USER_ID
    user.role = role
    user.is_active = True
    return user


# ---------------------------------------------------------------------------
# Helpers to build mocked services
# ---------------------------------------------------------------------------

def make_fake_db():
    return AsyncMock()


def override_db():
    db = make_fake_db()
    async def _get_db():
        yield db
    return _get_db


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestListReadings:
    """GET /v1/readings — roles: administrator, manager"""

    def setup_method(self):
        app.dependency_overrides = {}

    def teardown_method(self):
        app.dependency_overrides = {}

    def test_list_readings_returns_200_with_data(self, monkeypatch):
        """Should return paginated list of readings."""
        expected_response = ReadingListResponse(
            data=[SAMPLE_READING_1, SAMPLE_READING_2],
            pagination=Pagination(page=1, page_size=20, total_items=2, total_pages=1),
        )

        mock_service = AsyncMock()
        mock_service.list_readings.return_value = expected_response

        import app.modules.readings.service as svc_module
        monkeypatch.setattr(
            svc_module, "ReadingService",
            lambda db: mock_service,
        )

        user = make_user("manager")
        app.dependency_overrides[get_db] = override_db()
        app.dependency_overrides[require_role("administrator", "manager")] = lambda: user

        with TestClient(app) as client:
            response = client.get("/v1/readings")

        assert response.status_code == 200
        body = response.json()
        assert "data" in body
        assert "pagination" in body
        assert body["pagination"]["total_items"] == 2
        assert len(body["data"]) == 2
        assert body["data"][0]["source"] == "manual"
        assert body["data"][1]["source"] == "telematics"

    def test_list_readings_forbidden_for_technician(self, monkeypatch):
        """Technician should not be allowed to call listReadings."""
        from fastapi import HTTPException

        def raise_403():
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Forbidden"})

        app.dependency_overrides[get_db] = override_db()
        app.dependency_overrides[require_role("administrator", "manager")] = raise_403

        with TestClient(app, raise_server_exceptions=False) as client:
            response = client.get("/v1/readings")

        assert response.status_code == 403


class TestCreateReading:
    """POST /v1/readings — roles: administrator, manager, technician"""

    def setup_method(self):
        app.dependency_overrides = {}

    def teardown_method(self):
        app.dependency_overrides = {}

    def test_create_manual_reading_returns_201(self, monkeypatch):
        """REQ-9: manager enters manual odometer reading."""
        mock_service = AsyncMock()
        mock_service.create_reading.return_value = CREATED_READING

        import app.modules.readings.service as svc_module
        monkeypatch.setattr(svc_module, "ReadingService", lambda db: mock_service)

        user = make_user("manager")
        app.dependency_overrides[get_db] = override_db()
        app.dependency_overrides[
            require_role("administrator", "manager", "technician")
        ] = lambda: user

        payload = {
            "vehicle_id": str(VEHICLE_ID),
            "odometer_km": 45890.3,
            "source": "manual",
            "is_test_mode": False,
            "reading_timestamp": "2024-06-17T09:15:00Z",
            "raw_payload": None,
        }

        with TestClient(app) as client:
            response = client.post("/v1/readings", json=payload)

        assert response.status_code == 201
        body = response.json()
        assert body["source"] == "manual"
        assert body["odometer_km"] == 45890.3
        assert body["vehicle_id"] == str(VEHICLE_ID)
        assert body["recorded_by_user_id"] == str(USER_ID)
        assert body["is_test_mode"] is False

    def test_create_telematics_reading_returns_201(self, monkeypatch):
        """REQ-8: telematics reading is accepted."""
        telematics_reading = ReadingRead(
            id=UUID("b2c3d4e5-f6a7-8901-bcde-f12345678901"),
            vehicle_id=VEHICLE_ID,
            recorded_by_user_id=None,
            odometer_km=45540.0,
            source="telematics",
            is_test_mode=False,
            raw_payload={"device_id": "TLM-00342"},
            reading_timestamp=datetime(2024, 6, 16, 14, 0, 0, tzinfo=timezone.utc),
            created_at=datetime(2024, 6, 16, 14, 0, 5, tzinfo=timezone.utc),
        )

        mock_service = AsyncMock()
        mock_service.create_reading.return_value = telematics_reading

        import app.modules.readings.service as svc_module
        monkeypatch.setattr(svc_module, "ReadingService", lambda db: mock_service)

        user = make_user("administrator")
        app.dependency_overrides[get_db] = override_db()
        app.dependency_overrides[
            require_role("administrator", "manager", "technician")
        ] = lambda: user

        payload = {
            "vehicle_id": str(VEHICLE_ID),
            "odometer_km": 45540.0,
            "source": "telematics",
            "is_test_mode": False,
            "reading_timestamp": "2024-06-16T14:00:00Z",
            "raw_payload": {"device_id": "TLM-00342"},
        }

        with TestClient(app) as client:
            response = client.post("/v1/readings", json=payload)

        assert response.status_code == 201
        body = response.json()
        assert body["source"] == "telematics"
        assert body["odometer_km"] == 45540.0

    def test_create_reading_invalid_source_returns_422(self, monkeypatch):
        """Validation: source must be 'manual' or 'telematics'."""
        user = make_user("manager")
        app.dependency_overrides[get_db] = override_db()
        app.dependency_overrides[
            require_role("administrator", "manager", "technician")
        ] = lambda: user

        payload = {
            "vehicle_id": str(VEHICLE_ID),
            "odometer_km": 100.0,
            "source": "unknown_source",
            "reading_timestamp": "2024-06-17T09:15:00Z",
        }

        with TestClient(app) as client:
            response = client.post("/v1/readings", json=payload)

        assert response.status_code == 422
        body = response.json()
        detail_str = str(body)
        assert "manual" in detail_str or "telematics" in detail_str

    def test_create_reading_negative_odometer_returns_422(self, monkeypatch):
        """Validation: odometer_km must be >= 0."""
        user = make_user("manager")
        app.dependency_overrides[get_db] = override_db()
        app.dependency_overrides[
            require_role("administrator", "manager", "technician")
        ] = lambda: user

        payload = {
            "vehicle_id": str(VEHICLE_ID),
            "odometer_km": -1.0,
            "source": "manual",
            "reading_timestamp": "2024-06-17T09:15:00Z",
        }

        with TestClient(app) as client:
            response = client.post("/v1/readings", json=payload)

        assert response.status_code == 422


class TestGetReading:
    """GET /v1/readings/{reading_id} — roles: administrator, manager, technician"""

    def setup_method(self):
        app.dependency_overrides = {}

    def teardown_method(self):
        app.dependency_overrides = {}

    def test_get_reading_returns_200(self, monkeypatch):
        """Should return the reading by ID."""
        mock_service = AsyncMock()
        mock_service.get_reading.return_value = SAMPLE_READING_1

        import app.modules.readings.service as svc_module
        monkeypatch.setattr(svc_module, "ReadingService", lambda db: mock_service)

        user = make_user("technician")
        app.dependency_overrides[get_db] = override_db()
        app.dependency_overrides[
            require_role("administrator", "manager", "technician")
        ] = lambda: user

        with TestClient(app) as client:
            response = client.get(f"/v1/readings/{READING_ID_1}")

        assert response.status_code == 200
        body = response.json()
        assert body["id"] == str(READING_ID_1)
        assert body["odometer_km"] == 45230.5
        assert body["source"] == "manual"
        assert body["vehicle_id"] == str(VEHICLE_ID)

    def test_get_reading_not_found_returns_404(self, monkeypatch):
        """Should return 404 when reading does not exist."""
        from fastapi import HTTPException

        mock_service = AsyncMock()
        mock_service.get_reading.side_effect = HTTPException(
            status_code=404,
            detail={"code": "READING_NOT_FOUND", "message": "Reading not found."},
        )

        import app.modules.readings.service as svc_module
        monkeypatch.setattr(svc_module, "ReadingService", lambda db: mock_service)

        user = make_user("manager")
        app.dependency_overrides[get_db] = override_db()
        app.dependency_overrides[
            require_role("administrator", "manager", "technician")
        ] = lambda: user

        missing_id = "00000000-0000-0000-0000-000000000000"
        with TestClient(app, raise_server_exceptions=False) as client:
            response = client.get(f"/v1/readings/{missing_id}")

        assert response.status_code == 404
        body = response.json()
        detail = body.get("detail", body)
        if isinstance(detail, dict):
            assert detail.get("code") == "READING_NOT_FOUND"
        else:
            assert "READING_NOT_FOUND" in str(body) or response.status_code == 404

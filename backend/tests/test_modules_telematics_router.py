import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.main import app
from app.dependencies import get_db, get_current_user
from app.modules.telematics.schemas import TelematicsIngestResponse, TelematicsIngestError


VEHICLE_ID_1 = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
VEHICLE_ID_2 = "b2c3d4e5-f6a7-8901-bcde-f12345678901"


def make_fake_user(role="technician"):
    user = MagicMock()
    user.id = UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    user.role = role
    user.is_active = True
    return user


def fake_db():
    return MagicMock()


SAMPLE_REQUEST = {
    "readings": [
        {
            "vehicle_id": VEHICLE_ID_1,
            "odometer_km": 48750.5,
            "reading_timestamp": "2024-07-15T10:30:00Z",
            "raw_payload": {"source_device": "TLM-001", "signal_strength": -72},
        },
        {
            "vehicle_id": VEHICLE_ID_2,
            "odometer_km": 75350.0,
            "reading_timestamp": "2024-07-15T10:31:00Z",
            "raw_payload": {"source_device": "TLM-002", "signal_strength": -68},
        },
    ]
}


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()


def setup_dependencies(service_return_value):
    app.dependency_overrides[get_db] = lambda: fake_db()
    app.dependency_overrides[get_current_user] = lambda: make_fake_user()
    return service_return_value


def test_ingest_telematics_readings_success_two_accepted():
    """POST /telematics/ingest with two valid readings returns accepted=2, rejected=0."""
    expected_response = TelematicsIngestResponse(accepted=2, rejected=0, errors=[])

    app.dependency_overrides[get_db] = lambda: fake_db()
    app.dependency_overrides[get_current_user] = lambda: make_fake_user()

    with patch(
        "app.modules.telematics.router.TelematicsService"
    ) as MockService:
        mock_instance = MockService.return_value
        mock_instance.ingest_readings = AsyncMock(return_value=expected_response)

        client = TestClient(app)
        response = client.post("/v1/telematics/ingest", json=SAMPLE_REQUEST)

    assert response.status_code == 200
    data = response.json()
    assert data["accepted"] == 2
    assert data["rejected"] == 0
    assert data["errors"] == []


def test_ingest_telematics_readings_partial_rejection():
    """POST /telematics/ingest where one vehicle is not found returns accepted=1, rejected=1."""
    expected_response = TelematicsIngestResponse(
        accepted=1,
        rejected=1,
        errors=[
            TelematicsIngestError(
                vehicle_id=UUID(VEHICLE_ID_2),
                reason=f"Vehicle {VEHICLE_ID_2} not found.",
            )
        ],
    )

    app.dependency_overrides[get_db] = lambda: fake_db()
    app.dependency_overrides[get_current_user] = lambda: make_fake_user()

    with patch(
        "app.modules.telematics.router.TelematicsService"
    ) as MockService:
        mock_instance = MockService.return_value
        mock_instance.ingest_readings = AsyncMock(return_value=expected_response)

        client = TestClient(app)
        response = client.post("/v1/telematics/ingest", json=SAMPLE_REQUEST)

    assert response.status_code == 200
    data = response.json()
    assert data["accepted"] == 1
    assert data["rejected"] == 1
    assert len(data["errors"]) == 1
    assert data["errors"][0]["vehicle_id"] == VEHICLE_ID_2


def test_ingest_telematics_readings_empty_list_rejected():
    """POST /telematics/ingest with empty readings list is rejected by schema validation."""
    app.dependency_overrides[get_db] = lambda: fake_db()
    app.dependency_overrides[get_current_user] = lambda: make_fake_user()

    client = TestClient(app)
    response = client.post("/v1/telematics/ingest", json={"readings": []})

    assert response.status_code == 422


def test_ingest_telematics_readings_missing_readings_field():
    """POST /telematics/ingest with no readings field returns 422."""
    app.dependency_overrides[get_db] = lambda: fake_db()
    app.dependency_overrides[get_current_user] = lambda: make_fake_user()

    client = TestClient(app)
    response = client.post("/v1/telematics/ingest", json={})

    assert response.status_code == 422


def test_ingest_telematics_readings_invalid_vehicle_id():
    """POST /telematics/ingest with invalid UUID for vehicle_id returns 422."""
    app.dependency_overrides[get_db] = lambda: fake_db()
    app.dependency_overrides[get_current_user] = lambda: make_fake_user()

    payload = {
        "readings": [
            {
                "vehicle_id": "not-a-valid-uuid",
                "odometer_km": 1000.0,
                "reading_timestamp": "2024-07-15T10:30:00Z",
            }
        ]
    }

    client = TestClient(app)
    response = client.post("/v1/telematics/ingest", json=payload)

    assert response.status_code == 422


def test_ingest_telematics_readings_negative_odometer_rejected():
    """POST /telematics/ingest with negative odometer_km returns 422."""
    app.dependency_overrides[get_db] = lambda: fake_db()
    app.dependency_overrides[get_current_user] = lambda: make_fake_user()

    payload = {
        "readings": [
            {
                "vehicle_id": VEHICLE_ID_1,
                "odometer_km": -100.0,
                "reading_timestamp": "2024-07-15T10:30:00Z",
            }
        ]
    }

    client = TestClient(app)
    response = client.post("/v1/telematics/ingest", json=payload)

    assert response.status_code == 422


def test_ingest_telematics_readings_unauthenticated():
    """POST /telematics/ingest without a current user returns 401 or 403."""
    # Remove current_user override so the real dependency raises
    app.dependency_overrides[get_db] = lambda: fake_db()
    # Do NOT override get_current_user — let it fail naturally

    from fastapi import HTTPException

    async def raise_401():
        raise HTTPException(status_code=401, detail="Not authenticated")

    app.dependency_overrides[get_current_user] = raise_401

    client = TestClient(app, raise_server_exceptions=False)
    response = client.post("/v1/telematics/ingest", json=SAMPLE_REQUEST)

    assert response.status_code in (401, 403)


def test_ingest_telematics_readings_service_is_called_with_correct_args():
    """Verify TelematicsService.ingest_readings is called with the parsed request body and current user."""
    fake_user = make_fake_user()
    expected_response = TelematicsIngestResponse(accepted=2, rejected=0, errors=[])

    app.dependency_overrides[get_db] = lambda: fake_db()
    app.dependency_overrides[get_current_user] = lambda: fake_user

    with patch(
        "app.modules.telematics.router.TelematicsService"
    ) as MockService:
        mock_instance = MockService.return_value
        mock_instance.ingest_readings = AsyncMock(return_value=expected_response)

        client = TestClient(app)
        response = client.post("/v1/telematics/ingest", json=SAMPLE_REQUEST)

    assert response.status_code == 200
    mock_instance.ingest_readings.assert_called_once()
    call_args = mock_instance.ingest_readings.call_args
    # First positional arg should be TelematicsIngestRequest
    from app.modules.telematics.schemas import TelematicsIngestRequest
    ingest_request = call_args[0][0]
    assert isinstance(ingest_request, TelematicsIngestRequest)
    assert len(ingest_request.readings) == 2
    assert ingest_request.readings[0].odometer_km == 48750.5
    # Second positional arg should be the current user
    passed_user = call_args[0][1]
    assert passed_user is fake_user

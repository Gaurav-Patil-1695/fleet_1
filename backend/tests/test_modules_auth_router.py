"""Smoke tests for app.modules.auth.router (POST /auth/login, POST /auth/refresh,
POST /auth/logout, GET /auth/me)."""
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.dependencies import get_db, get_current_user as _get_current_user
from app.middleware.rbac import require_role
from app.modules.auth.schemas import TokenResponse

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

USER_ID = uuid.UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
DEPOT_ID = uuid.UUID("f47ac10b-58cc-4afd-a567-0b576ea13e09")
NOW = datetime(2024, 1, 15, 8, 30, 0, tzinfo=timezone.utc)
UPDATED = datetime(2024, 5, 20, 14, 22, 10, tzinfo=timezone.utc)


def _fake_user():
    user = MagicMock()
    user.id = USER_ID
    user.depot_id = DEPOT_ID
    user.full_name = "Jane Doe"
    user.email = "jane.doe@fleetco.com"
    user.role = "administrator"
    user.is_active = True
    user.created_at = NOW
    user.updated_at = UPDATED
    user.password_hash = "hashed"
    return user


def _fake_token_response():
    return TokenResponse(
        access_token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access.sig",
        token_type="Bearer",
        expires_in=3600,
        refresh_token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh.sig",
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def client():
    """Return a TestClient with no overrides; each test sets its own."""
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def db_override():
    """Fake async DB session."""
    session = AsyncMock()
    app.dependency_overrides[get_db] = lambda: session
    yield session
    app.dependency_overrides.pop(get_db, None)


# ---------------------------------------------------------------------------
# POST /auth/login — happy path
# ---------------------------------------------------------------------------

def test_login_success(client, db_override, monkeypatch):
    """Valid credentials return 200 with access_token and token_type."""
    fake_resp = _fake_token_response()

    from app.modules.auth import service as auth_service_module

    async def fake_login(self, body):
        return fake_resp

    monkeypatch.setattr(auth_service_module.AuthService, "login", fake_login)

    resp = client.post(
        "/v1/auth/login",
        json={"email": "jane.doe@fleetco.com", "password": "S3cur3P@ssw0rd!"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["token_type"] == "Bearer"
    assert "access_token" in data


# ---------------------------------------------------------------------------
# POST /auth/login — invalid credentials
# ---------------------------------------------------------------------------

def test_login_invalid_credentials(client, db_override, monkeypatch):
    """Wrong password → 401."""
    from fastapi import HTTPException, status
    from app.modules.auth import service as auth_service_module

    async def fake_login_fail(self, body):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "Invalid email or password."},
        )

    monkeypatch.setattr(auth_service_module.AuthService, "login", fake_login_fail)

    resp = client.post(
        "/v1/auth/login",
        json={"email": "jane.doe@fleetco.com", "password": "WrongPass1!"},
    )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /auth/login — schema validation (short password)
# ---------------------------------------------------------------------------

def test_login_password_too_short(client):
    """Password < 8 chars → 422 validation error."""
    resp = client.post(
        "/v1/auth/login",
        json={"email": "jane.doe@fleetco.com", "password": "short"},
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# POST /auth/refresh — happy path
# ---------------------------------------------------------------------------

def test_refresh_token_success(client, db_override, monkeypatch):
    """Valid refresh_token → 200 with new access_token."""
    fake_resp = _fake_token_response()
    from app.modules.auth import service as auth_service_module

    async def fake_refresh(self, body):
        return fake_resp

    monkeypatch.setattr(auth_service_module.AuthService, "refresh_token", fake_refresh)

    resp = client.post(
        "/v1/auth/refresh",
        json={"refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh_token_payload.signature"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["token_type"] == "Bearer"
    assert "access_token" in data


# ---------------------------------------------------------------------------
# POST /auth/logout — authenticated user → 204
# ---------------------------------------------------------------------------

def test_logout_authenticated(client, db_override):
    """Authenticated user gets 204 from /auth/logout."""
    user = _fake_user()
    app.dependency_overrides[_get_current_user] = lambda: user
    # Bypass role check
    app.dependency_overrides[require_role("administrator", "manager", "technician")] = lambda: None

    resp = client.post("/v1/auth/logout", headers={"Authorization": "Bearer faketoken"})
    assert resp.status_code == 204


# ---------------------------------------------------------------------------
# GET /auth/me — returns current user fields
# ---------------------------------------------------------------------------

def test_get_me_returns_user(client, db_override):
    """GET /auth/me returns the current user's profile."""
    user = _fake_user()
    app.dependency_overrides[_get_current_user] = lambda: user
    app.dependency_overrides[require_role("administrator", "manager", "technician")] = lambda: None

    resp = client.get("/v1/auth/me", headers={"Authorization": "Bearer faketoken"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == str(USER_ID)
    assert data["email"] == "jane.doe@fleetco.com"
    assert data["full_name"] == "Jane Doe"
    assert data["role"] == "administrator"
    assert data["is_active"] is True
    assert data["depot_id"] == str(DEPOT_ID)


# ---------------------------------------------------------------------------
# GET /auth/me — unauthenticated → 401/403
# ---------------------------------------------------------------------------

def test_get_me_unauthenticated(client):
    """No auth header → 401 or 403 (role guard rejects)."""
    # No overrides; the real require_role will reject
    resp = client.get("/v1/auth/me")
    assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# POST /auth/login — missing email field → 422
# ---------------------------------------------------------------------------

def test_login_missing_email(client):
    """Missing email → 422 validation error."""
    resp = client.post(
        "/v1/auth/login",
        json={"password": "S3cur3P@ssw0rd!"},
    )
    assert resp.status_code == 422

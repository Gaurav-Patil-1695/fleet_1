"""Unit tests for app/dependencies.py – get_current_user and require_role."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from datetime import datetime, timezone
import jwt

from app.dependencies import get_current_user, require_role, get_db
from app.config import settings

# ---------------------------------------------------------------------------
# Minimal test app
# ---------------------------------------------------------------------------

app = FastAPI()


@app.get("/protected")
async def protected_route(user=Depends(get_current_user)):
    return {"user_id": str(user.id), "role": user.role}


@app.get("/admin-only", dependencies=[Depends(require_role("administrator"))])
async def admin_only_route():
    return {"ok": True}


@app.get("/multi-role", dependencies=[Depends(require_role("administrator", "manager"))])
async def multi_role_route():
    return {"ok": True}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_token(sub: str, secret: str = None, algorithm: str = None, expired: bool = False) -> str:
    import time
    secret = secret or settings.JWT_SECRET_KEY
    algorithm = algorithm or settings.JWT_ALGORITHM
    exp = int(time.time()) + (3600 if not expired else -3600)
    payload = {"sub": sub, "exp": exp}
    return jwt.encode(payload, secret, algorithm=algorithm)


def _make_user(role: str = "administrator", is_active: bool = True):
    user = MagicMock()
    user.id = "user-uuid-1"
    user.role = role
    user.is_active = is_active
    return user


def _db_override():
    """Async generator that yields a mock session."""
    async def _inner():
        yield AsyncMock()
    return _inner


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_get_current_user_valid_token():
    """A valid JWT with an active user returns 200 with user data."""
    user = _make_user(role="manager")
    token = _make_token(sub=str(user.id))

    async def fake_get_current_user():
        return user

    app.dependency_overrides[get_current_user] = fake_get_current_user
    try:
        client = TestClient(app)
        resp = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["role"] == "manager"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_get_current_user_expired_token():
    """An expired token must raise 401 with code TOKEN_EXPIRED."""
    token = _make_token(sub="user-uuid-1", expired=True)

    mock_db = AsyncMock()
    async def fake_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = fake_get_db
    try:
        client = TestClient(app, raise_server_exceptions=False)
        resp = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 401
        detail = resp.json()["detail"]
        assert detail["code"] == "TOKEN_EXPIRED"
        assert "expired" in detail["message"].lower()
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_get_current_user_invalid_token():
    """A garbage token returns 401 UNAUTHORIZED."""
    mock_db = AsyncMock()
    async def fake_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = fake_get_db
    try:
        client = TestClient(app, raise_server_exceptions=False)
        resp = client.get("/protected", headers={"Authorization": "Bearer not.a.real.token"})
        assert resp.status_code == 401
        detail = resp.json()["detail"]
        assert detail["code"] == "UNAUTHORIZED"
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_get_current_user_inactive_account():
    """An inactive user is rejected with 403 ACCOUNT_INACTIVE."""
    inactive_user = _make_user(is_active=False)
    token = _make_token(sub=str(inactive_user.id))

    mock_repo = AsyncMock()
    mock_repo.get_by_id = AsyncMock(return_value=inactive_user)

    mock_db = AsyncMock()
    async def fake_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = fake_get_db

    with patch("app.dependencies.UserRepository", return_value=mock_repo):
        try:
            client = TestClient(app, raise_server_exceptions=False)
            resp = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
            assert resp.status_code == 403
            detail = resp.json()["detail"]
            assert detail["code"] == "ACCOUNT_INACTIVE"
        finally:
            app.dependency_overrides.pop(get_db, None)


def test_require_role_allowed():
    """A user whose role matches the require_role guard passes."""
    admin_user = _make_user(role="administrator")

    async def fake_get_current_user():
        return admin_user

    app.dependency_overrides[get_current_user] = fake_get_current_user
    try:
        client = TestClient(app)
        resp = client.get("/admin-only", headers={"Authorization": "Bearer dummy"})
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_require_role_forbidden():
    """A user whose role is NOT in the allowed list gets 403 FORBIDDEN."""
    tech_user = _make_user(role="technician")

    async def fake_get_current_user():
        return tech_user

    app.dependency_overrides[get_current_user] = fake_get_current_user
    try:
        client = TestClient(app, raise_server_exceptions=False)
        resp = client.get("/admin-only", headers={"Authorization": "Bearer dummy"})
        assert resp.status_code == 403
        detail = resp.json()["detail"]
        assert detail["code"] == "FORBIDDEN"
        assert "permission" in detail["message"].lower()
    finally:
        app.dependency_overrides.pop(get_current_user, None)

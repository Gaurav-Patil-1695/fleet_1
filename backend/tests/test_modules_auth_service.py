"""Unit tests for app.modules.auth.service (AuthService)."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.modules.auth.schemas import LoginRequest, RefreshRequest, TokenResponse
from app.modules.auth.service import AuthService, _create_access_token, _create_refresh_token, _decode_refresh_token
from app.config import settings


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_user(
    *,
    is_active: bool = True,
    role: str = "manager",
    depot_id: uuid.UUID | None = uuid.UUID("f47ac10b-58cc-4afd-a567-0b576ea13e09"),
) -> MagicMock:
    user = MagicMock()
    user.id = uuid.UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
    user.depot_id = depot_id
    user.full_name = "Jane Doe"
    user.email = "jane.doe@fleetco.com"
    user.password_hash = "hashed_password"
    user.role = role
    user.is_active = is_active
    user.created_at = datetime(2024, 1, 15, 8, 30, 0, tzinfo=timezone.utc)
    user.updated_at = datetime(2024, 5, 20, 14, 22, 10, tzinfo=timezone.utc)
    return user


def _make_service() -> tuple[AuthService, MagicMock]:
    """Return (AuthService, mock_user_repo) with db patched out."""
    db = AsyncMock()
    service = AuthService(db)
    mock_repo = AsyncMock()
    service._user_repo = mock_repo
    return service, mock_repo


# ---------------------------------------------------------------------------
# 1. Successful login returns TokenResponse
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_login_success_returns_token_response():
    service, mock_repo = _make_service()
    user = _make_user()
    mock_repo.get_by_email.return_value = user

    with patch("app.modules.auth.service.verify_password", return_value=True):
        body = LoginRequest(email="jane.doe@fleetco.com", password="S3cur3P@ssw0rd!")
        result = await service.login(body)

    assert isinstance(result, TokenResponse)
    assert result.token_type == "Bearer"
    assert result.access_token
    assert result.refresh_token
    assert result.expires_in == settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60


# ---------------------------------------------------------------------------
# 2. Login with wrong password raises 401 INVALID_CREDENTIALS
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_login_wrong_password_raises_401():
    service, mock_repo = _make_service()
    user = _make_user()
    mock_repo.get_by_email.return_value = user

    with patch("app.modules.auth.service.verify_password", return_value=False):
        body = LoginRequest(email="jane.doe@fleetco.com", password="S3cur3P@ssw0rd!")
        with pytest.raises(HTTPException) as exc_info:
            await service.login(body)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail["code"] == "INVALID_CREDENTIALS"
    assert exc_info.value.detail["message"] == "Invalid email or password."


# ---------------------------------------------------------------------------
# 3. Login with unknown email raises 401 INVALID_CREDENTIALS
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_login_unknown_email_raises_401():
    service, mock_repo = _make_service()
    mock_repo.get_by_email.return_value = None

    body = LoginRequest(email="nobody@fleetco.com", password="S3cur3P@ssw0rd!")
    with pytest.raises(HTTPException) as exc_info:
        await service.login(body)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail["code"] == "INVALID_CREDENTIALS"
    assert exc_info.value.detail["message"] == "Invalid email or password."


# ---------------------------------------------------------------------------
# 4. Login with inactive account raises 401 ACCOUNT_INACTIVE
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_login_inactive_account_raises_401():
    service, mock_repo = _make_service()
    user = _make_user(is_active=False)
    mock_repo.get_by_email.return_value = user

    with patch("app.modules.auth.service.verify_password", return_value=True):
        body = LoginRequest(email="jane.doe@fleetco.com", password="S3cur3P@ssw0rd!")
        with pytest.raises(HTTPException) as exc_info:
            await service.login(body)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail["code"] == "ACCOUNT_INACTIVE"
    assert exc_info.value.detail["message"] == "Account is inactive."


# ---------------------------------------------------------------------------
# 5. Successful refresh_token returns new TokenResponse
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_refresh_token_success():
    service, mock_repo = _make_service()
    user = _make_user()
    mock_repo.get_by_id.return_value = user

    # Create a real refresh token to pass in
    real_refresh = _create_refresh_token(user_id=str(user.id))
    body = RefreshRequest(refresh_token=real_refresh)
    result = await service.refresh_token(body)

    assert isinstance(result, TokenResponse)
    assert result.token_type == "Bearer"
    assert result.access_token
    assert result.refresh_token
    assert result.expires_in == settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60


# ---------------------------------------------------------------------------
# 6. refresh_token with invalid token raises 401 INVALID_TOKEN
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_refresh_token_invalid_token_raises_401():
    service, mock_repo = _make_service()

    body = RefreshRequest(refresh_token="not.a.valid.jwt")
    with pytest.raises(HTTPException) as exc_info:
        await service.refresh_token(body)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail["code"] == "INVALID_TOKEN"


# ---------------------------------------------------------------------------
# 7. refresh_token when user not found raises 401 USER_NOT_FOUND
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_refresh_token_user_not_found_raises_401():
    service, mock_repo = _make_service()
    mock_repo.get_by_id.return_value = None

    real_refresh = _create_refresh_token(user_id=str(uuid.uuid4()))
    body = RefreshRequest(refresh_token=real_refresh)
    with pytest.raises(HTTPException) as exc_info:
        await service.refresh_token(body)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail["code"] == "USER_NOT_FOUND"
    assert exc_info.value.detail["message"] == "User not found."


# ---------------------------------------------------------------------------
# 8. refresh_token when user is inactive raises 401 ACCOUNT_INACTIVE
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_refresh_token_inactive_user_raises_401():
    service, mock_repo = _make_service()
    user = _make_user(is_active=False)
    mock_repo.get_by_id.return_value = user

    real_refresh = _create_refresh_token(user_id=str(user.id))
    body = RefreshRequest(refresh_token=real_refresh)
    with pytest.raises(HTTPException) as exc_info:
        await service.refresh_token(body)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail["code"] == "ACCOUNT_INACTIVE"
    assert exc_info.value.detail["message"] == "Account is inactive."

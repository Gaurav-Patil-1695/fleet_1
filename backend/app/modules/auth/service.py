from __future__ import annotations

import logging
from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.repositories.user_repository import UserRepository
from app.utils.security import verify_password, hash_password
from app.modules.auth.schemas import LoginRequest, TokenResponse, RefreshRequest

import jwt as pyjwt
from datetime import datetime, timezone
import uuid

logger = logging.getLogger(__name__)


def _create_access_token(user_id: str, role: str, depot_id: str | None) -> str:
    expire_minutes = settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=expire_minutes)
    payload = {
        "sub": user_id,
        "role": role,
        "depot_id": depot_id,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "type": "access",
    }
    return pyjwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def _create_refresh_token(user_id: str) -> str:
    expire_days = settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=expire_days)
    payload = {
        "sub": user_id,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "type": "refresh",
        "jti": str(uuid.uuid4()),
    }
    return pyjwt.encode(payload, settings.JWT_REFRESH_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def _decode_refresh_token(token: str) -> dict:
    try:
        payload = pyjwt.decode(
            token,
            settings.JWT_REFRESH_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"code": "INVALID_TOKEN", "message": "Invalid refresh token."},
            )
        return payload
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "TOKEN_EXPIRED", "message": "Refresh token has expired."},
        )
    except pyjwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": "Invalid refresh token."},
        )


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._user_repo = UserRepository(db)

    async def login(self, body: LoginRequest) -> TokenResponse:
        user = await self._user_repo.get_by_email(body.email)
        if user is None:
            logger.warning("Login failed: no user with email %s", body.email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"code": "INVALID_CREDENTIALS", "message": "Invalid email or password."},
            )

        if not verify_password(body.password, user.password_hash):
            logger.warning("Login failed: wrong password for email %s", body.email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"code": "INVALID_CREDENTIALS", "message": "Invalid email or password."},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"code": "ACCOUNT_INACTIVE", "message": "Account is inactive."},
            )

        depot_id = str(user.depot_id) if user.depot_id is not None else None
        access_token = _create_access_token(
            user_id=str(user.id),
            role=user.role,
            depot_id=depot_id,
        )
        refresh_token = _create_refresh_token(user_id=str(user.id))

        expire_seconds = settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
        return TokenResponse(
            access_token=access_token,
            token_type="Bearer",
            expires_in=expire_seconds,
            refresh_token=refresh_token,
        )

    async def refresh_token(self, body: RefreshRequest) -> TokenResponse:
        payload = _decode_refresh_token(body.refresh_token)
        user_id: str = payload.get("sub", "")

        user = await self._user_repo.get_by_id(user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"code": "USER_NOT_FOUND", "message": "User not found."},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"code": "ACCOUNT_INACTIVE", "message": "Account is inactive."},
            )

        depot_id = str(user.depot_id) if user.depot_id is not None else None
        access_token = _create_access_token(
            user_id=str(user.id),
            role=user.role,
            depot_id=depot_id,
        )
        new_refresh_token = _create_refresh_token(user_id=str(user.id))

        expire_seconds = settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
        return TokenResponse(
            access_token=access_token,
            token_type="Bearer",
            expires_in=expire_seconds,
            refresh_token=new_refresh_token,
        )

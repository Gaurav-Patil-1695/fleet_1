"""Shared FastAPI dependency callables: get_db session, get_current_user, require_role."""

from collections.abc import AsyncGenerator
from typing import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import SessionLocal
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.utils.security import verify_password  # noqa: F401 – re-exported for convenience
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError

_bearer_scheme = HTTPBearer(auto_error=True)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session and close it when done."""
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Decode and validate the JWT bearer token; return the authenticated User."""
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"code": "UNAUTHORIZED", "message": "Could not validate credentials"},
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "TOKEN_EXPIRED", "message": "Token has expired"},
            headers={"WWW-Authenticate": "Bearer"},
        )
    except InvalidTokenError:
        raise credentials_exception

    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    repo = UserRepository(db)
    user: User | None = await repo.get_by_id(int(user_id))
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "ACCOUNT_INACTIVE", "message": "User account is inactive"},
        )

    return user


def require_role(*roles: str) -> Callable:
    """Return a FastAPI dependency that enforces the caller has one of the given roles.

    Usage:
        @router.get("/", dependencies=[Depends(require_role("administrator", "manager"))])

    The roles accepted are the canonical stored strings: administrator, manager, technician.
    """

    async def _check_role(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "FORBIDDEN",
                    "message": "You do not have permission to perform this action",
                },
            )
        return current_user

    return _check_role

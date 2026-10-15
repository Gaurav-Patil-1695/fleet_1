from typing import Callable

from fastapi import Depends, HTTPException, status

from app.dependencies import get_current_user
from app.models.user import User


def require_role(*roles: str) -> Callable:
    """
    FastAPI dependency factory that enforces role-based access control.

    Usage:
        @router.get("/some-path", dependencies=[Depends(require_role("administrator", "manager"))])

    Accepted role strings (must match exactly):
        "administrator", "manager", "technician"

    Raises HTTP 403 if the authenticated user's role is not in the allowed set.
    """
    async def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "FORBIDDEN",
                    "message": "You do not have permission to perform this action",
                },
            )
        return current_user

    return dependency

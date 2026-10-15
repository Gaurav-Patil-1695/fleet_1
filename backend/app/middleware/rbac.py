import functools
from collections.abc import Callable

from fastapi import Depends, HTTPException, status

from app.dependencies import get_current_user
from app.models.user import User


@functools.lru_cache(maxsize=None)
def _make_role_dependency(roles: tuple) -> Callable:
    """Return a cached FastAPI dependency enforcing that the current user has
    one of the given roles.  Caching ensures the same callable object is
    returned for the same role-set so that ``app.dependency_overrides`` keyed
    on ``require_role(...)`` works correctly in tests."""

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


def require_role(*roles: str) -> Callable:
    """
    FastAPI dependency factory that enforces role-based access control.

    Usage:
        @router.get(
            "/some-path",
            dependencies=[Depends(require_role("administrator", "manager"))],
        )

    Accepted role strings (must match exactly):
        "administrator", "manager", "technician"

    Raises HTTP 403 if the authenticated user's role is not in the allowed set.

    The returned callable is memoised so that the same role-tuple always yields
    the same object — this allows ``app.dependency_overrides`` to be keyed on
    ``require_role(...)`` in test suites.
    """
    return _make_role_dependency(roles)

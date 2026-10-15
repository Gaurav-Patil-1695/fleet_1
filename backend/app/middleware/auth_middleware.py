import logging

from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer
from jose import JWTError, jwt

from app.config import settings

logger = logging.getLogger(__name__)

PUBLIC_PATHS = {
    ("/v1/auth/login", "POST"),
    ("/v1/auth/refresh", "POST"),
}

_bearer_scheme = HTTPBearer(auto_error=False)


def extract_token_from_request(request: Request) -> str | None:
    """Extract the raw JWT string from the Authorization header, if present."""
    authorization: str | None = request.headers.get("Authorization")
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


def decode_access_token(token: str) -> dict:
    """
    Decode and validate a JWT access token.

    Raises HTTPException 401 if the token is invalid or expired.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError as exc:
        logger.debug("JWT decode failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": "Invalid or expired token"},
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def is_public_path(request: Request) -> bool:
    """Return True when the request targets a path that does not require
    authentication."""
    path = request.url.path
    method = request.method.upper()
    return (path, method) in PUBLIC_PATHS


async def verify_token_middleware(request: Request, call_next):
    """
    Starlette-compatible middleware coroutine.

    - Skips token verification for public paths.
    - For all other paths it checks that a valid Bearer token is present and
      attaches the decoded payload to ``request.state.token_payload`` so that
      downstream dependencies (``get_current_user``) can reuse it without a
      second decode.
    """
    if is_public_path(request):
        return await call_next(request)

    token = extract_token_from_request(request)
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "MISSING_TOKEN",
                "message": "Authentication credentials were not provided",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    request.state.token_payload = payload

    return await call_next(request)

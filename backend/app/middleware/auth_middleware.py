import logging

from fastapi import Request, status
from fastapi.responses import JSONResponse
from jose import JWTError, jwt

from app.config import settings

logger = logging.getLogger(__name__)

PUBLIC_PATHS = {
    ("/v1/auth/login", "POST"),
    ("/v1/auth/refresh", "POST"),
}

# Path prefixes that are always public regardless of method
PUBLIC_PATH_PREFIXES = (
    "/health",
    "/healthz",
    "/docs",
    "/redoc",
    "/openapi.json",
)


def extract_token_from_request(request: Request) -> str | None:
    """Extract the raw JWT string from the Authorization header, if present."""
    authorization: str | None = request.headers.get("Authorization")
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


def decode_access_token(token: str) -> dict | None:
    """
    Decode and validate a JWT access token.

    Returns the payload dict on success, or None if the token is invalid/expired.
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
        return None


def is_public_path(request: Request) -> bool:
    """Return True when the request targets a path that does not require
    authentication."""
    path = request.url.path
    method = request.method.upper()
    if (path, method) in PUBLIC_PATHS:
        return True
    for prefix in PUBLIC_PATH_PREFIXES:
        if path.startswith(prefix):
            return True
    return False


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
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "code": "MISSING_TOKEN",
                "message": "Authentication credentials were not provided",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if payload is None:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "code": "INVALID_TOKEN",
                "message": "Invalid or expired token",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    request.state.token_payload = payload

    return await call_next(request)

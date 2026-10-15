import pytest
from unittest.mock import patch, MagicMock
from fastapi import FastAPI
from fastapi.testclient import TestClient
from fastapi.requests import Request

from app.middleware.auth_middleware import (
    extract_token_from_request,
    decode_access_token,
    is_public_path,
    verify_token_middleware,
    PUBLIC_PATHS,
    PUBLIC_PATH_PREFIXES,
)


# ---------------------------------------------------------------------------
# Helpers – minimal FastAPI app wired with the middleware under test
# ---------------------------------------------------------------------------

def _make_app() -> FastAPI:
    """Return a tiny FastAPI app that uses verify_token_middleware."""
    app = FastAPI()

    @app.middleware("http")
    async def _mw(request: Request, call_next):
        return await verify_token_middleware(request, call_next)

    @app.post("/v1/auth/login")
    async def login():
        return {"ok": True}

    @app.get("/v1/protected")
    async def protected(request: Request):
        payload = request.state.token_payload
        return {"sub": payload.get("sub")}

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    return app


# ---------------------------------------------------------------------------
# Test 1 – public path (login) is served without a token
# ---------------------------------------------------------------------------

def test_public_path_requires_no_token():
    client = TestClient(_make_app(), raise_server_exceptions=False)
    response = client.post("/v1/auth/login")
    # Route handler returns 200 with {ok: true} — no 401 should be raised
    assert response.status_code == 200
    assert response.json() == {"ok": True}


# ---------------------------------------------------------------------------
# Test 2 – protected path without token returns 401 MISSING_TOKEN
# ---------------------------------------------------------------------------

def test_missing_token_returns_401():
    client = TestClient(_make_app(), raise_server_exceptions=False)
    response = client.get("/v1/protected")
    assert response.status_code == 401
    body = response.json()
    assert body["code"] == "MISSING_TOKEN"
    assert body["message"] == "Authentication credentials were not provided"
    assert response.headers.get("www-authenticate") == "Bearer"


# ---------------------------------------------------------------------------
# Test 3 – protected path with a valid token sets request.state.token_payload
# ---------------------------------------------------------------------------

def test_valid_token_sets_payload_and_passes_through():
    from jose import jwt as jose_jwt
    from app.config import settings

    token = jose_jwt.encode(
        {"sub": "user-42", "role": "technician"},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )

    client = TestClient(_make_app(), raise_server_exceptions=False)
    response = client.get("/v1/protected", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["sub"] == "user-42"


# ---------------------------------------------------------------------------
# Test 4 – invalid / tampered token returns 401 INVALID_TOKEN
# ---------------------------------------------------------------------------

def test_invalid_token_returns_401():
    client = TestClient(_make_app(), raise_server_exceptions=False)
    response = client.get(
        "/v1/protected", headers={"Authorization": "Bearer this.is.not.valid"}
    )
    assert response.status_code == 401
    body = response.json()
    assert body["code"] == "INVALID_TOKEN"
    assert body["message"] == "Invalid or expired token"
    assert response.headers.get("www-authenticate") == "Bearer"


# ---------------------------------------------------------------------------
# Test 5 – health / docs public prefix paths skip auth
# ---------------------------------------------------------------------------

def test_public_prefix_paths_skip_auth():
    client = TestClient(_make_app(), raise_server_exceptions=False)
    # /health is in PUBLIC_PATH_PREFIXES
    response = client.get("/health")
    assert response.status_code == 200


# ---------------------------------------------------------------------------
# Test 6 – extract_token_from_request unit-level checks
# ---------------------------------------------------------------------------

def test_extract_token_from_request():
    app = FastAPI()
    captured = {}

    @app.get("/probe")
    async def probe(request: Request):
        captured["token"] = extract_token_from_request(request)
        return {}

    client = TestClient(app)

    # With a proper Bearer header
    client.get("/probe", headers={"Authorization": "Bearer mytoken123"})
    assert captured["token"] == "mytoken123"

    # Without any header
    client.get("/probe")
    assert captured["token"] is None

    # Malformed header (no scheme)
    client.get("/probe", headers={"Authorization": "onlyone"})
    assert captured["token"] is None

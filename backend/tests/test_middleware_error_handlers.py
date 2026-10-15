import pytest
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.testclient import TestClient
from pydantic import ValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.middleware.error_handlers import (
    http_exception_handler,
    validation_exception_handler,
    unhandled_exception_handler,
    register_exception_handlers,
)


def make_app() -> FastAPI:
    """Create a minimal FastAPI app with error handlers and test routes."""
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/raise-http-dict")
    async def raise_http_dict():
        raise HTTPException(
            status_code=403,
            detail={
                "code": "FORBIDDEN",
                "message": "You do not have permission to perform this action",
            },
        )

    @app.get("/raise-http-string")
    async def raise_http_string():
        raise HTTPException(status_code=404, detail="Not found")

    @app.get("/raise-http-404-no-detail")
    async def raise_http_404_no_detail():
        raise StarletteHTTPException(status_code=404)

    @app.get("/raise-validation")
    async def raise_validation(q: int):  # q must be int — send a string to trigger
        return {"q": q}

    @app.get("/raise-unhandled")
    async def raise_unhandled():
        raise RuntimeError("boom")

    return app


@pytest.fixture()
def client():
    app = make_app()
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


# 1. HTTPException with dict detail preserves code and message exactly
def test_http_exception_dict_detail(client):
    resp = client.get("/raise-http-dict")
    assert resp.status_code == 403
    body = resp.json()
    assert body["code"] == "FORBIDDEN"
    assert body["message"] == "You do not have permission to perform this action"


# 2. HTTPException with plain string detail maps status to code string
def test_http_exception_string_detail(client):
    resp = client.get("/raise-http-string")
    assert resp.status_code == 404
    body = resp.json()
    assert body["code"] == "NOT_FOUND"
    assert body["message"] == "Not found"


# 3. HTTPException with no detail falls back to default message
def test_http_exception_no_detail(client):
    resp = client.get("/raise-http-404-no-detail")
    assert resp.status_code == 404
    body = resp.json()
    assert body["code"] == "NOT_FOUND"
    assert "not found" in body["message"].lower()


# 4. Validation errors produce VALIDATION_ERROR code with details
def test_validation_error_response(client):
    resp = client.get("/raise-validation", params={"q": "not-an-int"})
    assert resp.status_code == 422
    body = resp.json()
    assert body["code"] == "VALIDATION_ERROR"
    assert body["message"] == "Request validation failed"
    assert "details" in body
    assert "validation_errors" in body["details"]
    assert isinstance(body["details"]["validation_errors"], list)
    assert len(body["details"]["validation_errors"]) > 0


# 5. Unhandled exceptions return 500 without leaking internal details
def test_unhandled_exception_response(client):
    resp = client.get("/raise-unhandled")
    assert resp.status_code == 500
    body = resp.json()
    assert body["code"] == "INTERNAL_SERVER_ERROR"
    assert "unexpected error" in body["message"].lower()
    # Internal exception message must not leak
    assert "boom" not in body["message"]


# 6. Error body shape always has required fields code and message
def test_error_body_shape_consistency(client):
    """All error responses must have at minimum 'code' and 'message' keys."""
    endpoints = [
        "/raise-http-dict",
        "/raise-http-string",
        "/raise-http-404-no-detail",
        "/raise-unhandled",
    ]
    for url in endpoints:
        resp = client.get(url)
        body = resp.json()
        assert "code" in body, f"Missing 'code' in response from {url}: {body}"
        assert "message" in body, f"Missing 'message' in response from {url}: {body}"
        assert isinstance(body["code"], str)
        assert isinstance(body["message"], str)

import logging
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


def _error_body(code: str, message: str, details: Any = None) -> dict:
    body: dict = {"code": code, "message": message}
    if details is not None:
        body["details"] = details
    return body


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """
    Handle FastAPI / Starlette HTTPException instances.

    If the detail is already a dict (produced by our middleware or route
    handlers), extract ``code`` and ``message`` from it so the response
    matches the Error envelope exactly.
    """
    if isinstance(exc.detail, dict):
        code = exc.detail.get("code", "HTTP_ERROR")
        message = exc.detail.get("message", str(exc.detail))
        details = exc.detail.get("details", None)
    else:
        code = _status_to_code(exc.status_code)
        message = str(exc.detail) if exc.detail else _default_message(exc.status_code)
        details = None

    return JSONResponse(
        status_code=exc.status_code,
        content=_error_body(code, message, details),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Handle Pydantic / FastAPI request validation errors.

    Converts the list of validation errors into the Error envelope so clients
    always receive a consistent shape.
    """
    errors = exc.errors()
    details: dict = {"validation_errors": errors}
    logger.debug("Request validation error on %s %s: %s", request.method, request.url.path, errors)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_error_body(
            code="VALIDATION_ERROR",
            message="Request validation failed",
            details=details,
        ),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all handler for any exception that is not an HTTPException or
    RequestValidationError.  Internal details are logged server-side and
    never exposed in the response.
    """
    logger.exception(
        "Unhandled exception during %s %s",
        request.method,
        request.url.path,
        exc_info=exc,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_error_body(
            code="INTERNAL_SERVER_ERROR",
            message="An unexpected error occurred. Please try again later.",
        ),
    )


def _status_to_code(status_code: int) -> str:
    """Map common HTTP status codes to canonical error code strings."""
    mapping = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        409: "CONFLICT",
        422: "UNPROCESSABLE_ENTITY",
        429: "TOO_MANY_REQUESTS",
        500: "INTERNAL_SERVER_ERROR",
        502: "BAD_GATEWAY",
        503: "SERVICE_UNAVAILABLE",
    }
    return mapping.get(status_code, "HTTP_ERROR")


def _default_message(status_code: int) -> str:
    """Return a generic human-readable message for a given HTTP status code."""
    mapping = {
        400: "Bad request",
        401: "Authentication credentials were not provided or are invalid",
        403: "You do not have permission to perform this action",
        404: "The requested resource was not found",
        405: "Method not allowed",
        409: "A conflict occurred with the current state of the resource",
        422: "Request validation failed",
        429: "Too many requests — please slow down",
        500: "An unexpected error occurred. Please try again later.",
        502: "Bad gateway",
        503: "Service temporarily unavailable",
    }
    return mapping.get(status_code, "An error occurred")


def register_exception_handlers(app: FastAPI) -> None:
    """
    Register all global exception handlers on the FastAPI application.

    Call this once during application startup (e.g. inside ``create_app``).
    """
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, unhandled_exception_handler)  # type: ignore[arg-type]

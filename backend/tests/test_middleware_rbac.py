import pytest
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from unittest.mock import MagicMock

from app.middleware.rbac import require_role
from app.dependencies import get_current_user
from app.models.user import User


def make_user(role: str) -> User:
    user = MagicMock(spec=User)
    user.id = 1
    user.role = role
    user.is_active = True
    user.email = "test@example.com"
    user.full_name = "Test User"
    return user


def build_app_with_role_requirement(*allowed_roles: str) -> FastAPI:
    """Build a minimal FastAPI app with a single endpoint protected by require_role."""
    app = FastAPI()

    @app.get("/protected", dependencies=[Depends(require_role(*allowed_roles))])
    async def protected_endpoint():
        return {"ok": True}

    return app


def test_administrator_allowed_when_role_matches():
    """User with role 'administrator' can access endpoint that requires administrator."""
    app = build_app_with_role_requirement("administrator")
    admin_user = make_user("administrator")
    app.dependency_overrides[get_current_user] = lambda: admin_user

    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/protected")
    assert response.status_code == 200
    assert response.json() == {"ok": True}

    app.dependency_overrides.clear()


def test_manager_allowed_when_role_in_allowed_set():
    """User with role 'manager' can access endpoint that requires administrator or manager."""
    app = build_app_with_role_requirement("administrator", "manager")
    manager_user = make_user("manager")
    app.dependency_overrides[get_current_user] = lambda: manager_user

    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/protected")
    assert response.status_code == 200

    app.dependency_overrides.clear()


def test_technician_allowed_when_role_matches():
    """User with role 'technician' can access endpoint that requires technician."""
    app = build_app_with_role_requirement("technician")
    tech_user = make_user("technician")
    app.dependency_overrides[get_current_user] = lambda: tech_user

    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/protected")
    assert response.status_code == 200

    app.dependency_overrides.clear()


def test_forbidden_when_role_not_in_allowed_set():
    """User with role 'technician' receives 403 when endpoint requires administrator."""
    app = build_app_with_role_requirement("administrator")
    tech_user = make_user("technician")
    app.dependency_overrides[get_current_user] = lambda: tech_user

    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/protected")
    assert response.status_code == 403

    app.dependency_overrides.clear()


def test_forbidden_response_body_has_correct_code_and_message():
    """403 response body contains code FORBIDDEN and correct message."""
    app = build_app_with_role_requirement("administrator")
    manager_user = make_user("manager")
    app.dependency_overrides[get_current_user] = lambda: manager_user

    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/protected")
    assert response.status_code == 403
    body = response.json()
    # FastAPI wraps HTTPException detail in {"detail": ...}
    detail = body.get("detail", body)
    assert detail.get("code") == "FORBIDDEN"
    assert detail.get("message") == "You do not have permission to perform this action"

    app.dependency_overrides.clear()


def test_multiple_roles_each_allowed():
    """Both manager and technician are allowed when both roles are listed."""
    app = build_app_with_role_requirement("manager", "technician")

    for role in ("manager", "technician"):
        user = make_user(role)
        app.dependency_overrides[get_current_user] = lambda u=user: u
        client = TestClient(app, raise_server_exceptions=False)
        response = client.get("/protected")
        assert response.status_code == 200, f"Expected 200 for role '{role}', got {response.status_code}"

    app.dependency_overrides.clear()

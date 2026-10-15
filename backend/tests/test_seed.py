"""Tests for app.seed — first-administrator seed command."""
from __future__ import annotations

import sys
import uuid
from io import StringIO
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_mock_session(existing_user=None):
    """Return a mock async context-manager session."""
    session = AsyncMock()

    # scalar_one_or_none returns the existing_user (or None)
    scalar_result = MagicMock()
    scalar_result.scalar_one_or_none.return_value = existing_user
    session.execute = AsyncMock(return_value=scalar_result)

    session.add = MagicMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()

    # Support `async with SessionLocal() as session`
    cm = AsyncMock()
    cm.__aenter__ = AsyncMock(return_value=session)
    cm.__aexit__ = AsyncMock(return_value=False)
    return cm, session


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_seed_admin_creates_new_user(capsys, monkeypatch):
    """When no user exists, seed_admin creates an administrator and prints SUCCESS."""
    monkeypatch.setenv("ADMIN_EMAIL", "admin@example.com")
    monkeypatch.setenv("ADMIN_PASSWORD", "SecurePass123")

    cm, session = _make_mock_session(existing_user=None)

    # After refresh we want the new_user to have sensible attrs set
    async def fake_refresh(obj):
        if not hasattr(obj, "id") or obj.id is None:
            obj.id = uuid.uuid4()
        # role and email are already set on obj by seed_admin
    session.refresh.side_effect = fake_refresh

    with patch("app.seed.SessionLocal", return_value=cm), \
         patch("app.seed.hash_password", return_value="hashed_pw"):
        from app.seed import seed_admin
        await seed_admin()

    session.add.assert_called_once()
    session.commit.assert_awaited_once()

    captured = capsys.readouterr()
    assert "SUCCESS" in captured.out
    assert "admin@example.com" in captured.out


@pytest.mark.asyncio
async def test_seed_admin_idempotent_existing_user(capsys, monkeypatch):
    """When a user with the email already exists, seed_admin skips creation."""
    monkeypatch.setenv("ADMIN_EMAIL", "admin@example.com")
    monkeypatch.setenv("ADMIN_PASSWORD", "SecurePass123")

    existing = MagicMock()
    existing.id = uuid.uuid4()
    existing.email = "admin@example.com"

    cm, session = _make_mock_session(existing_user=existing)

    with patch("app.seed.SessionLocal", return_value=cm), \
         patch("app.seed.hash_password", return_value="hashed_pw"):
        from app.seed import seed_admin
        await seed_admin()

    session.add.assert_not_called()
    session.commit.assert_not_awaited()

    captured = capsys.readouterr()
    assert "already exists" in captured.out
    assert str(existing.id) in captured.out


@pytest.mark.asyncio
async def test_seed_admin_missing_email_exits(monkeypatch):
    """Missing ADMIN_EMAIL causes sys.exit(1) with an error printed to stderr."""
    monkeypatch.delenv("ADMIN_EMAIL", raising=False)
    monkeypatch.setenv("ADMIN_PASSWORD", "SecurePass123")

    with pytest.raises(SystemExit) as exc_info:
        from app.seed import seed_admin
        await seed_admin()

    assert exc_info.value.code == 1


@pytest.mark.asyncio
async def test_seed_admin_missing_password_exits(monkeypatch):
    """Missing ADMIN_PASSWORD causes sys.exit(1) with an error printed to stderr."""
    monkeypatch.setenv("ADMIN_EMAIL", "admin@example.com")
    monkeypatch.delenv("ADMIN_PASSWORD", raising=False)

    with pytest.raises(SystemExit) as exc_info:
        from app.seed import seed_admin
        await seed_admin()

    assert exc_info.value.code == 1


@pytest.mark.asyncio
async def test_seed_admin_new_user_role_and_fields(monkeypatch):
    """The created user has role='administrator', is_active=True, depot_id=None."""
    monkeypatch.setenv("ADMIN_EMAIL", "newadmin@fleet.io")
    monkeypatch.setenv("ADMIN_PASSWORD", "Str0ngPass!")

    cm, session = _make_mock_session(existing_user=None)

    captured_user = {}

    def capture_add(obj):
        captured_user["user"] = obj

    session.add.side_effect = capture_add

    async def fake_refresh(obj):
        pass
    session.refresh.side_effect = fake_refresh

    with patch("app.seed.SessionLocal", return_value=cm), \
         patch("app.seed.hash_password", return_value="hashed_pw"):
        from app.seed import seed_admin
        await seed_admin()

    user = captured_user["user"]
    assert user.role == "administrator"
    assert user.is_active is True
    assert user.depot_id is None
    assert user.email == "newadmin@fleet.io"
    assert user.password_hash == "hashed_pw"
    assert user.full_name == "Administrator"


@pytest.mark.asyncio
async def test_seed_admin_password_is_hashed(monkeypatch):
    """hash_password is called with the plain-text password from the environment."""
    monkeypatch.setenv("ADMIN_EMAIL", "secure@example.com")
    monkeypatch.setenv("ADMIN_PASSWORD", "PlainTextSecret")

    cm, session = _make_mock_session(existing_user=None)

    async def fake_refresh(obj):
        pass
    session.refresh.side_effect = fake_refresh

    with patch("app.seed.SessionLocal", return_value=cm), \
         patch("app.seed.hash_password", return_value="bcrypt_hash") as mock_hash:
        from app.seed import seed_admin
        await seed_admin()

    mock_hash.assert_called_once_with("PlainTextSecret")

"""Unit tests for UserRepository – fully mocked, no real DB."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from app.repositories.user_repository import UserRepository


# ---------------------------------------------------------------------------
# Helpers to build a lightweight fake User object
# ---------------------------------------------------------------------------

def _make_user(
    user_id=None,
    full_name="Alice Smith",
    email="alice@example.com",
    password_hash="hashed",
    role="technician",
    depot_id=None,
    is_active=True,
):
    user = MagicMock()
    user.id = user_id or uuid4()
    user.full_name = full_name
    user.email = email
    user.password_hash = password_hash
    user.role = role
    user.depot_id = depot_id or uuid4()
    user.is_active = is_active
    return user


# ---------------------------------------------------------------------------
# Shared async-session factory
# ---------------------------------------------------------------------------

def _make_session():
    session = MagicMock()
    session.add = MagicMock()
    session.delete = AsyncMock()
    session.flush = AsyncMock()
    session.refresh = AsyncMock()
    session.execute = AsyncMock()
    return session


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_by_email_returns_user_when_found():
    """get_by_email should return the user whose email matches."""
    session = _make_session()
    expected_user = _make_user(email="alice@example.com")

    scalar_result = MagicMock()
    scalar_result.scalar_one_or_none.return_value = expected_user
    session.execute.return_value = scalar_result

    repo = UserRepository(session)
    result = await repo.get_by_email("alice@example.com")

    assert result is expected_user
    session.execute.assert_called_once()


@pytest.mark.asyncio
async def test_create_adds_user_and_returns_it():
    """create should add a new User to the session and return it."""
    session = _make_session()
    depot_id = uuid4()

    created_user = _make_user(
        full_name="Bob Jones",
        email="bob@example.com",
        password_hash="ph",
        role="manager",
        depot_id=depot_id,
    )

    # refresh populates the returned object
    async def _refresh(obj):
        obj.id = created_user.id
        obj.full_name = created_user.full_name
        obj.email = created_user.email
        obj.role = created_user.role

    session.refresh.side_effect = _refresh

    repo = UserRepository(session)

    # Patch the model constructor so we control the instance
    with patch("app.repositories.user_repository.User", return_value=created_user):
        result = await repo.create(
            full_name="Bob Jones",
            email="bob@example.com",
            password_hash="ph",
            role="manager",
            depot_id=depot_id,
        )

    session.add.assert_called_once_with(created_user)
    session.flush.assert_called_once()
    session.refresh.assert_called_once_with(created_user)
    assert result is created_user


@pytest.mark.asyncio
async def test_update_modifies_fields_and_flushes():
    """update should only touch the provided fields and persist them."""
    session = _make_session()
    user = _make_user(email="old@example.com", full_name="Old Name", role="technician")

    session.refresh.side_effect = lambda obj: None  # no-op

    repo = UserRepository(session)
    result = await repo.update(user, full_name="New Name", email="new@example.com")

    assert user.full_name == "New Name"
    assert user.email == "new@example.com"
    assert user.role == "technician"  # unchanged
    session.add.assert_called_once_with(user)
    session.flush.assert_called_once()
    session.refresh.assert_called_once_with(user)
    assert result is user


@pytest.mark.asyncio
async def test_get_by_email_returns_none_when_not_found():
    """get_by_email should return None when no matching row exists."""
    session = _make_session()

    scalar_result = MagicMock()
    scalar_result.scalar_one_or_none.return_value = None
    session.execute.return_value = scalar_result

    repo = UserRepository(session)
    result = await repo.get_by_email("nobody@example.com")

    assert result is None

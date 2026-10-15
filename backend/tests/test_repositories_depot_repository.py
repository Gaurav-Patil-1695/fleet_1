"""Unit tests for DepotRepository — mocked AsyncSession, no real DB."""
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.repositories.depot_repository import DepotRepository
from app.models.depot import Depot


def _make_depot(name: str = "Alpha Depot", address: str | None = "123 Main St") -> Depot:
    d = Depot()
    d.id = uuid.uuid4()
    d.name = name
    d.address = address
    return d


def _mock_session() -> MagicMock:
    """Return a MagicMock that satisfies AsyncSession usage patterns."""
    session = MagicMock()
    session.add = MagicMock()
    session.delete = AsyncMock()
    session.flush = AsyncMock()
    session.refresh = AsyncMock()
    return session


@pytest.mark.asyncio
async def test_get_all_returns_depots_ordered():
    """get_all executes a SELECT and returns all depot rows as a list."""
    session = _mock_session()
    depot1 = _make_depot(name="Alpha")
    depot2 = _make_depot(name="Beta")

    scalars_result = MagicMock()
    scalars_result.all.return_value = [depot1, depot2]
    execute_result = MagicMock()
    execute_result.scalars.return_value = scalars_result
    session.execute = AsyncMock(return_value=execute_result)

    repo = DepotRepository(session)
    result = await repo.get_all()

    assert result == [depot1, depot2]
    session.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_adds_and_returns_depot():
    """create() constructs a Depot, adds it, flushes, refreshes, and returns it."""
    session = _mock_session()

    created_depot = _make_depot(name="New Depot", address="456 Elm St")

    async def fake_refresh(obj):
        # simulate DB populating the object after flush
        obj.id = created_depot.id
        obj.name = created_depot.name
        obj.address = created_depot.address

    session.refresh = AsyncMock(side_effect=fake_refresh)

    repo = DepotRepository(session)
    result = await repo.create(name="New Depot", address="456 Elm St")

    session.add.assert_called_once()
    session.flush.assert_awaited_once()
    session.refresh.assert_awaited_once()
    assert result.name == "New Depot"
    assert result.address == "456 Elm St"


@pytest.mark.asyncio
async def test_get_by_id_returns_none_when_not_found():
    """get_by_id returns None when the depot does not exist."""
    session = _mock_session()

    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = None
    session.execute = AsyncMock(return_value=execute_result)

    repo = DepotRepository(session)
    result = await repo.get_by_id(uuid.uuid4())

    assert result is None
    session.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_calls_session_delete_and_flush():
    """delete() calls session.delete with the depot and then flushes."""
    session = _mock_session()
    depot = _make_depot()

    repo = DepotRepository(session)
    await repo.delete(depot)

    session.delete.assert_awaited_once_with(depot)
    session.flush.assert_awaited_once()

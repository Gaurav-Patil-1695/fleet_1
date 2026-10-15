"""Smoke tests for ScheduleRepository."""
import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.repositories.schedule_repository import ScheduleRepository
from app.models.schedule import Schedule


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _make_schedule(**kwargs) -> Schedule:
    """Return a lightweight Schedule ORM object without touching a real DB."""
    s = Schedule(
        vehicle_type_id=kwargs.get("vehicle_type_id", uuid.uuid4()),
        vehicle_class=kwargs.get("vehicle_class", "heavy_truck"),
        km_interval=kwargs.get("km_interval", 10000),
        month_interval=kwargs.get("month_interval", 6),
        is_active=kwargs.get("is_active", True),
    )
    if "id" in kwargs:
        s.id = kwargs["id"]
    if "created_at" in kwargs:
        s.created_at = kwargs["created_at"]
    if "updated_at" in kwargs:
        s.updated_at = kwargs["updated_at"]
    return s


def _make_session() -> MagicMock:
    """Return a mock AsyncSession."""
    session = MagicMock()
    session.add = MagicMock()
    session.flush = AsyncMock()
    session.refresh = AsyncMock()
    session.delete = AsyncMock()
    session.execute = AsyncMock()
    return session


# ---------------------------------------------------------------------------
# tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_schedule_adds_and_returns_schedule():
    """create() should build a Schedule, add it to the session, flush, refresh, and return it."""
    session = _make_session()
    repo = ScheduleRepository(session)

    vehicle_type_id = uuid.uuid4()

    # After flush+refresh, simulate the ORM object having been populated.
    created_schedule = _make_schedule(
        vehicle_type_id=vehicle_type_id,
        vehicle_class="light_commercial",
        km_interval=5000,
        month_interval=3,
        is_active=True,
    )

    # refresh is a side-effect that would normally populate the object;
    # we capture the object passed to session.add instead.
    added_objects = []

    def _capture_add(obj):
        added_objects.append(obj)

    session.add.side_effect = _capture_add

    # Patch the Schedule constructor so we control the returned instance.
    with patch("app.repositories.schedule_repository.Schedule", return_value=created_schedule):
        result = await repo.create(
            vehicle_type_id=vehicle_type_id,
            vehicle_class="light_commercial",
            km_interval=5000,
            month_interval=3,
            is_active=True,
        )

    session.add.assert_called_once_with(created_schedule)
    session.flush.assert_awaited_once()
    session.refresh.assert_awaited_once_with(created_schedule)
    assert result is created_schedule
    assert result.vehicle_class == "light_commercial"
    assert result.km_interval == 5000
    assert result.is_active is True


@pytest.mark.asyncio
async def test_get_active_by_vehicle_type_id_returns_none_when_not_found():
    """get_active_by_vehicle_type_id() should return None when no active schedule exists."""
    session = _make_session()
    repo = ScheduleRepository(session)

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await repo.get_active_by_vehicle_type_id(uuid.uuid4())

    assert result is None
    session.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_schedule_modifies_fields_and_refreshes():
    """update() should apply only non-None kwargs, add to session, flush, and refresh."""
    session = _make_session()
    repo = ScheduleRepository(session)

    schedule = _make_schedule(
        vehicle_class="heavy_truck",
        km_interval=10000,
        month_interval=6,
        is_active=True,
    )

    result = await repo.update(
        schedule,
        km_interval=15000,
        is_active=False,
    )

    # Fields that were passed should be updated.
    assert schedule.km_interval == 15000
    assert schedule.is_active is False
    # Fields not passed should remain unchanged.
    assert schedule.month_interval == 6
    assert schedule.vehicle_class == "heavy_truck"

    session.add.assert_called_once_with(schedule)
    session.flush.assert_awaited_once()
    session.refresh.assert_awaited_once_with(schedule)
    assert result is schedule


@pytest.mark.asyncio
async def test_delete_schedule_calls_session_delete_and_flush():
    """delete() should call session.delete with the schedule and then flush."""
    session = _make_session()
    repo = ScheduleRepository(session)

    schedule = _make_schedule()

    await repo.delete(schedule)

    session.delete.assert_awaited_once_with(schedule)
    session.flush.assert_awaited_once()

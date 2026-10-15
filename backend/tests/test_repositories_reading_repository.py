"""Unit tests for ReadingRepository using a mocked AsyncSession."""
import pytest
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from app.repositories.reading_repository import ReadingRepository


def _make_mock_session():
    """Return a minimal AsyncSession mock."""
    session = MagicMock()
    session.add = MagicMock()
    session.delete = AsyncMock()
    session.flush = AsyncMock()
    session.refresh = AsyncMock()
    session.execute = AsyncMock()
    return session


@pytest.mark.asyncio
async def test_create_reading_adds_and_flushes():
    """create() should build a Reading, add it to the session, flush, and refresh."""
    session = _make_mock_session()

    # After refresh the model should look like the created object
    vehicle_id = uuid4()
    user_id = uuid4()
    odometer = Decimal("12345.6")
    ts = datetime(2024, 1, 15, 8, 0, 0, tzinfo=timezone.utc)

    repo = ReadingRepository(session)

    # Patch the Reading constructor so we can capture the instance
    with patch("app.repositories.reading_repository.Reading") as MockReading:
        mock_instance = MagicMock()
        mock_instance.vehicle_id = vehicle_id
        mock_instance.odometer_km = odometer
        mock_instance.source = "manual"
        mock_instance.recorded_by_user_id = user_id
        mock_instance.is_test_mode = False
        mock_instance.raw_payload = None
        mock_instance.reading_timestamp = ts
        MockReading.return_value = mock_instance

        result = await repo.create(
            vehicle_id=vehicle_id,
            odometer_km=odometer,
            source="manual",
            recorded_by_user_id=user_id,
            is_test_mode=False,
            raw_payload=None,
            reading_timestamp=ts,
        )

    # Verify the ORM object was added, flushed, and refreshed
    session.add.assert_called_once_with(mock_instance)
    session.flush.assert_awaited_once()
    session.refresh.assert_awaited_once_with(mock_instance)
    assert result is mock_instance
    assert result.vehicle_id == vehicle_id
    assert result.source == "manual"


@pytest.mark.asyncio
async def test_get_by_vehicle_id_returns_readings():
    """get_by_vehicle_id() should execute a SELECT and return Reading objects."""
    session = _make_mock_session()
    vehicle_id = uuid4()

    reading1 = MagicMock()
    reading1.vehicle_id = vehicle_id
    reading2 = MagicMock()
    reading2.vehicle_id = vehicle_id

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [reading1, reading2]
    session.execute.return_value = mock_result

    repo = ReadingRepository(session)
    results = await repo.get_by_vehicle_id(vehicle_id)

    session.execute.assert_awaited_once()
    assert len(results) == 2
    assert all(r.vehicle_id == vehicle_id for r in results)


@pytest.mark.asyncio
async def test_get_by_id_returns_none_when_missing():
    """get_by_id() should return None when the reading does not exist."""
    session = _make_mock_session()

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    repo = ReadingRepository(session)
    result = await repo.get_by_id(uuid4())

    session.execute.assert_awaited_once()
    assert result is None


@pytest.mark.asyncio
async def test_delete_reading_calls_session_delete_and_flush():
    """delete() should call session.delete then flush."""
    session = _make_mock_session()
    mock_reading = MagicMock()

    repo = ReadingRepository(session)
    await repo.delete(mock_reading)

    session.delete.assert_awaited_once_with(mock_reading)
    session.flush.assert_awaited_once()

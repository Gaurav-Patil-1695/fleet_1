"""Unit tests for WorkOrderRepository using a mocked AsyncSession."""
import uuid
from datetime import datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.repositories.work_order_repository import WorkOrderRepository


def _make_session():
    """Return a minimal AsyncSession mock with the methods the repository calls."""
    session = MagicMock()
    session.add = MagicMock()
    session.flush = AsyncMock()
    session.refresh = AsyncMock()
    session.delete = AsyncMock()
    session.execute = AsyncMock()
    return session


def _make_work_order(**kwargs):
    """Return a lightweight WorkOrder-like object."""
    wo = MagicMock()
    wo.id = kwargs.get("id", uuid.uuid4())
    wo.vehicle_id = kwargs.get("vehicle_id", uuid.uuid4())
    wo.depot_id = kwargs.get("depot_id", uuid.uuid4())
    wo.raised_by_user_id = kwargs.get("raised_by_user_id", uuid.uuid4())
    wo.status = kwargs.get("status", "open")
    wo.description = kwargs.get("description", None)
    wo.assigned_technician_id = kwargs.get("assigned_technician_id", None)
    wo.closed_by_user_id = kwargs.get("closed_by_user_id", None)
    wo.completion_notes = kwargs.get("completion_notes", None)
    wo.post_service_odometer_km = kwargs.get("post_service_odometer_km", None)
    wo.post_service_reading_id = kwargs.get("post_service_reading_id", None)
    wo.raised_at = kwargs.get("raised_at", datetime(2024, 1, 10, 8, 0, 0))
    wo.closed_at = kwargs.get("closed_at", None)
    return wo


@pytest.mark.asyncio
async def test_create_work_order_calls_session_correctly():
    """create() should build a WorkOrder, add/flush/refresh it and return it."""
    session = _make_session()
    repo = WorkOrderRepository(session)

    vehicle_id = uuid.uuid4()
    depot_id = uuid.uuid4()
    user_id = uuid.uuid4()
    raised_at = datetime(2024, 6, 1, 9, 0, 0)

    # After refresh the session 'writes back' a populated object — simulate via side_effect
    created_wo = _make_work_order(
        vehicle_id=vehicle_id,
        depot_id=depot_id,
        raised_by_user_id=user_id,
        status="open",
        description="Brake check",
        raised_at=raised_at,
    )

    # patch WorkOrder constructor so we can intercept what was added
    with patch("app.repositories.work_order_repository.WorkOrder", return_value=created_wo) as MockWO:
        result = await repo.create(
            vehicle_id=vehicle_id,
            depot_id=depot_id,
            raised_by_user_id=user_id,
            status="open",
            description="Brake check",
            raised_at=raised_at,
        )

    MockWO.assert_called_once()
    call_kwargs = MockWO.call_args.kwargs
    assert call_kwargs["vehicle_id"] == vehicle_id
    assert call_kwargs["depot_id"] == depot_id
    assert call_kwargs["raised_by_user_id"] == user_id
    assert call_kwargs["status"] == "open"
    assert call_kwargs["description"] == "Brake check"
    assert call_kwargs["raised_at"] == raised_at

    session.add.assert_called_once_with(created_wo)
    session.flush.assert_awaited_once()
    session.refresh.assert_awaited_once_with(created_wo)
    assert result is created_wo


@pytest.mark.asyncio
async def test_assign_updates_technician_and_status():
    """assign() must set assigned_technician_id and status then flush/refresh."""
    session = _make_session()
    repo = WorkOrderRepository(session)

    wo = _make_work_order(status="open")
    tech_id = uuid.uuid4()

    result = await repo.assign(work_order=wo, assigned_technician_id=tech_id, status="in_progress")

    assert wo.assigned_technician_id == tech_id
    assert wo.status == "in_progress"
    session.add.assert_called_once_with(wo)
    session.flush.assert_awaited_once()
    session.refresh.assert_awaited_once_with(wo)
    assert result is wo


@pytest.mark.asyncio
async def test_close_sets_all_closure_fields():
    """close() must set status='closed', closure metadata, and flush/refresh."""
    session = _make_session()
    repo = WorkOrderRepository(session)

    wo = _make_work_order(status="in_progress")
    closer_id = uuid.uuid4()
    reading_id = uuid.uuid4()
    closed_at = datetime(2024, 6, 15, 17, 0, 0)
    odometer = Decimal("123456.7")

    result = await repo.close(
        work_order=wo,
        closed_by_user_id=closer_id,
        completion_notes="All done",
        post_service_odometer_km=odometer,
        closed_at=closed_at,
        post_service_reading_id=reading_id,
    )

    assert wo.status == "closed"
    assert wo.closed_by_user_id == closer_id
    assert wo.completion_notes == "All done"
    assert wo.post_service_odometer_km == odometer
    assert wo.closed_at == closed_at
    assert wo.post_service_reading_id == reading_id
    session.flush.assert_awaited_once()
    session.refresh.assert_awaited_once_with(wo)
    assert result is wo


@pytest.mark.asyncio
async def test_get_by_id_returns_none_when_not_found():
    """get_by_id() must return None when the scalar result is None (not found)."""
    session = _make_session()
    repo = WorkOrderRepository(session)

    scalar_result = MagicMock()
    scalar_result.scalar_one_or_none = MagicMock(return_value=None)
    session.execute = AsyncMock(return_value=scalar_result)

    missing_id = uuid.uuid4()
    result = await repo.get_by_id(missing_id)

    assert result is None
    session.execute.assert_awaited_once()

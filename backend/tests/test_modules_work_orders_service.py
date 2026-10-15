"""Unit tests for WorkOrderService – smoke layer covering REQ-4 and REQ-5."""
from __future__ import annotations

import math
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Optional
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException

from app.modules.work_orders.schemas import (
    Pagination,
    WorkOrderAssign,
    WorkOrderClose,
    WorkOrderCreate,
    WorkOrderListResponse,
    WorkOrderRead,
    WorkOrderUpdate,
)
from app.modules.work_orders.service import WorkOrderService


# ---------------------------------------------------------------------------
# Helpers / fake model builders
# ---------------------------------------------------------------------------

def _make_wo(
    *,
    wo_id: UUID | None = None,
    vehicle_id: UUID | None = None,
    depot_id: UUID | None = None,
    raised_by: UUID | None = None,
    status: str = "open",
    description: str | None = "Test description",
    assigned_technician_id: UUID | None = None,
    closed_by_user_id: UUID | None = None,
    completion_notes: str | None = None,
    post_service_odometer_km: Decimal | None = None,
    post_service_reading_id: UUID | None = None,
    closed_at: datetime | None = None,
) -> MagicMock:
    """Return a MagicMock that behaves like a WorkOrder ORM instance."""
    wo = MagicMock()
    wo.id = wo_id or uuid4()
    wo.vehicle_id = vehicle_id or uuid4()
    wo.depot_id = depot_id or uuid4()
    wo.raised_by_user_id = raised_by or uuid4()
    wo.status = status
    wo.description = description
    wo.assigned_technician_id = assigned_technician_id
    wo.closed_by_user_id = closed_by_user_id
    wo.completion_notes = completion_notes
    wo.post_service_odometer_km = post_service_odometer_km
    wo.post_service_reading_id = post_service_reading_id
    wo.raised_at = datetime(2024, 6, 10, 7, 30, tzinfo=timezone.utc)
    wo.closed_at = closed_at
    wo.created_at = datetime(2024, 6, 10, 7, 30, tzinfo=timezone.utc)
    wo.updated_at = datetime(2024, 6, 10, 7, 30, tzinfo=timezone.utc)
    return wo


def _make_vehicle(vehicle_id: UUID | None = None, vehicle_type_id: UUID | None = None) -> MagicMock:
    v = MagicMock()
    v.id = vehicle_id or uuid4()
    v.vehicle_type_id = vehicle_type_id or uuid4()
    v.last_serviced_odometer_km = None
    v.last_serviced_at = None
    v.last_known_odometer_km = None
    v.last_odometer_recorded_at = None
    v.next_service_due_date = None
    v.next_service_due_odometer_km = None
    return v


def _make_technician(tech_id: UUID | None = None) -> MagicMock:
    t = MagicMock()
    t.id = tech_id or uuid4()
    t.role = "technician"
    t.is_active = True
    return t


def _make_db(wo_scalar=None, vehicle_scalar=None, tech_scalar=None, count_val: int = 0):
    """Build an AsyncMock AsyncSession whose .execute() returns configured scalars."""
    db = AsyncMock()

    # We'll track call order to return the right scalars
    _call_idx = [0]
    _scalars = [wo_scalar, vehicle_scalar, tech_scalar]

    async def _execute(query):
        result = MagicMock()
        idx = _call_idx[0]
        _call_idx[0] += 1
        # Decide what to return based on index
        if idx < len(_scalars) and _scalars[idx] is not None:
            scalar_val = _scalars[idx]
        else:
            scalar_val = None

        result.scalars.return_value.all.return_value = [wo_scalar] if (idx == 0 and wo_scalar) else []
        result.scalar_one_or_none.return_value = scalar_val
        result.scalar_one.return_value = count_val
        return result

    db.execute.side_effect = _execute
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.flush = AsyncMock()
    db.add = MagicMock()
    db.delete = AsyncMock()
    return db


# ---------------------------------------------------------------------------
# Test 1: create_work_order – happy path
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_work_order_success():
    vehicle_id = UUID("b2c3d4e5-0002-4000-8000-000000000002")
    depot_id = UUID("c3d4e5f6-0003-4000-8000-000000000003")
    raised_by = UUID("e5f6a7b8-0005-4000-8000-000000000005")

    vehicle = _make_vehicle(vehicle_id=vehicle_id)
    wo = _make_wo(
        vehicle_id=vehicle_id,
        depot_id=depot_id,
        raised_by=raised_by,
        status="open",
        description="Scheduled 10,000 km service",
    )

    db = AsyncMock()
    execute_result_vehicle = MagicMock()
    execute_result_vehicle.scalar_one_or_none.return_value = vehicle
    db.execute = AsyncMock(return_value=execute_result_vehicle)
    db.add = MagicMock()
    db.commit = AsyncMock()

    # After commit+refresh the work_order should have all fields set.
    # We simulate this by patching refresh to set fields on the work_order object.
    added_work_order = None

    def capture_add(obj):
        nonlocal added_work_order
        added_work_order = obj
        # Manually set fields that the constructor sets
        obj.id = UUID("a1b2c3d4-0010-4000-8000-000000000010")
        obj.raised_at = datetime(2024, 6, 10, 7, 30, tzinfo=timezone.utc)
        obj.closed_at = None
        obj.created_at = datetime(2024, 6, 10, 7, 30, tzinfo=timezone.utc)
        obj.updated_at = datetime(2024, 6, 10, 7, 30, tzinfo=timezone.utc)
        obj.assigned_technician_id = None
        obj.closed_by_user_id = None
        obj.completion_notes = None
        obj.post_service_odometer_km = None
        obj.post_service_reading_id = None

    db.add.side_effect = capture_add
    db.refresh = AsyncMock()

    service = WorkOrderService(db)
    body = WorkOrderCreate(
        vehicle_id=vehicle_id,
        depot_id=depot_id,
        description="Scheduled 10,000 km service",
    )
    result = await service.create_work_order(body=body, raised_by_user_id=raised_by)

    assert result.status == "open"
    assert result.vehicle_id == vehicle_id
    assert result.depot_id == depot_id
    assert result.raised_by_user_id == raised_by
    assert result.assigned_technician_id is None
    assert result.closed_by_user_id is None
    db.commit.assert_called_once()


# ---------------------------------------------------------------------------
# Test 2: create_work_order – vehicle not found
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_work_order_vehicle_not_found():
    db = AsyncMock()
    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=execute_result)

    service = WorkOrderService(db)
    body = WorkOrderCreate(
        vehicle_id=uuid4(),
        depot_id=uuid4(),
        description="some work",
    )
    with pytest.raises(HTTPException) as exc_info:
        await service.create_work_order(body=body, raised_by_user_id=uuid4())

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail["code"] == "VEHICLE_NOT_FOUND"
    assert exc_info.value.detail["message"] == "Vehicle not found."


# ---------------------------------------------------------------------------
# Test 3: assign_work_order – happy path (open -> in_progress)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_assign_work_order_sets_in_progress():
    wo_id = uuid4()
    tech_id = UUID("d4e5f6a7-0004-4000-8000-000000000004")

    wo = _make_wo(wo_id=wo_id, status="open")
    tech = _make_technician(tech_id=tech_id)

    db = AsyncMock()
    call_count = [0]

    async def execute_side(query):
        result = MagicMock()
        if call_count[0] == 0:
            result.scalar_one_or_none.return_value = wo
        else:
            result.scalar_one_or_none.return_value = tech
        call_count[0] += 1
        return result

    db.execute.side_effect = execute_side
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    service = WorkOrderService(db)
    body = WorkOrderAssign(assigned_technician_id=tech_id)
    result = await service.assign_work_order(work_order_id=wo_id, body=body)

    assert wo.assigned_technician_id == tech_id
    assert wo.status == "in_progress"
    db.commit.assert_called_once()


# ---------------------------------------------------------------------------
# Test 4: assign_work_order – technician not found
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_assign_work_order_technician_not_found():
    wo_id = uuid4()
    wo = _make_wo(wo_id=wo_id, status="open")

    db = AsyncMock()
    call_count = [0]

    async def execute_side(query):
        result = MagicMock()
        if call_count[0] == 0:
            result.scalar_one_or_none.return_value = wo
        else:
            result.scalar_one_or_none.return_value = None  # technician not found
        call_count[0] += 1
        return result

    db.execute.side_effect = execute_side

    service = WorkOrderService(db)
    body = WorkOrderAssign(assigned_technician_id=uuid4())
    with pytest.raises(HTTPException) as exc_info:
        await service.assign_work_order(work_order_id=wo_id, body=body)

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail["code"] == "TECHNICIAN_NOT_FOUND"


# ---------------------------------------------------------------------------
# Test 5: close_work_order – happy path resets service clock
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_close_work_order_resets_service_clock():
    wo_id = UUID("a1b2c3d4-0010-4000-8000-000000000010")
    vehicle_id = UUID("b2c3d4e5-0002-4000-8000-000000000002")
    closed_by = UUID("d4e5f6a7-0004-4000-8000-000000000004")

    wo = _make_wo(wo_id=wo_id, vehicle_id=vehicle_id, status="in_progress")
    vehicle = _make_vehicle(vehicle_id=vehicle_id)

    db = AsyncMock()
    call_count = [0]

    async def execute_side(query):
        result = MagicMock()
        if call_count[0] == 0:
            result.scalar_one_or_none.return_value = wo
        else:
            result.scalar_one_or_none.return_value = vehicle
        call_count[0] += 1
        return result

    db.execute.side_effect = execute_side
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.flush = AsyncMock()

    # The Reading object added must get an id after flush
    reading_id = uuid4()

    def capture_add(obj):
        # Give it a fake id (simulates flush assigning PK)
        obj.id = reading_id

    db.add.side_effect = capture_add

    body = WorkOrderClose(
        completion_notes="Oil changed, brake pads replaced on front axle, tyres rotated. Vehicle in good condition.",
        post_service_odometer_km=Decimal("10234.5"),
    )

    with patch(
        "app.modules.work_orders.service.calculate_next_service_due",
        new=AsyncMock(return_value={"next_service_due_date": None, "next_service_due_odometer_km": 20000}),
    ):
        service = WorkOrderService(db)
        result = await service.close_work_order(
            work_order_id=wo_id, body=body, closed_by_user_id=closed_by
        )

    assert wo.status == "closed"
    assert wo.completion_notes == body.completion_notes
    assert wo.post_service_odometer_km == body.post_service_odometer_km
    assert wo.closed_by_user_id == closed_by
    assert vehicle.last_serviced_odometer_km == 10234
    assert vehicle.last_known_odometer_km == 10234
    db.commit.assert_called_once()


# ---------------------------------------------------------------------------
# Test 6: close_work_order – already closed raises 409
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_close_work_order_already_closed():
    wo_id = uuid4()
    wo = _make_wo(wo_id=wo_id, status="closed")

    db = AsyncMock()
    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = wo
    db.execute = AsyncMock(return_value=execute_result)

    service = WorkOrderService(db)
    body = WorkOrderClose(
        completion_notes="Already done.",
        post_service_odometer_km=Decimal("5000"),
    )
    with pytest.raises(HTTPException) as exc_info:
        await service.close_work_order(work_order_id=wo_id, body=body, closed_by_user_id=uuid4())

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail["code"] == "WORK_ORDER_ALREADY_CLOSED"
    assert exc_info.value.detail["message"] == "Work order is already closed."


# ---------------------------------------------------------------------------
# Test 7: update_work_order – cannot update closed work order
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_work_order_closed_raises_409():
    wo_id = uuid4()
    wo = _make_wo(wo_id=wo_id, status="closed")

    db = AsyncMock()
    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = wo
    db.execute = AsyncMock(return_value=execute_result)

    service = WorkOrderService(db)
    body = WorkOrderUpdate(description="Updated description")
    with pytest.raises(HTTPException) as exc_info:
        await service.update_work_order(work_order_id=wo_id, body=body)

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail["code"] == "WORK_ORDER_NOT_EDITABLE"
    assert "closed or cancelled" in exc_info.value.detail["message"]


# ---------------------------------------------------------------------------
# Test 8: delete_work_order – only open work orders can be deleted
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_work_order_non_open_raises_409():
    wo_id = uuid4()
    wo = _make_wo(wo_id=wo_id, status="in_progress")

    db = AsyncMock()
    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = wo
    db.execute = AsyncMock(return_value=execute_result)

    service = WorkOrderService(db)
    with pytest.raises(HTTPException) as exc_info:
        await service.delete_work_order(work_order_id=wo_id)

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail["code"] == "WORK_ORDER_NOT_OPEN"
    assert exc_info.value.detail["message"] == "Only open work orders can be deleted."

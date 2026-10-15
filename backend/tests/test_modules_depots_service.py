"""Unit tests for DepotService (app.modules.depots.service)."""
from datetime import date, datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException

from app.modules.depots.service import DepotService
from app.modules.depots.schemas import DepotCreate, DepotUpdate


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_depot(
    depot_id=None,
    name="North Depot",
    address="123 Industrial Ave, Springfield, IL 62701",
):
    """Return a lightweight Depot-like mock."""
    d = MagicMock()
    d.id = depot_id or uuid4()
    d.name = name
    d.address = address
    d.created_at = datetime(2024, 1, 10, 8, 0, 0, tzinfo=timezone.utc)
    d.updated_at = datetime(2024, 3, 15, 14, 30, 0, tzinfo=timezone.utc)
    # Make model_validate work by using from_attributes style
    return d


def _make_vehicle(
    depot_id,
    vehicle_id=None,
    registration_number="ABC-1234",
    make="Toyota",
    model="HiAce",
    last_known_odometer_km=48500.0,
    next_service_due_date=None,
    next_service_due_odometer_km=50000.0,
    status="active",
):
    v = MagicMock()
    v.id = vehicle_id or uuid4()
    v.depot_id = depot_id
    v.registration_number = registration_number
    v.make = make
    v.model = model
    v.last_known_odometer_km = last_known_odometer_km
    v.next_service_due_date = next_service_due_date or date(2099, 1, 1)
    v.next_service_due_odometer_km = next_service_due_odometer_km
    v.status = status
    return v


def _make_async_db():
    """Return an AsyncSession mock."""
    db = AsyncMock()
    return db


def _scalar_result(value):
    r = MagicMock()
    r.scalar_one.return_value = value
    r.scalar_one_or_none.return_value = value
    r.scalars.return_value.all.return_value = []
    return r


# ---------------------------------------------------------------------------
# list_depots
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_depots_returns_paginated_data():
    """list_depots returns correctly paginated DepotListResponse."""
    db = _make_async_db()
    depot1 = _make_depot(UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890"), name="North Depot")
    depot2 = _make_depot(UUID("b2c3d4e5-f6a7-8901-bcde-f12345678901"), name="South Depot")

    # First execute call -> count query
    count_result = MagicMock()
    count_result.scalar_one.return_value = 2
    # Second execute call -> data query
    data_result = MagicMock()
    data_result.scalars.return_value.all.return_value = [depot1, depot2]

    db.execute = AsyncMock(side_effect=[count_result, data_result])

    service = DepotService(db)
    response = await service.list_depots(page=1, page_size=20, search=None)

    assert response.pagination.page == 1
    assert response.pagination.page_size == 20
    assert response.pagination.total_items == 2
    assert response.pagination.total_pages == 1
    assert len(response.data) == 2
    assert response.data[0].name == "North Depot"
    assert response.data[1].name == "South Depot"


# ---------------------------------------------------------------------------
# get_depot
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_depot_returns_depot_when_found():
    """get_depot returns DepotRead for a valid id."""
    db = _make_async_db()
    depot_id = UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
    depot = _make_depot(depot_id)
    db.get = AsyncMock(return_value=depot)

    service = DepotService(db)
    result = await service.get_depot(depot_id)

    assert result.id == depot_id
    assert result.name == "North Depot"


@pytest.mark.asyncio
async def test_get_depot_raises_404_when_not_found():
    """get_depot raises HTTP 404 when depot does not exist."""
    db = _make_async_db()
    db.get = AsyncMock(return_value=None)

    service = DepotService(db)
    with pytest.raises(HTTPException) as exc_info:
        await service.get_depot(uuid4())

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail["code"] == "DEPOT_NOT_FOUND"
    assert exc_info.value.detail["message"] == "Depot not found."


# ---------------------------------------------------------------------------
# create_depot
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_depot_succeeds_when_name_unique():
    """create_depot creates and returns a new depot."""
    db = _make_async_db()
    new_id = UUID("c3d4e5f6-a7b8-9012-cdef-123456789012")
    created_depot = _make_depot(new_id, name="East Depot",
                                 address="789 Logistics Park, Springfield, IL 62703")

    # execute -> no conflict
    no_conflict = MagicMock()
    no_conflict.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=no_conflict)
    db.refresh = AsyncMock(side_effect=lambda obj: setattr(obj, 'id', new_id) or None)

    # After commit+refresh, the db.get-like path just uses the same object
    # We stub add/commit/refresh
    db.add = MagicMock()
    db.commit = AsyncMock()

    # Capture the Depot passed to db.add
    added = []
    def capture_add(obj):
        obj.id = new_id
        obj.created_at = datetime(2024, 4, 1, 10, 0, 0, tzinfo=timezone.utc)
        obj.updated_at = datetime(2024, 4, 1, 10, 0, 0, tzinfo=timezone.utc)
        added.append(obj)
    db.add = MagicMock(side_effect=capture_add)

    async def fake_refresh(obj):
        pass
    db.refresh = fake_refresh

    body = DepotCreate(name="East Depot", address="789 Logistics Park, Springfield, IL 62703")
    service = DepotService(db)
    result = await service.create_depot(body)

    assert result.name == "East Depot"
    assert result.id == new_id


@pytest.mark.asyncio
async def test_create_depot_raises_409_on_name_conflict():
    """create_depot raises HTTP 409 when a depot with the same name exists."""
    db = _make_async_db()
    conflict_depot = _make_depot(name="East Depot")

    conflict_result = MagicMock()
    conflict_result.scalar_one_or_none.return_value = conflict_depot
    db.execute = AsyncMock(return_value=conflict_result)

    body = DepotCreate(name="East Depot", address="789 Logistics Park")
    service = DepotService(db)
    with pytest.raises(HTTPException) as exc_info:
        await service.create_depot(body)

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail["code"] == "DEPOT_NAME_CONFLICT"
    assert exc_info.value.detail["message"] == "A depot with this name already exists."


# ---------------------------------------------------------------------------
# delete_depot
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_depot_raises_409_when_has_vehicles():
    """delete_depot raises HTTP 409 when depot has associated vehicles."""
    db = _make_async_db()
    depot_id = uuid4()
    depot = _make_depot(depot_id)
    db.get = AsyncMock(return_value=depot)

    # vehicle count > 0
    vehicle_count_result = MagicMock()
    vehicle_count_result.scalar_one.return_value = 3
    db.execute = AsyncMock(return_value=vehicle_count_result)

    service = DepotService(db)
    with pytest.raises(HTTPException) as exc_info:
        await service.delete_depot(depot_id)

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail["code"] == "DEPOT_HAS_VEHICLES"
    assert exc_info.value.detail["message"] == "Cannot delete a depot that has associated vehicles."


# ---------------------------------------------------------------------------
# get_depot_dashboard (REQ-1)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_depot_dashboard_categorises_due_and_overdue():
    """Dashboard correctly separates overdue vs due-for-service vehicles."""
    db = _make_async_db()
    depot_id = UUID("f47ac10b-58cc-4afd-a567-0b576ea13e09")
    depot = _make_depot(depot_id)
    db.get = AsyncMock(return_value=depot)

    today = date.today()

    # due vehicle: next_service_due_date in the future, odometer not exceeded
    due_vehicle = _make_vehicle(
        depot_id=depot_id,
        vehicle_id=UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890"),
        registration_number="ABC-1234",
        make="Toyota",
        model="HiAce",
        last_known_odometer_km=48500.0,
        next_service_due_date=date(2099, 8, 15),
        next_service_due_odometer_km=50000.0,
    )

    # overdue vehicle: next_service_due_date in the past
    overdue_vehicle = _make_vehicle(
        depot_id=depot_id,
        vehicle_id=UUID("b2c3d4e5-f6a7-8901-bcde-f12345678901"),
        registration_number="XYZ-5678",
        make="Ford",
        model="Transit",
        last_known_odometer_km=75200.0,
        next_service_due_date=date(2000, 7, 1),  # past date
        next_service_due_odometer_km=70000.0,
    )

    vehicles_result = MagicMock()
    vehicles_result.scalars.return_value.all.return_value = [due_vehicle, overdue_vehicle]
    db.execute = AsyncMock(return_value=vehicles_result)

    service = DepotService(db)
    dashboard = await service.get_depot_dashboard(depot_id)

    assert dashboard.depot_id == depot_id
    assert len(dashboard.due_for_service) == 1
    assert len(dashboard.overdue) == 1
    assert dashboard.due_for_service[0].registration_number == "ABC-1234"
    assert dashboard.overdue[0].registration_number == "XYZ-5678"


@pytest.mark.asyncio
async def test_get_depot_dashboard_overdue_by_odometer():
    """A vehicle with last_known_odometer_km >= next_service_due_odometer_km is overdue."""
    db = _make_async_db()
    depot_id = uuid4()
    depot = _make_depot(depot_id)
    db.get = AsyncMock(return_value=depot)

    # Odometer already exceeded threshold, but date still in future
    odometer_overdue_vehicle = _make_vehicle(
        depot_id=depot_id,
        registration_number="OVR-9999",
        make="Mercedes",
        model="Sprinter",
        last_known_odometer_km=70001.0,
        next_service_due_date=date(2099, 12, 31),  # future date
        next_service_due_odometer_km=70000.0,
    )

    vehicles_result = MagicMock()
    vehicles_result.scalars.return_value.all.return_value = [odometer_overdue_vehicle]
    db.execute = AsyncMock(return_value=vehicles_result)

    service = DepotService(db)
    dashboard = await service.get_depot_dashboard(depot_id)

    assert len(dashboard.overdue) == 1
    assert len(dashboard.due_for_service) == 0
    assert dashboard.overdue[0].registration_number == "OVR-9999"

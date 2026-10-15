"""Unit tests for VehicleRepository — all DB I/O is mocked via AsyncMock."""
import uuid
from datetime import date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.repositories.vehicle_repository import VehicleRepository
from app.models.vehicle import Vehicle


def _make_vehicle(**kwargs) -> Vehicle:
    """Return a minimal Vehicle instance (no DB needed).

    Uses the SQLAlchemy ORM constructor so that the instance state is properly
    initialised (avoids AttributeError when accessing instrumented columns on
    objects created with ``Vehicle.__new__`` without calling ``__init__``).
    """
    defaults: dict = dict(
        depot_id=uuid.uuid4(),
        vehicle_type_id=uuid.uuid4(),
        registration_number="ABC123",
        make="Ford",
        model="Transit",
        in_service_date=date(2020, 1, 1),
        has_telematics=False,
        last_known_odometer_km=None,
        last_odometer_recorded_at=None,
        last_serviced_odometer_km=None,
        last_serviced_at=None,
        next_service_due_date=None,
        next_service_due_odometer_km=None,
        status="active",
    )
    defaults.update(kwargs)
    v = Vehicle(**defaults)
    return v


def _make_session() -> MagicMock:
    """Return a mock AsyncSession."""
    session = MagicMock()
    session.add = MagicMock()
    session.delete = AsyncMock()
    session.flush = AsyncMock()
    session.refresh = AsyncMock()
    session.execute = AsyncMock()
    return session


@pytest.mark.asyncio
async def test_get_all_returns_ordered_vehicles():
    """get_all() executes a select and returns all scalar results."""
    vehicle_a = _make_vehicle(registration_number="AAA001")
    vehicle_b = _make_vehicle(registration_number="ZZZ999")

    session = _make_session()
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = [vehicle_a, vehicle_b]
    result_mock = MagicMock()
    result_mock.scalars.return_value = scalars_mock
    session.execute.return_value = result_mock

    repo = VehicleRepository(session)
    vehicles = await repo.get_all()

    session.execute.assert_awaited_once()
    assert vehicles == [vehicle_a, vehicle_b]


@pytest.mark.asyncio
async def test_create_adds_and_returns_vehicle():
    """create() builds a Vehicle, adds it to the session, flushes and refreshes."""
    depot_id = uuid.uuid4()
    vehicle_type_id = uuid.uuid4()
    new_vehicle = _make_vehicle(
        depot_id=depot_id,
        vehicle_type_id=vehicle_type_id,
        registration_number="NEW001",
        make="Mercedes",
        model="Sprinter",
        in_service_date=date(2023, 6, 1),
        has_telematics=True,
        status="active",
    )

    session = _make_session()
    # refresh populates the vehicle in-place; simulate by side-effect
    async def _refresh(obj):
        obj.id = new_vehicle.id

    session.refresh.side_effect = _refresh

    repo = VehicleRepository(session)
    result = await repo.create(
        depot_id=depot_id,
        vehicle_type_id=vehicle_type_id,
        registration_number="NEW001",
        make="Mercedes",
        model="Sprinter",
        in_service_date=date(2023, 6, 1),
        has_telematics=True,
    )

    session.add.assert_called_once()
    session.flush.assert_awaited_once()
    session.refresh.assert_awaited_once()
    # The object passed to add must be a Vehicle
    added_obj = session.add.call_args[0][0]
    assert isinstance(added_obj, Vehicle)
    assert added_obj.registration_number == "NEW001"
    assert added_obj.status == "active"  # default


@pytest.mark.asyncio
async def test_update_odometer_sets_fields():
    """update_odometer() updates last_known_odometer_km and last_odometer_recorded_at."""
    vehicle = _make_vehicle(registration_number="UPD001")
    session = _make_session()
    session.refresh = AsyncMock()

    repo = VehicleRepository(session)
    recorded_at = datetime(2024, 5, 10, 12, 0, 0)
    new_km = Decimal("75000.5")

    returned = await repo.update_odometer(vehicle, new_km, recorded_at)

    assert vehicle.last_known_odometer_km == new_km
    assert vehicle.last_odometer_recorded_at == recorded_at
    session.add.assert_called_once_with(vehicle)
    session.flush.assert_awaited_once()
    session.refresh.assert_awaited_once_with(vehicle)


@pytest.mark.asyncio
async def test_get_by_id_returns_none_when_missing():
    """get_by_id() returns None when the vehicle does not exist."""
    session = _make_session()
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None
    session.execute.return_value = result_mock

    repo = VehicleRepository(session)
    result = await repo.get_by_id(uuid.uuid4())

    session.execute.assert_awaited_once()
    assert result is None

import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

from app.repositories.vehicle_type_repository import VehicleTypeRepository
from app.models.vehicle_type import VehicleType


def make_vehicle_type(name="Test Type", vehicle_class="heavy_truck"):
    vt = MagicMock(spec=VehicleType)
    vt.id = uuid.uuid4()
    vt.name = name
    vt.vehicle_class = vehicle_class
    return vt


def make_session():
    session = AsyncMock()
    session.add = MagicMock()
    return session


def make_scalars_result(items):
    scalars = MagicMock()
    scalars.all.return_value = items
    result = MagicMock()
    result.scalars.return_value = scalars
    return result


def make_scalar_one_or_none_result(item):
    result = MagicMock()
    result.scalar_one_or_none.return_value = item
    return result


def make_scalar_one_result(value):
    result = MagicMock()
    result.scalar_one.return_value = value
    return result


@pytest.mark.asyncio
async def test_get_all_returns_all_vehicle_types_ordered():
    session = make_session()
    vt1 = make_vehicle_type(name="Alpha", vehicle_class="heavy_truck")
    vt2 = make_vehicle_type(name="Beta", vehicle_class="light_commercial")
    session.execute = AsyncMock(return_value=make_scalars_result([vt1, vt2]))

    repo = VehicleTypeRepository(session)
    result = await repo.get_all()

    assert len(result) == 2
    assert result[0] is vt1
    assert result[1] is vt2
    session.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_adds_and_returns_vehicle_type():
    session = make_session()
    new_vt = make_vehicle_type(name="Heavy Hauler", vehicle_class="heavy_truck")

    async def fake_flush():
        pass

    async def fake_refresh(obj):
        obj.name = "Heavy Hauler"
        obj.vehicle_class = "heavy_truck"

    session.flush = AsyncMock(side_effect=fake_flush)
    session.refresh = AsyncMock(side_effect=fake_refresh)

    with patch("app.repositories.vehicle_type_repository.VehicleType", return_value=new_vt):
        repo = VehicleTypeRepository(session)
        result = await repo.create(name="Heavy Hauler", vehicle_class="heavy_truck")

    session.add.assert_called_once_with(new_vt)
    session.flush.assert_awaited_once()
    session.refresh.assert_awaited_once_with(new_vt)
    assert result is new_vt


@pytest.mark.asyncio
async def test_get_by_class_filters_by_vehicle_class():
    session = make_session()
    vt = make_vehicle_type(name="Light Van", vehicle_class="light_commercial")
    session.execute = AsyncMock(return_value=make_scalars_result([vt]))

    repo = VehicleTypeRepository(session)
    result = await repo.get_by_class("light_commercial")

    assert len(result) == 1
    assert result[0].vehicle_class == "light_commercial"
    session.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_by_id_returns_none_when_not_found():
    session = make_session()
    session.execute = AsyncMock(return_value=make_scalar_one_or_none_result(None))

    repo = VehicleTypeRepository(session)
    result = await repo.get_by_id(uuid.uuid4())

    assert result is None
    session.execute.assert_awaited_once()

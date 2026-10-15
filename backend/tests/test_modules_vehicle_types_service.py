import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID, uuid4
from datetime import datetime
from fastapi import HTTPException

from app.modules.vehicle_types.service import VehicleTypeService
from app.modules.vehicle_types.schemas import (
    VehicleTypeCreate,
    VehicleTypeUpdate,
    VehicleTypeRead,
    VehicleTypeListResponse,
)


def make_vehicle_type_obj(
    id=None,
    name="Standard City Bus",
    vehicle_class="heavy_truck",
    created_at=None,
    updated_at=None,
):
    obj = MagicMock()
    obj.id = id or uuid4()
    obj.name = name
    obj.vehicle_class = vehicle_class
    obj.created_at = created_at or datetime(2023, 1, 15, 8, 0, 0)
    obj.updated_at = updated_at or datetime(2023, 6, 10, 14, 30, 0)
    return obj


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture
def mock_repo():
    repo = AsyncMock()
    return repo


@pytest.fixture
def service_with_mock_repo(mock_db, mock_repo):
    with patch(
        "app.modules.vehicle_types.service.VehicleTypeRepository",
        return_value=mock_repo,
    ):
        svc = VehicleTypeService(mock_db)
    return svc, mock_repo


@pytest.mark.asyncio
async def test_list_vehicle_types_returns_paginated_response(service_with_mock_repo):
    svc, repo = service_with_mock_repo
    vt1 = make_vehicle_type_obj(id=UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890"), name="Standard City Bus", vehicle_class="heavy_truck")
    vt2 = make_vehicle_type_obj(id=UUID("b2c3d4e5-f6a7-8901-bcde-f12345678901"), name="Midi Coach", vehicle_class="light_commercial")
    repo.list_vehicle_types.return_value = ([vt1, vt2], 2)

    result = await svc.list_vehicle_types(page=1, page_size=20)

    assert isinstance(result, VehicleTypeListResponse)
    assert result.pagination.page == 1
    assert result.pagination.page_size == 20
    assert result.pagination.total_items == 2
    assert result.pagination.total_pages == 1
    assert len(result.data) == 2
    assert result.data[0].name == "Standard City Bus"
    assert result.data[1].name == "Midi Coach"


@pytest.mark.asyncio
async def test_create_vehicle_type_success(service_with_mock_repo):
    svc, repo = service_with_mock_repo
    created_id = UUID("c3d4e5f6-a7b8-9012-cdef-123456789012")
    repo.get_by_name.return_value = None
    created_obj = make_vehicle_type_obj(id=created_id, name="Articulated Bus", vehicle_class="heavy_truck")
    repo.create_vehicle_type.return_value = created_obj

    body = VehicleTypeCreate(name="Articulated Bus", vehicle_class="heavy_truck")
    result = await svc.create_vehicle_type(body)

    assert isinstance(result, VehicleTypeRead)
    assert result.name == "Articulated Bus"
    assert result.vehicle_class == "heavy_truck"
    repo.get_by_name.assert_called_once_with("Articulated Bus")
    repo.create_vehicle_type.assert_called_once_with(name="Articulated Bus", vehicle_class="heavy_truck")


@pytest.mark.asyncio
async def test_create_vehicle_type_conflict_raises_409(service_with_mock_repo):
    svc, repo = service_with_mock_repo
    existing = make_vehicle_type_obj(name="Articulated Bus")
    repo.get_by_name.return_value = existing

    body = VehicleTypeCreate(name="Articulated Bus", vehicle_class="heavy_truck")
    with pytest.raises(HTTPException) as exc_info:
        await svc.create_vehicle_type(body)

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail["code"] == "VEHICLE_TYPE_NAME_CONFLICT"
    assert exc_info.value.detail["message"] == "A vehicle type with this name already exists."


@pytest.mark.asyncio
async def test_get_vehicle_type_success(service_with_mock_repo):
    svc, repo = service_with_mock_repo
    vt_id = UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
    vt = make_vehicle_type_obj(id=vt_id, name="Standard City Bus", vehicle_class="heavy_truck")
    repo.get_by_id.return_value = vt

    result = await svc.get_vehicle_type(vt_id)

    assert isinstance(result, VehicleTypeRead)
    assert result.id == vt_id
    assert result.name == "Standard City Bus"
    assert result.vehicle_class == "heavy_truck"


@pytest.mark.asyncio
async def test_get_vehicle_type_not_found_raises_404(service_with_mock_repo):
    svc, repo = service_with_mock_repo
    repo.get_by_id.return_value = None

    with pytest.raises(HTTPException) as exc_info:
        await svc.get_vehicle_type(uuid4())

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail["code"] == "VEHICLE_TYPE_NOT_FOUND"
    assert exc_info.value.detail["message"] == "Vehicle type not found."


@pytest.mark.asyncio
async def test_update_vehicle_type_success(service_with_mock_repo):
    svc, repo = service_with_mock_repo
    vt_id = UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
    existing = make_vehicle_type_obj(id=vt_id, name="Standard City Bus", vehicle_class="heavy_truck")
    updated_obj = make_vehicle_type_obj(id=vt_id, name="Standard City Bus (Revised)", vehicle_class="heavy_truck")
    repo.get_by_id.return_value = existing
    repo.get_by_name.return_value = None
    repo.update_vehicle_type.return_value = updated_obj

    body = VehicleTypeUpdate(name="Standard City Bus (Revised)", vehicle_class="heavy_truck")
    result = await svc.update_vehicle_type(vt_id, body)

    assert isinstance(result, VehicleTypeRead)
    assert result.name == "Standard City Bus (Revised)"
    repo.update_vehicle_type.assert_called_once()


@pytest.mark.asyncio
async def test_update_vehicle_type_not_found_raises_404(service_with_mock_repo):
    svc, repo = service_with_mock_repo
    repo.get_by_id.return_value = None

    body = VehicleTypeUpdate(name="New Name")
    with pytest.raises(HTTPException) as exc_info:
        await svc.update_vehicle_type(uuid4(), body)

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail["code"] == "VEHICLE_TYPE_NOT_FOUND"
    assert exc_info.value.detail["message"] == "Vehicle type not found."


@pytest.mark.asyncio
async def test_delete_vehicle_type_in_use_raises_409(service_with_mock_repo):
    svc, repo = service_with_mock_repo
    vt_id = uuid4()
    existing = make_vehicle_type_obj(id=vt_id)
    repo.get_by_id.return_value = existing
    repo.delete_vehicle_type.side_effect = Exception("foreign key violation")

    with pytest.raises(HTTPException) as exc_info:
        await svc.delete_vehicle_type(vt_id)

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail["code"] == "VEHICLE_TYPE_IN_USE"
    assert exc_info.value.detail["message"] == "Vehicle type cannot be deleted because it is in use."

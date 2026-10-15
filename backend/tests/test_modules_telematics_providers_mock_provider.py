"""Unit tests for MockOdometerProvider."""
import pytest
from datetime import datetime, timezone

from app.modules.telematics.providers.mock_provider import MockOdometerProvider
from app.modules.telematics.providers import OdometerReading, OdometerProvider


@pytest.mark.asyncio
async def test_fetch_readings_returns_one_per_vehicle():
    """fetch_readings returns exactly one OdometerReading per vehicle_id supplied."""
    provider = MockOdometerProvider()
    vehicle_ids = ["ABC-001", "XYZ-999", "DEF-555"]
    readings = await provider.fetch_readings(vehicle_ids)
    assert len(readings) == 3
    returned_ids = {r.vehicle_id for r in readings}
    assert returned_ids == set(vehicle_ids)


@pytest.mark.asyncio
async def test_fetch_readings_returns_odometer_reading_instances():
    """Every item returned is an OdometerReading dataclass instance."""
    provider = MockOdometerProvider()
    readings = await provider.fetch_readings(["VH-001"])
    assert len(readings) == 1
    reading = readings[0]
    assert isinstance(reading, OdometerReading)
    assert isinstance(reading.vehicle_id, str)
    assert isinstance(reading.odometer_km, int)
    assert isinstance(reading.reading_timestamp, datetime)
    assert isinstance(reading.raw_payload, dict)


@pytest.mark.asyncio
async def test_fetch_readings_is_deterministic():
    """Same vehicle_id always yields identical odometer_km and timestamp."""
    provider = MockOdometerProvider()
    vehicle_id = "STABLE-ID-42"
    readings_first = await provider.fetch_readings([vehicle_id])
    readings_second = await provider.fetch_readings([vehicle_id])
    assert readings_first[0].odometer_km == readings_second[0].odometer_km
    assert readings_first[0].reading_timestamp == readings_second[0].reading_timestamp


@pytest.mark.asyncio
async def test_fetch_readings_timestamp_is_utc_and_fixed():
    """reading_timestamp must be timezone-aware UTC and match the fixed reference."""
    provider = MockOdometerProvider()
    readings = await provider.fetch_readings(["ANY-VEHICLE"])
    ts = readings[0].reading_timestamp
    assert ts.tzinfo is not None
    assert ts.utcoffset().total_seconds() == 0
    # Fixed reference timestamp defined in the module
    assert ts == datetime(2024, 1, 15, 8, 0, 0, tzinfo=timezone.utc)


@pytest.mark.asyncio
async def test_fetch_readings_raw_payload_contains_expected_fields():
    """raw_payload dict must contain vehicle_id, odometer_km, source, and timestamp."""
    provider = MockOdometerProvider()
    vehicle_id = "PAYLOAD-CHECK"
    readings = await provider.fetch_readings([vehicle_id])
    payload = readings[0].raw_payload
    assert payload["vehicle_id"] == vehicle_id
    assert payload["odometer_km"] == readings[0].odometer_km
    assert payload["source"] == "telematics_mock"
    assert "timestamp" in payload


@pytest.mark.asyncio
async def test_fetch_readings_empty_list_returns_empty():
    """Passing an empty vehicle_ids list returns an empty list without error."""
    provider = MockOdometerProvider()
    readings = await provider.fetch_readings([])
    assert readings == []

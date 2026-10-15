import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useVehicleDetail } from './useVehicleDetail';
import type { UseVehicleDetailResult } from './useVehicleDetail';

// Mock the vehiclesService module
vi.mock('../services/vehiclesService', () => ({
  getVehicle: vi.fn(),
  listVehicles: vi.fn(),
  listVehicleReadings: vi.fn(),
  listVehicleWorkOrders: vi.fn(),
}));

// Mock the errorUtils module
vi.mock('../utils/errorUtils', () => ({
  parseApiError: vi.fn((err: unknown) => ({
    code: 'UNKNOWN_ERROR',
    message: err instanceof Error ? err.message : 'Unknown error',
  })),
}));

import { getVehicle } from '../services/vehiclesService';

const mockGetVehicle = vi.mocked(getVehicle);

const mockVehicle = {
  id: 'vehicle-1',
  depot_id: 'depot-1',
  vehicle_type_id: 'vt-1',
  registration_number: 'ABC-123',
  make: 'Toyota',
  model: 'Hilux',
  in_service_date: '2022-01-01',
  has_telematics: false,
  last_known_odometer_km: 50000,
  last_odometer_recorded_at: '2024-01-01T00:00:00Z',
  last_serviced_odometer_km: 45000,
  last_serviced_at: '2023-12-01T00:00:00Z',
  next_service_due_date: '2024-06-01',
  next_service_due_odometer_km: 55000,
  status: 'active' as const,
  created_at: '2022-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useVehicleDetail', () => {
  it('fetches and returns vehicle data when vehicleId is provided', async () => {
    mockGetVehicle.mockResolvedValueOnce(mockVehicle);

    const { result } = renderHook(() => useVehicleDetail('vehicle-1'));

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.vehicle).toBeNull();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.vehicle).toEqual(mockVehicle);
    expect(result.current.error).toBeNull();
    expect(mockGetVehicle).toHaveBeenCalledWith('vehicle-1');
  });

  it('does not fetch and returns null vehicle when vehicleId is null', async () => {
    const { result } = renderHook(() => useVehicleDetail(null));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.vehicle).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockGetVehicle).not.toHaveBeenCalled();
  });

  it('does not fetch and returns null vehicle when vehicleId is undefined', async () => {
    const { result } = renderHook(() => useVehicleDetail(undefined));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.vehicle).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockGetVehicle).not.toHaveBeenCalled();
  });

  it('sets error and clears vehicle when the API call fails', async () => {
    mockGetVehicle.mockRejectedValueOnce(new Error('Not found'));

    const { result } = renderHook(() => useVehicleDetail('vehicle-999'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.vehicle).toBeNull();
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('Not found');
  });

  it('exposes a refresh function that re-fetches the vehicle', async () => {
    mockGetVehicle.mockResolvedValue(mockVehicle);

    const { result } = renderHook(() => useVehicleDetail('vehicle-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetVehicle).toHaveBeenCalledTimes(1);

    await result.current.refresh();

    expect(mockGetVehicle).toHaveBeenCalledTimes(2);
    expect(result.current.vehicle).toEqual(mockVehicle);
  });

  it('clears previous vehicle and error when vehicleId changes to null', async () => {
    mockGetVehicle.mockResolvedValueOnce(mockVehicle);

    const { result, rerender } = renderHook<UseVehicleDetailResult, { id: string | null }>(
      ({ id }) => useVehicleDetail(id),
      { initialProps: { id: 'vehicle-1' } }
    );

    await waitFor(() => {
      expect(result.current.vehicle).toEqual(mockVehicle);
    });

    rerender({ id: null });

    await waitFor(() => {
      expect(result.current.vehicle).toBeNull();
    });

    expect(result.current.error).toBeNull();
  });
});

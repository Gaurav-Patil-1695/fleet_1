import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useVehicles } from './useVehicles';

// Mock the vehiclesService module
vi.mock('../services/vehiclesService', () => ({
  listVehicles: vi.fn(),
}));

// Mock errorUtils
vi.mock('../utils/errorUtils', () => ({
  parseApiError: vi.fn((err: unknown) => ({
    message: err instanceof Error ? err.message : 'Unknown error',
    code: 'UNKNOWN',
  })),
}));

import { listVehicles } from '../services/vehiclesService';

const mockListVehicles = listVehicles as ReturnType<typeof vi.fn>;

const makePagination = (total = 2) => ({
  page: 1,
  page_size: 20,
  total,
  total_pages: 1,
});

const makeVehicle = (id: string) => ({
  id,
  depot_id: 'depot-1',
  vehicle_type_id: 'vt-1',
  registration_number: `REG-${id}`,
  make: 'Toyota',
  model: 'Hilux',
  in_service_date: '2022-01-01',
  has_telematics: false,
  last_known_odometer_km: null,
  last_odometer_recorded_at: null,
  last_serviced_odometer_km: null,
  last_serviced_at: null,
  next_service_due_date: null,
  next_service_due_odometer_km: null,
  status: 'active',
  created_at: '2022-01-01T00:00:00Z',
  updated_at: '2022-01-01T00:00:00Z',
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useVehicles', () => {
  it('fetches vehicles on mount and returns data with pagination', async () => {
    const vehicles = [makeVehicle('v-1'), makeVehicle('v-2')];
    const pagination = makePagination(2);
    mockListVehicles.mockResolvedValueOnce({ data: vehicles, pagination });

    const { result } = renderHook(() => useVehicles());

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.vehicles).toEqual(vehicles);
    expect(result.current.pagination).toEqual(pagination);
    expect(result.current.error).toBeNull();
  });

  it('passes params to listVehicles correctly', async () => {
    const vehicles = [makeVehicle('v-1')];
    const pagination = makePagination(1);
    mockListVehicles.mockResolvedValueOnce({ data: vehicles, pagination });

    const params = { depot_id: 'depot-1', status: 'active' as const, page: 2, page_size: 10 };
    const { result } = renderHook(() => useVehicles(params));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockListVehicles).toHaveBeenCalledWith({
      depot_id: 'depot-1',
      vehicle_type_id: undefined,
      status: 'active',
      has_telematics: undefined,
      page: 2,
      page_size: 10,
    });
    expect(result.current.vehicles).toEqual(vehicles);
  });

  it('sets error state and clears vehicles on fetch failure', async () => {
    mockListVehicles.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useVehicles());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.vehicles).toEqual([]);
    expect(result.current.pagination).toBeNull();
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('Network error');
  });

  it('refresh/refetch triggers a new API call', async () => {
    const vehicles = [makeVehicle('v-1')];
    const pagination = makePagination(1);
    mockListVehicles
      .mockResolvedValueOnce({ data: vehicles, pagination })
      .mockResolvedValueOnce({ data: [makeVehicle('v-2')], pagination: makePagination(1) });

    const { result } = renderHook(() => useVehicles());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.vehicles[0].id).toBe('v-1');

    // Both refresh and refetch should work
    await result.current.refresh();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockListVehicles).toHaveBeenCalledTimes(2);
    expect(result.current.vehicles[0].id).toBe('v-2');
  });

  it('returns empty vehicles array and null pagination initially before fetch resolves', async () => {
    // Make the promise never resolve during this check
    let resolve: (v: unknown) => void;
    const pending = new Promise((res) => { resolve = res; });
    mockListVehicles.mockReturnValueOnce(pending);

    const { result } = renderHook(() => useVehicles());

    // Before resolution
    expect(result.current.vehicles).toEqual([]);
    expect(result.current.pagination).toBeNull();
    expect(result.current.isLoading).toBe(true);

    // Cleanup
    resolve!({ data: [], pagination: makePagination(0) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('re-fetches when params change', async () => {
    const pagination = makePagination(1);
    mockListVehicles
      .mockResolvedValueOnce({ data: [makeVehicle('v-1')], pagination })
      .mockResolvedValueOnce({ data: [makeVehicle('v-2')], pagination });

    let depotId = 'depot-A';
    const { result, rerender } = renderHook(() => useVehicles({ depot_id: depotId }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.vehicles[0].id).toBe('v-1');

    depotId = 'depot-B';
    rerender();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListVehicles).toHaveBeenCalledTimes(2);
    expect(mockListVehicles).toHaveBeenLastCalledWith(expect.objectContaining({ depot_id: 'depot-B' }));
    expect(result.current.vehicles[0].id).toBe('v-2');
  });
});

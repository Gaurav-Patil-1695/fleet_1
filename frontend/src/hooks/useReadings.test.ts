import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock the services
vi.mock('../services/readingsService', () => ({
  listReadings: vi.fn(),
}));

vi.mock('../services/vehiclesService', () => ({
  listVehicleReadings: vi.fn(),
}));

vi.mock('../utils/errorUtils', () => ({
  parseApiError: vi.fn((err: unknown) => ({
    code: 'UNKNOWN',
    message: err instanceof Error ? err.message : 'An error occurred',
  })),
}));

import { listReadings } from '../services/readingsService';
import { listVehicleReadings } from '../services/vehiclesService';
import { useReadings, useVehicleReadings } from './useReadings';

const mockListReadings = vi.mocked(listReadings);
const mockListVehicleReadings = vi.mocked(listVehicleReadings);

const mockReading = {
  id: 'r-1',
  vehicle_id: 'v-1',
  recorded_by_user_id: 'u-1',
  odometer_km: 12000,
  source: 'manual' as const,
  is_test_mode: false,
  raw_payload: undefined,
  reading_timestamp: '2024-01-01T10:00:00Z',
  created_at: '2024-01-01T10:00:00Z',
};

const mockPagination = {
  total: 1,
  page: 1,
  page_size: 20,
  total_pages: 1,
  total_items: 1,
};

const mockReadingListResponse = {
  data: [mockReading],
  pagination: mockPagination,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useReadings', () => {
  it('fetches and returns readings on mount', async () => {
    mockListReadings.mockResolvedValueOnce(mockReadingListResponse);

    const { result } = renderHook(() => useReadings());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.readings).toEqual([mockReading]);
    expect(result.current.pagination).toEqual(mockPagination);
    expect(result.current.error).toBeNull();
    expect(mockListReadings).toHaveBeenCalledWith({
      vehicle_id: undefined,
      source: undefined,
      is_test_mode: undefined,
      from: undefined,
      to: undefined,
      page: undefined,
      page_size: undefined,
    });
  });

  it('passes params to listReadings', async () => {
    mockListReadings.mockResolvedValueOnce(mockReadingListResponse);

    const { result } = renderHook(() =>
      useReadings({ vehicle_id: 'v-1', source: 'manual', page: 2, page_size: 10 })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockListReadings).toHaveBeenCalledWith({
      vehicle_id: 'v-1',
      source: 'manual',
      is_test_mode: undefined,
      from: undefined,
      to: undefined,
      page: 2,
      page_size: 10,
    });
  });

  it('sets error state and empties readings when listReadings fails', async () => {
    mockListReadings.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useReadings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.readings).toEqual([]);
    expect(result.current.pagination).toBeNull();
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('Network error');
  });

  it('exposes a refresh function that re-fetches readings', async () => {
    const secondResponse = {
      data: [{ ...mockReading, odometer_km: 15000 }],
      pagination: mockPagination,
    };
    mockListReadings
      .mockResolvedValueOnce(mockReadingListResponse)
      .mockResolvedValueOnce(secondResponse);

    const { result } = renderHook(() => useReadings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.readings[0].odometer_km).toBe(12000);

    await result.current.refresh();

    await waitFor(() => {
      expect(result.current.readings[0].odometer_km).toBe(15000);
    });
    expect(mockListReadings).toHaveBeenCalledTimes(2);
  });
});

describe('useVehicleReadings', () => {
  it('fetches vehicle readings when vehicleId is provided', async () => {
    mockListVehicleReadings.mockResolvedValueOnce(mockReadingListResponse);

    const { result } = renderHook(() =>
      useVehicleReadings({ vehicleId: 'v-1' })
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.readings).toEqual([mockReading]);
    expect(result.current.pagination).toEqual(mockPagination);
    expect(result.current.error).toBeNull();
    expect(mockListVehicleReadings).toHaveBeenCalledWith('v-1', {
      page: undefined,
      page_size: undefined,
    });
  });

  it('returns empty readings and no error when vehicleId is null', async () => {
    const { result } = renderHook(() =>
      useVehicleReadings({ vehicleId: null })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.readings).toEqual([]);
    expect(result.current.pagination).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockListVehicleReadings).not.toHaveBeenCalled();
  });
});

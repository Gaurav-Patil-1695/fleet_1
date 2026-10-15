import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDepotDashboard } from './useDepotDashboard';

// Mock the depotsService module
vi.mock('../services/depotsService', () => ({
  getDepotDashboard: vi.fn(),
}));

// Mock errorUtils
vi.mock('../utils/errorUtils', () => ({
  parseApiError: vi.fn((err: unknown) => ({
    code: 'UNKNOWN',
    message: err instanceof Error ? err.message : 'Unknown error',
  })),
}));

import { getDepotDashboard } from '../services/depotsService';

const mockGetDepotDashboard = vi.mocked(getDepotDashboard);

const mockDashboard = {
  depot_id: 'depot-1',
  depot_name: 'Main Depot',
  total_vehicles: 10,
  vehicles_due: 3,
  vehicles_overdue: 1,
  due_vehicles: [],
  overdue_vehicles: [],
};

describe('useDepotDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and returns dashboard data when depotId is provided', async () => {
    mockGetDepotDashboard.mockResolvedValueOnce(mockDashboard as any);

    const { result } = renderHook(() => useDepotDashboard('depot-1'));

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.dashboard).toBeNull();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.dashboard).toEqual(mockDashboard);
    expect(result.current.error).toBeNull();
    expect(mockGetDepotDashboard).toHaveBeenCalledWith('depot-1');
  });

  it('returns null dashboard and no error when depotId is null', async () => {
    const { result } = renderHook(() => useDepotDashboard(null));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.dashboard).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockGetDepotDashboard).not.toHaveBeenCalled();
  });

  it('returns null dashboard and no error when depotId is undefined', async () => {
    const { result } = renderHook(() => useDepotDashboard(undefined));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.dashboard).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockGetDepotDashboard).not.toHaveBeenCalled();
  });

  it('sets error and clears dashboard when fetch fails', async () => {
    const apiError = new Error('Network error');
    mockGetDepotDashboard.mockRejectedValueOnce(apiError);

    const { result } = renderHook(() => useDepotDashboard('depot-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.dashboard).toBeNull();
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('Network error');
  });

  it('exposes refresh and refetch as the same fetch function', async () => {
    mockGetDepotDashboard.mockResolvedValue(mockDashboard as any);

    const { result } = renderHook(() => useDepotDashboard('depot-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Both should be callable and trigger a new fetch
    mockGetDepotDashboard.mockClear();
    mockGetDepotDashboard.mockResolvedValueOnce(mockDashboard as any);
    await result.current.refresh();
    expect(mockGetDepotDashboard).toHaveBeenCalledTimes(1);

    mockGetDepotDashboard.mockResolvedValueOnce(mockDashboard as any);
    await result.current.refetch();
    expect(mockGetDepotDashboard).toHaveBeenCalledTimes(2);
  });

  it('re-fetches when depotId changes', async () => {
    mockGetDepotDashboard.mockResolvedValue(mockDashboard as any);

    const { result, rerender } = renderHook(
      ({ depotId }: { depotId: string | null }) => useDepotDashboard(depotId),
      { initialProps: { depotId: 'depot-1' } }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetDepotDashboard).toHaveBeenCalledWith('depot-1');

    const updatedDashboard = { ...mockDashboard, depot_id: 'depot-2', depot_name: 'Second Depot' };
    mockGetDepotDashboard.mockResolvedValueOnce(updatedDashboard as any);

    rerender({ depotId: 'depot-2' });

    await waitFor(() => {
      expect(mockGetDepotDashboard).toHaveBeenCalledWith('depot-2');
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.dashboard).toEqual(updatedDashboard);
  });
});

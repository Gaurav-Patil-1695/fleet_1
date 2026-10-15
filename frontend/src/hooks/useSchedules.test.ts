import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSchedules } from './useSchedules';

vi.mock('../services/schedulesService', () => ({
  listSchedules: vi.fn(),
}));

vi.mock('../utils/errorUtils', () => ({
  parseApiError: vi.fn((err: unknown) => ({
    code: 'UNKNOWN',
    message: err instanceof Error ? err.message : 'Unknown error',
  })),
}));

import { listSchedules } from '../services/schedulesService';

const mockListSchedules = listSchedules as ReturnType<typeof vi.fn>;

const mockSchedule = {
  id: 'sched-1',
  vehicle_type_id: 'vt-1',
  vehicle_class: 'heavy_truck',
  km_interval: 10000,
  month_interval: 6,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockPagination = { page: 1, page_size: 20, total: 1, total_pages: 1 };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useSchedules', () => {
  it('fetches and returns schedules on mount', async () => {
    mockListSchedules.mockResolvedValueOnce({
      data: [mockSchedule],
      pagination: mockPagination,
    });

    const { result } = renderHook(() => useSchedules());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.schedules).toEqual([mockSchedule]);
    expect(result.current.pagination).toEqual(mockPagination);
    expect(result.current.error).toBeNull();
  });

  it('passes params to listSchedules correctly', async () => {
    mockListSchedules.mockResolvedValueOnce({ data: [], pagination: mockPagination });

    const params = {
      vehicle_type_id: 'vt-2',
      vehicle_class: 'light_commercial' as const,
      is_active: true,
      page: 2,
      limit: 10,
    };

    const { result } = renderHook(() => useSchedules(params));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockListSchedules).toHaveBeenCalledWith({
      vehicle_type_id: 'vt-2',
      vehicle_class: 'light_commercial',
      is_active: true,
      page: 2,
      limit: 10,
    });
  });

  it('sets error and clears schedules when fetch fails', async () => {
    mockListSchedules.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useSchedules());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.schedules).toEqual([]);
    expect(result.current.pagination).toBeNull();
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('Network error');
  });

  it('refresh/refetch re-invokes listSchedules', async () => {
    mockListSchedules
      .mockResolvedValueOnce({ data: [mockSchedule], pagination: mockPagination })
      .mockResolvedValueOnce({ data: [], pagination: { ...mockPagination, total: 0 } });

    const { result } = renderHook(() => useSchedules());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.schedules).toHaveLength(1);

    await result.current.refresh();

    expect(mockListSchedules).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(result.current.schedules).toHaveLength(0));
  });

  it('refetch is the same function as refresh', async () => {
    mockListSchedules.mockResolvedValue({ data: [], pagination: mockPagination });

    const { result } = renderHook(() => useSchedules());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.refresh).toBe(result.current.refetch);
  });

  it('starts with empty schedules and null pagination before fetch completes', () => {
    // Make listSchedules never resolve during this check
    mockListSchedules.mockReturnValueOnce(new Promise(() => {}));

    const { result } = renderHook(() => useSchedules());

    expect(result.current.schedules).toEqual([]);
    expect(result.current.pagination).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });
});

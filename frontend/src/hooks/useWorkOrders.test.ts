import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWorkOrders } from './useWorkOrders';

// Mock the workOrdersService
vi.mock('../services/workOrdersService', () => ({
  listWorkOrders: vi.fn(),
}));

// Mock errorUtils
vi.mock('../utils/errorUtils', () => ({
  parseApiError: vi.fn((err: unknown) => ({
    code: 'UNKNOWN',
    message: err instanceof Error ? err.message : 'Unknown error',
  })),
}));

import { listWorkOrders } from '../services/workOrdersService';

const mockListWorkOrders = listWorkOrders as ReturnType<typeof vi.fn>;

const makeWorkOrder = (id: string) => ({
  id,
  vehicle_id: 'v1',
  depot_id: 'd1',
  assigned_technician_id: null,
  raised_by_user_id: 'u1',
  closed_by_user_id: null,
  status: 'open' as const,
  description: 'Test work order',
  completion_notes: null,
  post_service_odometer_km: null,
  post_service_reading_id: null,
  raised_at: '2024-01-01T00:00:00Z',
  closed_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
});

const mockPagination = { page: 1, page_size: 20, total: 2, total_pages: 1 };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useWorkOrders', () => {
  it('fetches and returns work orders on mount', async () => {
    const workOrders = [makeWorkOrder('wo1'), makeWorkOrder('wo2')];
    mockListWorkOrders.mockResolvedValueOnce({
      data: workOrders,
      pagination: mockPagination,
    });

    const { result } = renderHook(() => useWorkOrders());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.workOrders).toHaveLength(2);
    expect(result.current.workOrders[0].id).toBe('wo1');
    expect(result.current.pagination).toEqual(mockPagination);
    expect(result.current.error).toBeNull();
  });

  it('passes params (status, depot_id, page, page_size) to listWorkOrders', async () => {
    const workOrders = [makeWorkOrder('wo3')];
    mockListWorkOrders.mockResolvedValueOnce({
      data: workOrders,
      pagination: { page: 2, page_size: 10, total: 11, total_pages: 2 },
    });

    const { result } = renderHook(() =>
      useWorkOrders({ status: 'open', depot_id: 'd1', page: 2, page_size: 10 })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockListWorkOrders).toHaveBeenCalledWith({
      status: 'open',
      depot_id: 'd1',
      page: 2,
      page_size: 10,
    });
    expect(result.current.workOrders[0].id).toBe('wo3');
  });

  it('sets isLoading true while fetching then false when done', async () => {
    let resolvePromise!: (value: unknown) => void;
    const promise = new Promise((res) => { resolvePromise = res; });
    mockListWorkOrders.mockReturnValueOnce(promise);

    const { result } = renderHook(() => useWorkOrders());

    expect(result.current.isLoading).toBe(true);

    resolvePromise({ data: [], pagination: { page: 1, page_size: 20, total: 0, total_pages: 0 } });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('sets error and resets workOrders/pagination on fetch failure', async () => {
    mockListWorkOrders.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useWorkOrders());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.workOrders).toEqual([]);
    expect(result.current.pagination).toBeNull();
  });

  it('refresh/refetch triggers a new fetch call', async () => {
    mockListWorkOrders
      .mockResolvedValueOnce({ data: [makeWorkOrder('wo1')], pagination: mockPagination })
      .mockResolvedValueOnce({ data: [makeWorkOrder('wo1'), makeWorkOrder('wo2')], pagination: mockPagination });

    const { result } = renderHook(() => useWorkOrders());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.workOrders).toHaveLength(1);

    await result.current.refresh();

    await waitFor(() => expect(result.current.workOrders).toHaveLength(2));
    expect(mockListWorkOrders).toHaveBeenCalledTimes(2);
  });

  it('refetch is the same function reference as refresh', async () => {
    mockListWorkOrders.mockResolvedValue({ data: [], pagination: mockPagination });

    const { result } = renderHook(() => useWorkOrders());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.refresh).toBe(result.current.refetch);
  });
});

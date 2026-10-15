import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMyWorkOrders } from './useMyWorkOrders';

// Mock the workOrdersService module
vi.mock('../services/workOrdersService', () => ({
  listMyWorkOrders: vi.fn(),
}));

// Mock errorUtils
vi.mock('../utils/errorUtils', () => ({
  parseApiError: vi.fn((err: unknown) => ({
    code: 'UNKNOWN_ERROR',
    message: err instanceof Error ? err.message : 'An error occurred',
    details: null,
  })),
}));

import { listMyWorkOrders } from '../services/workOrdersService';

const mockListMyWorkOrders = vi.mocked(listMyWorkOrders);

const makeWorkOrder = (id: string) => ({
  id,
  vehicle_id: 'v1',
  depot_id: 'd1',
  assigned_technician_id: 'u1',
  raised_by_user_id: 'u2',
  closed_by_user_id: undefined,
  status: 'open' as const,
  description: 'Test work order',
  completion_notes: undefined,
  post_service_odometer_km: undefined,
  post_service_reading_id: undefined,
  raised_at: '2024-01-01T00:00:00Z',
  closed_at: undefined,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
});

const mockPagination = { page: 1, page_size: 20, total: 2, total_pages: 1, total_items: 2 };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useMyWorkOrders', () => {
  it('fetches and returns my work orders on mount', async () => {
    const workOrders = [makeWorkOrder('wo1'), makeWorkOrder('wo2')];
    mockListMyWorkOrders.mockResolvedValueOnce({
      data: workOrders,
      pagination: mockPagination,
    });

    const { result } = renderHook(() => useMyWorkOrders());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.workOrders).toEqual(workOrders);
    expect(result.current.pagination).toEqual(mockPagination);
    expect(result.current.error).toBeNull();
    expect(mockListMyWorkOrders).toHaveBeenCalledTimes(1);
  });

  it('passes status and pagination params to listMyWorkOrders', async () => {
    mockListMyWorkOrders.mockResolvedValueOnce({
      data: [],
      pagination: { page: 2, page_size: 10, total: 0, total_pages: 0, total_items: 0 },
    });

    const { result } = renderHook(() =>
      useMyWorkOrders({ status: 'in_progress', page: 2, page_size: 10 })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockListMyWorkOrders).toHaveBeenCalledWith({
      status: 'in_progress',
      page: 2,
      page_size: 10,
    });
  });

  it('sets error and clears work orders when the API call fails', async () => {
    mockListMyWorkOrders.mockRejectedValueOnce(new Error('Unauthorized'));

    const { result } = renderHook(() => useMyWorkOrders());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.workOrders).toEqual([]);
    expect(result.current.pagination).toBeNull();
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('Unauthorized');
  });

  it('exposes refresh and refetch that re-call the service', async () => {
    const workOrders = [makeWorkOrder('wo1')];
    mockListMyWorkOrders.mockResolvedValue({
      data: workOrders,
      pagination: mockPagination,
    });

    const { result } = renderHook(() => useMyWorkOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.refresh();
    await result.current.refetch();

    // initial + refresh + refetch = 3 calls
    expect(mockListMyWorkOrders).toHaveBeenCalledTimes(3);
  });

  it('starts with isLoading true while the request is in flight', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof listMyWorkOrders>>) => void;
    mockListMyWorkOrders.mockReturnValueOnce(
      new Promise((res) => { resolve = res; })
    );

    const { result } = renderHook(() => useMyWorkOrders());

    // Before the promise resolves, isLoading should be true
    expect(result.current.isLoading).toBe(true);

    resolve({ data: [], pagination: mockPagination });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('returns empty workOrders and null pagination with no params (default call)', async () => {
    mockListMyWorkOrders.mockResolvedValueOnce({
      data: [],
      pagination: { page: 1, page_size: 20, total: 0, total_pages: 0, total_items: 0 },
    });

    const { result } = renderHook(() => useMyWorkOrders());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.workOrders).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(mockListMyWorkOrders).toHaveBeenCalledWith({
      status: undefined,
      page: undefined,
      page_size: undefined,
    });
  });
});

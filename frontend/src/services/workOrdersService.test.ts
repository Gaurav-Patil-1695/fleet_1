import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios so apiClient never hits the network
vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios');
  const instance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    defaults: { headers: { common: {} } },
  };
  return {
    default: {
      ...actual.default,
      create: vi.fn(() => instance),
      isAxiosError: actual.default.isAxiosError,
    },
  };
});

import apiClient from './apiClient';
import {
  listWorkOrders,
  listMyWorkOrders,
  createWorkOrder,
  getWorkOrder,
  assignWorkOrder,
  closeWorkOrder,
} from './workOrdersService';

const mockApiClient = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const sampleWorkOrder = {
  id: 'wo-1',
  vehicle_id: 'v-1',
  depot_id: 'd-1',
  assigned_technician_id: undefined,
  raised_by_user_id: 'u-1',
  closed_by_user_id: undefined,
  status: 'open' as const,
  description: 'Oil change required',
  completion_notes: undefined,
  post_service_odometer_km: undefined,
  post_service_reading_id: undefined,
  raised_at: '2024-01-01T00:00:00Z',
  closed_at: undefined,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const sampleListResponse = {
  data: [sampleWorkOrder],
  pagination: { page: 1, page_size: 20, total: 1, total_pages: 1, total_items: 1 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('workOrdersService', () => {
  it('listWorkOrders calls GET /work-orders and returns list response', async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: sampleListResponse });

    const result = await listWorkOrders({ status: 'open', depot_id: 'd-1' });

    expect(mockApiClient.get).toHaveBeenCalledWith('/work-orders', {
      params: { status: 'open', depot_id: 'd-1' },
    });
    expect(result).toEqual(sampleListResponse);
    expect(result.data[0].status).toBe('open');
  });

  it('createWorkOrder calls POST /work-orders and returns created work order', async () => {
    mockApiClient.post.mockResolvedValueOnce({ data: sampleWorkOrder });

    const body = {
      vehicle_id: 'v-1',
      depot_id: 'd-1',
      description: 'Oil change required',
    };
    const result = await createWorkOrder(body as Parameters<typeof createWorkOrder>[0]);

    expect(mockApiClient.post).toHaveBeenCalledWith('/work-orders', body);
    expect(result).toEqual(sampleWorkOrder);
    expect(result.id).toBe('wo-1');
  });

  it('getWorkOrder calls GET /work-orders/{id} and returns work order', async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: sampleWorkOrder });

    const result = await getWorkOrder('wo-1');

    expect(mockApiClient.get).toHaveBeenCalledWith('/work-orders/wo-1');
    expect(result).toEqual(sampleWorkOrder);
  });

  it('assignWorkOrder calls POST /work-orders/{id}/assign with body and returns updated work order', async () => {
    const assignedWorkOrder = { ...sampleWorkOrder, assigned_technician_id: 'tech-1', status: 'in_progress' as const };
    mockApiClient.post.mockResolvedValueOnce({ data: assignedWorkOrder });

    const body = { assigned_technician_id: 'tech-1' };
    const result = await assignWorkOrder('wo-1', body as Parameters<typeof assignWorkOrder>[1]);

    expect(mockApiClient.post).toHaveBeenCalledWith('/work-orders/wo-1/assign', body);
    expect(result.assigned_technician_id).toBe('tech-1');
  });

  it('closeWorkOrder calls POST /work-orders/{id}/close with body and returns closed work order', async () => {
    const closedWorkOrder = { ...sampleWorkOrder, status: 'closed' as const, completion_notes: 'Done', closed_at: '2024-01-02T00:00:00Z' };
    mockApiClient.post.mockResolvedValueOnce({ data: closedWorkOrder });

    const body = { completion_notes: 'Done', post_service_odometer_km: 95000 };
    const result = await closeWorkOrder('wo-1', body as Parameters<typeof closeWorkOrder>[1]);

    expect(mockApiClient.post).toHaveBeenCalledWith('/work-orders/wo-1/close', body);
    expect(result.status).toBe('closed');
    expect(result.completion_notes).toBe('Done');
  });

  it('listMyWorkOrders calls GET /work-orders/my and returns list response', async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: sampleListResponse });

    const result = await listMyWorkOrders({ status: 'open' });

    expect(mockApiClient.get).toHaveBeenCalledWith('/work-orders/my', {
      params: { status: 'open' },
    });
    expect(result).toEqual(sampleListResponse);
  });
});

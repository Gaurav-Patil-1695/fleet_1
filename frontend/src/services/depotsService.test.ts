import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios before importing modules that use it
vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios');
  return {
    default: {
      ...actual.default,
      create: vi.fn(() => ({
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      })),
      isAxiosError: actual.default.isAxiosError,
    },
  };
});

// We need to mock apiClient directly since the services import it
vi.mock('./apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import apiClient from './apiClient';
import {
  listDepots,
  createDepot,
  getDepot,
  updateDepot,
  deleteDepot,
  getDepotDashboard,
} from './depotsService';

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);
const mockedPut = vi.mocked(apiClient.put);
const mockedDelete = vi.mocked(apiClient.delete);

const sampleDepot = {
  id: 'depot-1',
  name: 'Main Depot',
  address: '123 Fleet St',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listDepots', () => {
  it('calls GET /depots and returns the response data', async () => {
    const listResponse = { items: [sampleDepot], total: 1, page: 1, page_size: 20 };
    mockedGet.mockResolvedValueOnce({ data: listResponse });

    const result = await listDepots();

    expect(mockedGet).toHaveBeenCalledWith('/depots', { params: undefined });
    expect(result).toEqual(listResponse);
  });

  it('forwards query params to GET /depots', async () => {
    const listResponse = { items: [], total: 0, page: 2, page_size: 10 };
    mockedGet.mockResolvedValueOnce({ data: listResponse });

    await listDepots({ page: 2, pageSize: 10, search: 'central' });

    expect(mockedGet).toHaveBeenCalledWith('/depots', {
      params: { page: 2, pageSize: 10, search: 'central' },
    });
  });
});

describe('createDepot', () => {
  it('calls POST /depots with the body and returns created depot', async () => {
    mockedPost.mockResolvedValueOnce({ data: sampleDepot });

    const body = { name: 'Main Depot', address: '123 Fleet St' };
    const result = await createDepot(body);

    expect(mockedPost).toHaveBeenCalledWith('/depots', body);
    expect(result).toEqual(sampleDepot);
  });
});

describe('getDepot', () => {
  it('calls GET /depots/{depotId} and returns the depot', async () => {
    mockedGet.mockResolvedValueOnce({ data: sampleDepot });

    const result = await getDepot('depot-1');

    expect(mockedGet).toHaveBeenCalledWith('/depots/depot-1');
    expect(result).toEqual(sampleDepot);
  });
});

describe('updateDepot', () => {
  it('calls PUT /depots/{depotId} with the body and returns updated depot', async () => {
    const updated = { ...sampleDepot, name: 'Updated Depot' };
    mockedPut.mockResolvedValueOnce({ data: updated });

    const result = await updateDepot('depot-1', { name: 'Updated Depot' });

    expect(mockedPut).toHaveBeenCalledWith('/depots/depot-1', { name: 'Updated Depot' });
    expect(result).toEqual(updated);
  });
});

describe('deleteDepot', () => {
  it('calls DELETE /depots/{depotId} and resolves with no value', async () => {
    mockedDelete.mockResolvedValueOnce({ data: undefined });

    const result = await deleteDepot('depot-1');

    expect(mockedDelete).toHaveBeenCalledWith('/depots/depot-1');
    expect(result).toBeUndefined();
  });
});

describe('getDepotDashboard', () => {
  it('calls GET /depots/{depotId}/dashboard and returns dashboard data', async () => {
    const dashboard = {
      depot_id: 'depot-1',
      total_vehicles: 10,
      due_soon: 2,
      overdue: 1,
    };
    mockedGet.mockResolvedValueOnce({ data: dashboard });

    const result = await getDepotDashboard('depot-1');

    expect(mockedGet).toHaveBeenCalledWith('/depots/depot-1/dashboard');
    expect(result).toEqual(dashboard);
  });
});

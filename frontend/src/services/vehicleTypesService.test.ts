import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios before importing apiClient/service
vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios');
  const mockInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn(() => mockInstance),
    },
  };
});

import apiClient from './apiClient';
import {
  listVehicleTypes,
  createVehicleType,
  getVehicleType,
  updateVehicleType,
  deleteVehicleType,
} from './vehicleTypesService';

const mockedClient = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const sampleVehicleType = {
  id: 'vt-1',
  name: 'Heavy Truck A',
  vehicle_class: 'heavy_truck' as const,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const sampleListResponse = {
  data: [sampleVehicleType],
  pagination: { page: 1, page_size: 20, total: 1, total_pages: 1, total_items: 1 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listVehicleTypes', () => {
  it('calls GET /vehicle-types and returns list response', async () => {
    mockedClient.get.mockResolvedValueOnce({ data: sampleListResponse });

    const result = await listVehicleTypes();

    expect(mockedClient.get).toHaveBeenCalledWith('/vehicle-types', { params: undefined });
    expect(result).toEqual(sampleListResponse);
  });

  it('passes query params to GET /vehicle-types', async () => {
    mockedClient.get.mockResolvedValueOnce({ data: sampleListResponse });

    const params = { vehicle_class: 'heavy_truck' as const, page: 1, pageSize: 10 };
    await listVehicleTypes(params);

    expect(mockedClient.get).toHaveBeenCalledWith('/vehicle-types', { params });
  });
});

describe('createVehicleType', () => {
  it('calls POST /vehicle-types with body and returns created vehicle type', async () => {
    mockedClient.post.mockResolvedValueOnce({ data: sampleVehicleType });

    const body = { name: 'Heavy Truck A', vehicle_class: 'heavy_truck' as const };
    const result = await createVehicleType(body);

    expect(mockedClient.post).toHaveBeenCalledWith('/vehicle-types', body);
    expect(result).toEqual(sampleVehicleType);
  });
});

describe('getVehicleType', () => {
  it('calls GET /vehicle-types/:id and returns vehicle type', async () => {
    mockedClient.get.mockResolvedValueOnce({ data: sampleVehicleType });

    const result = await getVehicleType('vt-1');

    expect(mockedClient.get).toHaveBeenCalledWith('/vehicle-types/vt-1');
    expect(result).toEqual(sampleVehicleType);
  });
});

describe('updateVehicleType', () => {
  it('calls PUT /vehicle-types/:id with body and returns updated vehicle type', async () => {
    const updated = { ...sampleVehicleType, name: 'Updated Name' };
    mockedClient.put.mockResolvedValueOnce({ data: updated });

    const body = { name: 'Updated Name' };
    const result = await updateVehicleType('vt-1', body);

    expect(mockedClient.put).toHaveBeenCalledWith('/vehicle-types/vt-1', body);
    expect(result).toEqual(updated);
  });
});

describe('deleteVehicleType', () => {
  it('calls DELETE /vehicle-types/:id and returns void', async () => {
    mockedClient.delete.mockResolvedValueOnce({ data: undefined });

    const result = await deleteVehicleType('vt-1');

    expect(mockedClient.delete).toHaveBeenCalledWith('/vehicle-types/vt-1');
    expect(result).toBeUndefined();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios before importing modules that use it
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
  };
  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn(() => instance),
    },
  };
});

import apiClient from './apiClient';
import {
  listVehicles,
  createVehicle,
  getVehicle,
  updateVehicle,
  listVehicleReadings,
  listVehicleWorkOrders,
} from './vehiclesService';

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
const mockPost = apiClient.post as ReturnType<typeof vi.fn>;
const mockPut = apiClient.put as ReturnType<typeof vi.fn>;

const sampleVehicle = {
  id: 'v-1',
  depot_id: 'd-1',
  vehicle_type_id: 'vt-1',
  registration_number: 'ABC-123',
  make: 'Ford',
  model: 'Transit',
  in_service_date: '2022-01-01',
  has_telematics: false,
  last_known_odometer_km: 50000,
  last_odometer_recorded_at: null,
  last_serviced_odometer_km: null,
  last_serviced_at: null,
  next_service_due_date: null,
  next_service_due_odometer_km: null,
  status: 'active' as const,
  created_at: '2022-01-01T00:00:00Z',
  updated_at: '2022-01-01T00:00:00Z',
};

const sampleVehicleListResponse = {
  data: [sampleVehicle],
  pagination: { page: 1, page_size: 20, total: 1, total_pages: 1, total_items: 1 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listVehicles', () => {
  it('calls GET /vehicles and returns list response', async () => {
    mockGet.mockResolvedValueOnce({ data: sampleVehicleListResponse });

    const result = await listVehicles({ depot_id: 'd-1', status: 'active' });

    expect(mockGet).toHaveBeenCalledWith('/vehicles', {
      params: { depot_id: 'd-1', status: 'active' },
    });
    expect(result).toEqual(sampleVehicleListResponse);
  });
});

describe('createVehicle', () => {
  it('calls POST /vehicles with body and returns created vehicle', async () => {
    mockPost.mockResolvedValueOnce({ data: sampleVehicle });

    const body = {
      depot_id: 'd-1',
      vehicle_type_id: 'vt-1',
      registration_number: 'ABC-123',
      make: 'Ford',
      model: 'Transit',
      in_service_date: '2022-01-01',
      has_telematics: false,
      status: 'active' as const,
    };

    const result = await createVehicle(body);

    expect(mockPost).toHaveBeenCalledWith('/vehicles', body);
    expect(result).toEqual(sampleVehicle);
  });
});

describe('getVehicle', () => {
  it('calls GET /vehicles/:id and returns a single vehicle', async () => {
    mockGet.mockResolvedValueOnce({ data: sampleVehicle });

    const result = await getVehicle('v-1');

    expect(mockGet).toHaveBeenCalledWith('/vehicles/v-1');
    expect(result).toEqual(sampleVehicle);
  });
});

describe('updateVehicle', () => {
  it('calls PUT /vehicles/:id with partial body and returns updated vehicle', async () => {
    const updated = { ...sampleVehicle, make: 'Mercedes' };
    mockPut.mockResolvedValueOnce({ data: updated });

    const result = await updateVehicle('v-1', { make: 'Mercedes' });

    expect(mockPut).toHaveBeenCalledWith('/vehicles/v-1', { make: 'Mercedes' });
    expect(result.make).toBe('Mercedes');
  });
});

describe('listVehicleReadings', () => {
  it('calls GET /vehicles/:id/readings with params and returns readings', async () => {
    const readingsResponse = {
      data: [],
      pagination: { page: 1, page_size: 20, total: 0, total_pages: 0, total_items: 0 },
    };
    mockGet.mockResolvedValueOnce({ data: readingsResponse });

    const result = await listVehicleReadings('v-1', { source: 'manual', page: 1 });

    expect(mockGet).toHaveBeenCalledWith('/vehicles/v-1/readings', {
      params: { source: 'manual', page: 1 },
    });
    expect(result).toEqual(readingsResponse);
  });
});

describe('listVehicleWorkOrders', () => {
  it('calls GET /vehicles/:id/work-orders and returns work orders', async () => {
    const workOrdersResponse = {
      data: [],
      pagination: { page: 1, page_size: 20, total: 0, total_pages: 0, total_items: 0 },
    };
    mockGet.mockResolvedValueOnce({ data: workOrdersResponse });

    const result = await listVehicleWorkOrders('v-1', { status: 'open' });

    expect(mockGet).toHaveBeenCalledWith('/vehicles/v-1/work-orders', {
      params: { status: 'open' },
    });
    expect(result).toEqual(workOrdersResponse);
  });
});

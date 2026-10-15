import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios before importing services
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
import { listReadings, createReading, getReading } from './readingsService';

const mockedClient = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

const sampleReading = {
  id: 'r-1',
  vehicle_id: 'v-1',
  recorded_by_user_id: 'u-1',
  odometer_km: 12000,
  source: 'manual' as const,
  is_test_mode: false,
  raw_payload: undefined,
  reading_timestamp: '2024-01-15T10:00:00Z',
  created_at: '2024-01-15T10:00:00Z',
};

const sampleReadingListResponse = {
  data: [sampleReading],
  pagination: { page: 1, page_size: 20, total: 1, total_pages: 1, total_items: 1 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listReadings', () => {
  it('calls GET /readings and returns the list response', async () => {
    mockedClient.get.mockResolvedValueOnce({ data: sampleReadingListResponse });

    const result = await listReadings();

    expect(mockedClient.get).toHaveBeenCalledWith('/readings', { params: undefined });
    expect(result).toEqual(sampleReadingListResponse);
  });

  it('forwards filter params to GET /readings', async () => {
    mockedClient.get.mockResolvedValueOnce({ data: sampleReadingListResponse });
    const params = { vehicle_id: 'v-1', source: 'manual', page: 1, page_size: 10 };

    const result = await listReadings(params);

    expect(mockedClient.get).toHaveBeenCalledWith('/readings', { params });
    expect(result.data).toHaveLength(1);
  });
});

describe('createReading', () => {
  it('calls POST /readings with body and returns the created reading', async () => {
    mockedClient.post.mockResolvedValueOnce({ data: sampleReading });
    const body = {
      vehicle_id: 'v-1',
      odometer_km: 12000,
      source: 'manual' as const,
      reading_timestamp: '2024-01-15T10:00:00Z',
    };

    const result = await createReading(body);

    expect(mockedClient.post).toHaveBeenCalledWith('/readings', body);
    expect(result).toEqual(sampleReading);
  });

  it('propagates errors from the API client', async () => {
    const apiError = new Error('Network Error');
    mockedClient.post.mockRejectedValueOnce(apiError);
    const body = {
      vehicle_id: 'v-1',
      odometer_km: 12000,
      source: 'manual' as const,
      reading_timestamp: '2024-01-15T10:00:00Z',
    };

    await expect(createReading(body)).rejects.toThrow('Network Error');
  });
});

describe('getReading', () => {
  it('calls GET /readings/{readingId} and returns the reading', async () => {
    mockedClient.get.mockResolvedValueOnce({ data: sampleReading });

    const result = await getReading('r-1');

    expect(mockedClient.get).toHaveBeenCalledWith('/readings/r-1');
    expect(result).toEqual(sampleReading);
  });
});

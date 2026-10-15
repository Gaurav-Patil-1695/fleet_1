import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios before importing services
vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios');
  return {
    ...actual,
    default: {
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
      isAxiosError: actual.isAxiosError,
    },
  };
});

// We need to mock apiClient directly since schedulesService imports it
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
  listSchedules,
  createSchedule,
  getSchedule,
  updateSchedule,
  deleteSchedule,
} from './schedulesService';

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

const mockScheduleListResponse = {
  items: [mockSchedule],
  total: 1,
  page: 1,
  page_size: 20,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('schedulesService', () => {
  it('listSchedules calls GET /schedules and returns data', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockScheduleListResponse });

    const result = await listSchedules({ page: 1, limit: 20, is_active: true });

    expect(apiClient.get).toHaveBeenCalledWith('/schedules', {
      params: { page: 1, limit: 20, is_active: true },
    });
    expect(result).toEqual(mockScheduleListResponse);
  });

  it('createSchedule calls POST /schedules with body and returns new schedule', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockSchedule });

    const body = {
      vehicle_type_id: 'vt-1',
      vehicle_class: 'heavy_truck' as const,
      km_interval: 10000,
      month_interval: 6,
      is_active: true,
    };
    const result = await createSchedule(body);

    expect(apiClient.post).toHaveBeenCalledWith('/schedules', body);
    expect(result).toEqual(mockSchedule);
  });

  it('getSchedule calls GET /schedules/{scheduleId} and returns schedule', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockSchedule });

    const result = await getSchedule('sched-1');

    expect(apiClient.get).toHaveBeenCalledWith('/schedules/sched-1');
    expect(result).toEqual(mockSchedule);
  });

  it('updateSchedule calls PUT /schedules/{scheduleId} with body and returns updated schedule', async () => {
    const updated = { ...mockSchedule, km_interval: 15000 };
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: updated });

    const result = await updateSchedule('sched-1', { km_interval: 15000 });

    expect(apiClient.put).toHaveBeenCalledWith('/schedules/sched-1', { km_interval: 15000 });
    expect(result).toEqual(updated);
  });

  it('deleteSchedule calls DELETE /schedules/{scheduleId} and returns void', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: undefined });

    const result = await deleteSchedule('sched-1');

    expect(apiClient.delete).toHaveBeenCalledWith('/schedules/sched-1');
    expect(result).toBeUndefined();
  });

  it('listSchedules propagates error when API call fails', async () => {
    const error = new Error('Network Error');
    vi.mocked(apiClient.get).mockRejectedValueOnce(error);

    await expect(listSchedules()).rejects.toThrow('Network Error');
    expect(apiClient.get).toHaveBeenCalledWith('/schedules', { params: undefined });
  });
});

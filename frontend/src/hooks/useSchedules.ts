import { useState, useEffect, useCallback } from 'react';
import {
  listSchedules,
  type ListSchedulesParams,
} from '../services/schedulesService';
import type { Schedule, ScheduleListResponse } from '../types/schedule';
import type { Pagination, ApiError } from '../types/common';
import { parseApiError } from '../utils/errorUtils';

export interface UseSchedulesParams extends ListSchedulesParams {}

export interface UseSchedulesResult {
  schedules: Schedule[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: ApiError | null;
  refresh: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useSchedules(params?: UseSchedulesParams): UseSchedulesResult {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);

  const vehicleTypeId = params?.vehicle_type_id;
  const vehicleClass = params?.vehicle_class;
  const isActive = params?.is_active;
  const page = params?.page;
  const limit = params?.limit;

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response: ScheduleListResponse = await listSchedules({
        vehicle_type_id: vehicleTypeId,
        vehicle_class: vehicleClass,
        is_active: isActive,
        page,
        limit,
      });
      setSchedules(response.data);
      setPagination(response.pagination);
    } catch (err: unknown) {
      setError(parseApiError(err));
      setSchedules([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [vehicleTypeId, vehicleClass, isActive, page, limit]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { schedules, pagination, isLoading, error, refresh: fetch, refetch: fetch };
}

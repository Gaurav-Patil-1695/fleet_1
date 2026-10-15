import { useState, useEffect, useCallback } from 'react';
import {
  listReadings,
  type ListReadingsParams,
} from '../services/readingsService';
import {
  listVehicleReadings,
  type ListVehicleReadingsParams,
} from '../services/vehiclesService';
import type { Reading, ReadingListResponse } from '../types/reading';
import type { Pagination, ApiError } from '../types/common';
import { parseApiError } from '../utils/errorUtils';

export interface UseReadingsParams extends ListReadingsParams {}

export interface UseVehicleReadingsParams extends ListVehicleReadingsParams {
  vehicleId: string | null | undefined;
}

export interface UseReadingsResult {
  readings: Reading[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: ApiError | null;
  refresh: () => Promise<void>;
}

export function useReadings(params?: UseReadingsParams): UseReadingsResult {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);

  const vehicleId = params?.vehicle_id;
  const source = params?.source;
  const isTestMode = params?.is_test_mode;
  const from = params?.from;
  const to = params?.to;
  const page = params?.page;
  const pageSize = params?.page_size;

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response: ReadingListResponse = await listReadings({
        vehicle_id: vehicleId,
        source,
        is_test_mode: isTestMode,
        from,
        to,
        page,
        page_size: pageSize,
      });
      setReadings(response.data);
      setPagination(response.pagination);
    } catch (err: unknown) {
      setError(parseApiError(err));
      setReadings([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [vehicleId, source, isTestMode, from, to, page, pageSize]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { readings, pagination, isLoading, error, refresh: fetch };
}

export function useVehicleReadings(params: UseVehicleReadingsParams): UseReadingsResult {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);

  const { vehicleId, page, page_size: pageSize } = params;

  const fetch = useCallback(async () => {
    if (!vehicleId) {
      setReadings([]);
      setPagination(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response: ReadingListResponse = await listVehicleReadings(vehicleId, {
        page,
        page_size: pageSize,
      });
      setReadings(response.data);
      setPagination(response.pagination);
    } catch (err: unknown) {
      setError(parseApiError(err));
      setReadings([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [vehicleId, page, pageSize]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { readings, pagination, isLoading, error, refresh: fetch };
}

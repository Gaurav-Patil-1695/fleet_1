import { useState, useEffect, useCallback } from 'react';
import {
  listVehicles,
  type ListVehiclesParams,
} from '../services/vehiclesService';
import type { Vehicle, VehicleListResponse } from '../types/vehicle';
import type { Pagination, ApiError } from '../types/common';
import { parseApiError } from '../utils/errorUtils';

export interface UseVehiclesParams extends ListVehiclesParams {}

export interface UseVehiclesResult {
  vehicles: Vehicle[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: ApiError | null;
  refresh: () => Promise<void>;
}

export function useVehicles(params?: UseVehiclesParams): UseVehiclesResult {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);

  const depotId = params?.depot_id;
  const vehicleTypeId = params?.vehicle_type_id;
  const status = params?.status;
  const hasTelematics = params?.has_telematics;
  const page = params?.page;
  const pageSize = params?.page_size;

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response: VehicleListResponse = await listVehicles({
        depot_id: depotId,
        vehicle_type_id: vehicleTypeId,
        status,
        has_telematics: hasTelematics,
        page,
        page_size: pageSize,
      });
      setVehicles(response.data);
      setPagination(response.pagination);
    } catch (err: unknown) {
      setError(parseApiError(err));
      setVehicles([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [depotId, vehicleTypeId, status, hasTelematics, page, pageSize]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { vehicles, pagination, isLoading, error, refresh: fetch };
}

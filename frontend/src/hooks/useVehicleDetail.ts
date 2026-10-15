import { useState, useEffect, useCallback } from 'react';
import { getVehicle } from '../services/vehiclesService';
import type { Vehicle } from '../types/vehicle';
import type { ApiError } from '../types/common';
import { parseApiError } from '../utils/errorUtils';

export interface UseVehicleDetailResult {
  vehicle: Vehicle | null;
  isLoading: boolean;
  error: ApiError | null;
  refresh: () => Promise<void>;
}

export function useVehicleDetail(vehicleId: string | null | undefined): UseVehicleDetailResult {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fetch = useCallback(async () => {
    if (!vehicleId) {
      setVehicle(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getVehicle(vehicleId);
      setVehicle(data);
    } catch (err: unknown) {
      setError(parseApiError(err));
      setVehicle(null);
    } finally {
      setIsLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { vehicle, isLoading, error, refresh: fetch };
}

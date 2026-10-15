import { useState, useEffect, useCallback } from 'react';
import { getDepotDashboard } from '../services/depotsService';
import type { DepotDashboard } from '../types/depot';
import type { ApiError } from '../types/common';
import { parseApiError } from '../utils/errorUtils';

export interface UseDepotDashboardResult {
  dashboard: DepotDashboard | null;
  isLoading: boolean;
  error: ApiError | null;
  refresh: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useDepotDashboard(depotId: string | null | undefined): UseDepotDashboardResult {
  const [dashboard, setDashboard] = useState<DepotDashboard | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fetch = useCallback(async () => {
    if (!depotId) {
      setDashboard(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getDepotDashboard(depotId);
      setDashboard(data);
    } catch (err: unknown) {
      setError(parseApiError(err));
      setDashboard(null);
    } finally {
      setIsLoading(false);
    }
  }, [depotId]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { dashboard, isLoading, error, refresh: fetch, refetch: fetch };
}

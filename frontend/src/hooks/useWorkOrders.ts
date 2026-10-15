import { useState, useEffect, useCallback } from 'react';
import {
  listWorkOrders,
  type ListWorkOrdersParams,
} from '../services/workOrdersService';
import type { WorkOrder, WorkOrderListResponse } from '../types/workOrder';
import type { Pagination, ApiError } from '../types/common';
import { parseApiError } from '../utils/errorUtils';

export interface UseWorkOrdersParams extends ListWorkOrdersParams {}

export interface UseWorkOrdersResult {
  workOrders: WorkOrder[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: ApiError | null;
  refresh: () => Promise<void>;
}

export function useWorkOrders(params?: UseWorkOrdersParams): UseWorkOrdersResult {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);

  const status = params?.status;
  const depotId = params?.depot_id;
  const page = params?.page;
  const pageSize = params?.page_size;

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response: WorkOrderListResponse = await listWorkOrders({
        status,
        depot_id: depotId,
        page,
        page_size: pageSize,
      });
      setWorkOrders(response.data);
      setPagination(response.pagination);
    } catch (err: unknown) {
      setError(parseApiError(err));
      setWorkOrders([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [status, depotId, page, pageSize]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { workOrders, pagination, isLoading, error, refresh: fetch };
}

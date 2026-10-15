import type { Pagination } from './common';

export type WorkOrderStatus = 'open' | 'in_progress' | 'closed' | 'cancelled';

export interface WorkOrder {
  id: string;
  vehicle_id: string;
  depot_id: string;
  assigned_technician_id?: string;
  raised_by_user_id: string;
  closed_by_user_id?: string;
  status: WorkOrderStatus;
  description?: string;
  completion_notes?: string;
  post_service_odometer_km?: number;
  post_service_reading_id?: string;
  raised_at: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkOrderCreate {
  vehicle_id: string;
  depot_id: string;
  description?: string;
}

export interface WorkOrderUpdate {
  description?: string;
}

export interface WorkOrderAssign {
  assigned_technician_id: string;
}

export interface WorkOrderClose {
  completion_notes: string;
  post_service_odometer_km: number;
}

export interface WorkOrderListResponse {
  data: WorkOrder[];
  pagination: Pagination;
}

/** Alias kept for naming-contract compatibility */
export type WorkOrderRead = WorkOrder;

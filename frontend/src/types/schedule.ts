import type { Pagination } from './common';

export type VehicleClass = 'heavy_truck' | 'light_commercial' | 'other';

export interface Schedule {
  id: string;
  vehicle_type_id: string;
  vehicle_class: VehicleClass;
  km_interval: number;
  month_interval: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduleCreate {
  vehicle_type_id: string;
  vehicle_class: VehicleClass;
  km_interval: number;
  month_interval: number;
  is_active?: boolean;
}

export interface ScheduleUpdate {
  km_interval?: number;
  month_interval?: number;
  is_active?: boolean;
}

export interface ScheduleListResponse {
  data: Schedule[];
  pagination: Pagination;
}

/** Alias kept for naming-contract compatibility */
export type ScheduleRead = Schedule;

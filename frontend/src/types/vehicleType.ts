import type { Pagination } from './common';

export type VehicleClass = 'heavy_truck' | 'light_commercial' | 'other';

export interface VehicleType {
  id: string;
  name: string;
  vehicle_class: VehicleClass;
  created_at: string;
  updated_at: string;
}

export interface VehicleTypeCreate {
  name: string;
  vehicle_class: VehicleClass;
}

export interface VehicleTypeUpdate {
  name?: string;
  vehicle_class?: VehicleClass;
}

export interface VehicleTypeListResponse {
  data: VehicleType[];
  pagination: Pagination;
}

/** Alias kept for naming-contract compatibility */
export type VehicleTypeRead = VehicleType;

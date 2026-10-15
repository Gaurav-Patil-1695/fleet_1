import type { Pagination } from './common';

export type VehicleStatus = 'active' | 'inactive' | 'decommissioned';

export interface Vehicle {
  id: string;
  depot_id: string;
  vehicle_type_id: string;
  registration_number: string;
  make: string;
  model: string;
  in_service_date: string;
  has_telematics: boolean;
  last_known_odometer_km?: number;
  last_odometer_recorded_at?: string;
  last_serviced_odometer_km?: number;
  last_serviced_at?: string;
  next_service_due_date?: string;
  next_service_due_odometer_km?: number;
  status: VehicleStatus;
  created_at: string;
  updated_at: string;
}

export interface VehicleCreate {
  depot_id: string;
  vehicle_type_id: string;
  registration_number: string;
  make: string;
  model: string;
  in_service_date: string;
  has_telematics: boolean;
  status?: VehicleStatus;
}

export interface VehicleUpdate {
  depot_id?: string;
  vehicle_type_id?: string;
  registration_number?: string;
  make?: string;
  model?: string;
  in_service_date?: string;
  has_telematics?: boolean;
  status?: VehicleStatus;
}

/** Alias for API response shape — mirrors backend VehicleRead */
export type VehicleRead = Vehicle;

/** Extended vehicle detail — mirrors backend VehicleDetailRead */
export type VehicleDetailRead = Vehicle;

export interface VehicleListResponse {
  data: Vehicle[];
  pagination: Pagination;
}

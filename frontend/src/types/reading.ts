import type { Pagination } from './common';

export type ReadingSource = 'telematics' | 'manual' | 'telematics_mock';

export interface Reading {
  id: string;
  vehicle_id: string;
  recorded_by_user_id?: string;
  odometer_km: number;
  source: ReadingSource;
  is_test_mode: boolean;
  raw_payload?: Record<string, unknown>;
  reading_timestamp: string;
  created_at: string;
}

export interface ReadingCreate {
  vehicle_id: string;
  odometer_km: number;
  source: 'manual' | 'telematics';
  is_test_mode?: boolean;
  raw_payload?: Record<string, unknown>;
  reading_timestamp: string;
}

export interface ReadingListResponse {
  data: Reading[];
  pagination: Pagination;
}

/** Alias kept for naming-contract compatibility */
export type ReadingRead = Reading;

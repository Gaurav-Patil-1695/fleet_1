export interface TelematicsReadingPayload {
  vehicle_id: string;
  odometer_km: number;
  reading_timestamp: string;
  raw_payload?: Record<string, unknown>;
}

export interface TelematicsIngestRequest {
  readings: TelematicsReadingPayload[];
}

export interface TelematicsIngestError {
  vehicle_id?: string;
  reason?: string;
}

export interface TelematicsIngestResponse {
  accepted: number;
  rejected: number;
  errors?: TelematicsIngestError[];
}

/** Alias kept for naming-contract compatibility */
export type IngestResponse = TelematicsIngestResponse;

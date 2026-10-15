import apiClient from './apiClient';
import type { Reading, ReadingCreate, ReadingListResponse } from '../types/reading';

export interface ListReadingsParams {
  vehicle_id?: string;
  source?: string;
  is_test_mode?: boolean;
  from?: string;
  to?: string;
  page?: number;
  page_size?: number;
}

export async function listReadings(
  params?: ListReadingsParams,
): Promise<ReadingListResponse> {
  const response = await apiClient.get<ReadingListResponse>('/readings', { params });
  return response.data;
}

export async function createReading(body: ReadingCreate): Promise<Reading> {
  const response = await apiClient.post<Reading>('/readings', body);
  return response.data;
}

export async function getReading(readingId: string): Promise<Reading> {
  const response = await apiClient.get<Reading>(`/readings/${readingId}`);
  return response.data;
}

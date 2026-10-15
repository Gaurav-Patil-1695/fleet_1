import apiClient from './apiClient';
import type { Depot, DepotCreate, DepotUpdate, DepotListResponse, DepotDashboard } from '../types/depot';

export async function listDepots(
  params?: { page?: number; pageSize?: number; search?: string },
): Promise<DepotListResponse> {
  const response = await apiClient.get<DepotListResponse>('/depots', { params });
  return response.data;
}

export async function createDepot(body: DepotCreate): Promise<Depot> {
  const response = await apiClient.post<Depot>('/depots', body);
  return response.data;
}

export async function getDepot(depotId: string): Promise<Depot> {
  const response = await apiClient.get<Depot>(`/depots/${depotId}`);
  return response.data;
}

export async function updateDepot(depotId: string, body: DepotUpdate): Promise<Depot> {
  const response = await apiClient.put<Depot>(`/depots/${depotId}`, body);
  return response.data;
}

export async function deleteDepot(depotId: string): Promise<void> {
  await apiClient.delete(`/depots/${depotId}`);
}

export async function getDepotDashboard(depotId: string): Promise<DepotDashboard> {
  const response = await apiClient.get<DepotDashboard>(`/depots/${depotId}/dashboard`);
  return response.data;
}

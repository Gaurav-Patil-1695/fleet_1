import apiClient from './apiClient';
import type { VehicleType, VehicleTypeCreate, VehicleTypeUpdate, VehicleTypeListResponse } from '../types/vehicleType';

export interface ListVehicleTypesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  vehicle_class?: string;
}

export async function listVehicleTypes(
  params?: ListVehicleTypesParams,
): Promise<VehicleTypeListResponse> {
  const response = await apiClient.get<VehicleTypeListResponse>('/vehicle-types', { params });
  return response.data;
}

export async function createVehicleType(body: VehicleTypeCreate): Promise<VehicleType> {
  const response = await apiClient.post<VehicleType>('/vehicle-types', body);
  return response.data;
}

export async function getVehicleType(vehicleTypeId: string): Promise<VehicleType> {
  const response = await apiClient.get<VehicleType>(`/vehicle-types/${vehicleTypeId}`);
  return response.data;
}

export async function updateVehicleType(
  vehicleTypeId: string,
  body: VehicleTypeUpdate,
): Promise<VehicleType> {
  const response = await apiClient.put<VehicleType>(`/vehicle-types/${vehicleTypeId}`, body);
  return response.data;
}

export async function deleteVehicleType(vehicleTypeId: string): Promise<void> {
  await apiClient.delete(`/vehicle-types/${vehicleTypeId}`);
}

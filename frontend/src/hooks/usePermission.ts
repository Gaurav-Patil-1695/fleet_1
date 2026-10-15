import { useAuth } from './useAuth';
import type { UserRole } from '../types/auth';

export interface UsePermissionResult {
  // General role checks
  hasRole: (...roles: UserRole[]) => boolean;
  /** Alias: returns true if the current user has any of the given roles */
  canAccess: (roles: UserRole[]) => boolean;
  /** Alias: returns true if the current user's role matches the given role */
  isRole: (role: UserRole) => boolean;
  isAdministrator: boolean;
  isManager: boolean;
  isTechnician: boolean;

  // Depot permissions
  canListDepots: boolean;
  canCreateDepot: boolean;
  canViewDepot: boolean;
  canUpdateDepot: boolean;
  canDeleteDepot: boolean;
  canViewDepotDashboard: boolean;

  // Vehicle type permissions
  canListVehicleTypes: boolean;
  canCreateVehicleType: boolean;
  canViewVehicleType: boolean;
  canUpdateVehicleType: boolean;
  canDeleteVehicleType: boolean;

  // Schedule permissions
  canListSchedules: boolean;
  canCreateSchedule: boolean;
  canViewSchedule: boolean;
  canUpdateSchedule: boolean;
  canDeleteSchedule: boolean;

  // Vehicle permissions
  canListVehicles: boolean;
  canCreateVehicle: boolean;
  canViewVehicle: boolean;
  canUpdateVehicle: boolean;
  canDeleteVehicle: boolean;

  // Reading permissions
  canListReadings: boolean;
  canCreateReading: boolean;
  canViewReading: boolean;

  // Work order permissions
  canListWorkOrders: boolean;
  canCreateWorkOrder: boolean;
  canViewWorkOrder: boolean;
  canUpdateWorkOrder: boolean;
  canDeleteWorkOrder: boolean;
  canAssignWorkOrder: boolean;
  canCloseWorkOrder: boolean;
  canListMyWorkOrders: boolean;
}

export function usePermission(): UsePermissionResult {
  const { hasRole, isAdministrator, isManager, isTechnician } = useAuth();

  return {
    // General role checks
    hasRole,
    canAccess: (roles: UserRole[]) => hasRole(...roles),
    isRole: (role: UserRole) => hasRole(role),
    isAdministrator,
    isManager,
    isTechnician,

    // Depot permissions
    // GET /depots -> roles: administrator, manager
    canListDepots: hasRole('administrator', 'manager'),
    // POST /depots -> roles: administrator
    canCreateDepot: hasRole('administrator'),
    // GET /depots/{depotId} -> roles: administrator, manager
    canViewDepot: hasRole('administrator', 'manager'),
    // PUT /depots/{depotId} -> roles: administrator
    canUpdateDepot: hasRole('administrator'),
    // DELETE /depots/{depotId} -> roles: administrator
    canDeleteDepot: hasRole('administrator'),
    // GET /depots/{depotId}/dashboard -> roles: manager, technician
    canViewDepotDashboard: hasRole('manager', 'technician'),

    // Vehicle type permissions
    // GET /vehicle-types -> roles: administrator, manager, technician
    canListVehicleTypes: hasRole('administrator', 'manager', 'technician'),
    // POST /vehicle-types -> roles: administrator
    canCreateVehicleType: hasRole('administrator'),
    // GET /vehicle-types/{vehicleTypeId} -> roles: administrator, manager, technician
    canViewVehicleType: hasRole('administrator', 'manager', 'technician'),
    // PUT /vehicle-types/{vehicleTypeId} -> roles: administrator
    canUpdateVehicleType: hasRole('administrator'),
    // DELETE /vehicle-types/{vehicleTypeId} -> roles: administrator
    canDeleteVehicleType: hasRole('administrator'),

    // Schedule permissions
    // GET /schedules -> roles: administrator, manager
    canListSchedules: hasRole('administrator', 'manager'),
    // POST /schedules -> roles: administrator
    canCreateSchedule: hasRole('administrator'),
    // GET /schedules/{scheduleId} -> roles: administrator, manager
    canViewSchedule: hasRole('administrator', 'manager'),
    // PUT /schedules/{scheduleId} -> roles: administrator
    canUpdateSchedule: hasRole('administrator'),
    // DELETE /schedules/{scheduleId} -> roles: administrator
    canDeleteSchedule: hasRole('administrator'),

    // Vehicle permissions
    // GET /vehicles -> roles: administrator, manager, technician
    canListVehicles: hasRole('administrator', 'manager', 'technician'),
    // POST /vehicles -> roles: administrator, manager
    canCreateVehicle: hasRole('administrator', 'manager'),
    // GET /vehicles/{vehicleId} -> roles: administrator, manager, technician
    canViewVehicle: hasRole('administrator', 'manager', 'technician'),
    // PUT /vehicles/{vehicleId} -> roles: administrator, manager
    canUpdateVehicle: hasRole('administrator', 'manager'),
    // DELETE /vehicles/{vehicleId} -> roles: administrator
    canDeleteVehicle: hasRole('administrator'),

    // Reading permissions
    // GET /readings -> roles: administrator, manager
    canListReadings: hasRole('administrator', 'manager'),
    // POST /readings -> roles: administrator, manager, technician
    canCreateReading: hasRole('administrator', 'manager', 'technician'),
    // GET /readings/{readingId} -> roles: administrator, manager, technician
    canViewReading: hasRole('administrator', 'manager', 'technician'),

    // Work order permissions
    // GET /work-orders -> roles: manager, technician
    canListWorkOrders: hasRole('manager', 'technician'),
    // POST /work-orders -> roles: administrator, manager
    canCreateWorkOrder: hasRole('administrator', 'manager'),
    // GET /work-orders/{workOrderId} -> roles: administrator, manager, technician
    canViewWorkOrder: hasRole('administrator', 'manager', 'technician'),
    // PUT /work-orders/{workOrderId} -> roles: administrator, manager
    canUpdateWorkOrder: hasRole('administrator', 'manager'),
    // DELETE /work-orders/{workOrderId} -> roles: administrator
    canDeleteWorkOrder: hasRole('administrator'),
    // POST /work-orders/{workOrderId}/assign -> roles: administrator, manager
    canAssignWorkOrder: hasRole('administrator', 'manager'),
    // POST /work-orders/{workOrderId}/close -> roles: technician
    canCloseWorkOrder: hasRole('technician'),
    // GET /work-orders/my -> roles: technician
    canListMyWorkOrders: hasRole('technician'),
  };
}

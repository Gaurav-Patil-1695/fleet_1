import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePermission } from './usePermission';
import * as useAuthModule from './useAuth';
import type { UserRole } from '../types/auth';

function mockUseAuth(role: UserRole | null) {
  const hasRole = (...roles: UserRole[]): boolean => {
    if (!role) return false;
    return roles.includes(role);
  };
  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
    user: role ? ({ role } as any) : null,
    role,
    isAuthenticated: role !== null,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    hasRole,
    isAdministrator: role === 'administrator',
    isManager: role === 'manager',
    isTechnician: role === 'technician',
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('usePermission — administrator role', () => {
  it('grants administrator the correct permissions', () => {
    mockUseAuth('administrator');
    const { result } = renderHook(() => usePermission());
    const p = result.current;

    // Role flags
    expect(p.isAdministrator).toBe(true);
    expect(p.isManager).toBe(false);
    expect(p.isTechnician).toBe(false);

    // Depot
    expect(p.canListDepots).toBe(true);
    expect(p.canCreateDepot).toBe(true);
    expect(p.canViewDepot).toBe(true);
    expect(p.canUpdateDepot).toBe(true);
    expect(p.canDeleteDepot).toBe(true);
    expect(p.canViewDepotDashboard).toBe(false); // admin NOT in manager|technician

    // Vehicles
    expect(p.canListVehicles).toBe(true);
    expect(p.canCreateVehicle).toBe(true);
    expect(p.canUpdateVehicle).toBe(true);
    expect(p.canDeleteVehicle).toBe(true);

    // Work orders
    expect(p.canCreateWorkOrder).toBe(true);
    expect(p.canUpdateWorkOrder).toBe(true);
    expect(p.canDeleteWorkOrder).toBe(true);
    expect(p.canAssignWorkOrder).toBe(true);
    expect(p.canCloseWorkOrder).toBe(false); // technician only
    expect(p.canListMyWorkOrders).toBe(false); // technician only
    expect(p.canListWorkOrders).toBe(false); // manager|technician only
  });
});

describe('usePermission — manager role', () => {
  it('grants manager the correct permissions', () => {
    mockUseAuth('manager');
    const { result } = renderHook(() => usePermission());
    const p = result.current;

    expect(p.isManager).toBe(true);
    expect(p.isAdministrator).toBe(false);
    expect(p.isTechnician).toBe(false);

    expect(p.canListDepots).toBe(true);
    expect(p.canCreateDepot).toBe(false);
    expect(p.canUpdateDepot).toBe(false);
    expect(p.canDeleteDepot).toBe(false);
    expect(p.canViewDepotDashboard).toBe(true);

    expect(p.canCreateVehicle).toBe(true);
    expect(p.canDeleteVehicle).toBe(false);

    expect(p.canListWorkOrders).toBe(true);
    expect(p.canCreateWorkOrder).toBe(true);
    expect(p.canAssignWorkOrder).toBe(true);
    expect(p.canCloseWorkOrder).toBe(false);
    expect(p.canListMyWorkOrders).toBe(false);

    expect(p.canListReadings).toBe(true);
    expect(p.canCreateReading).toBe(true);
  });
});

describe('usePermission — technician role', () => {
  it('grants technician the correct permissions', () => {
    mockUseAuth('technician');
    const { result } = renderHook(() => usePermission());
    const p = result.current;

    expect(p.isTechnician).toBe(true);
    expect(p.isAdministrator).toBe(false);
    expect(p.isManager).toBe(false);

    expect(p.canListDepots).toBe(false);
    expect(p.canViewDepotDashboard).toBe(true);

    expect(p.canListVehicles).toBe(true);
    expect(p.canViewVehicle).toBe(true);
    expect(p.canCreateVehicle).toBe(false);
    expect(p.canDeleteVehicle).toBe(false);

    expect(p.canListReadings).toBe(false);
    expect(p.canCreateReading).toBe(true);
    expect(p.canViewReading).toBe(true);

    expect(p.canListWorkOrders).toBe(true);
    expect(p.canCloseWorkOrder).toBe(true);
    expect(p.canListMyWorkOrders).toBe(true);
    expect(p.canCreateWorkOrder).toBe(false);
    expect(p.canAssignWorkOrder).toBe(false);
    expect(p.canDeleteWorkOrder).toBe(false);
  });
});

describe('usePermission — unauthenticated (no role)', () => {
  it('denies all permissions when there is no user', () => {
    mockUseAuth(null);
    const { result } = renderHook(() => usePermission());
    const p = result.current;

    expect(p.isAdministrator).toBe(false);
    expect(p.isManager).toBe(false);
    expect(p.isTechnician).toBe(false);
    expect(p.canListDepots).toBe(false);
    expect(p.canCreateDepot).toBe(false);
    expect(p.canListVehicles).toBe(false);
    expect(p.canListWorkOrders).toBe(false);
    expect(p.canCloseWorkOrder).toBe(false);
    expect(p.canListMyWorkOrders).toBe(false);
  });
});

describe('usePermission — helper methods', () => {
  it('canAccess delegates to hasRole with spread', () => {
    mockUseAuth('manager');
    const { result } = renderHook(() => usePermission());
    expect(result.current.canAccess(['administrator', 'manager'])).toBe(true);
    expect(result.current.canAccess(['administrator'])).toBe(false);
    expect(result.current.canAccess(['technician'])).toBe(false);
  });

  it('isRole returns true only for exact matching role', () => {
    mockUseAuth('technician');
    const { result } = renderHook(() => usePermission());
    expect(result.current.isRole('technician')).toBe(true);
    expect(result.current.isRole('manager')).toBe(false);
    expect(result.current.isRole('administrator')).toBe(false);
  });
});

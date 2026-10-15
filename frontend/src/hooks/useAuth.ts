import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import type { UserRole } from '../types/auth';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const { user, isAuthenticated, isLoading, login, logout } = ctx;

  const role: UserRole | null = user?.role ?? null;

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!role) return false;
    return roles.includes(role);
  };

  const isAdministrator = role === 'administrator';
  const isManager = role === 'manager';
  const isTechnician = role === 'technician';

  return {
    user,
    role,
    isAuthenticated,
    isLoading,
    login,
    logout,
    hasRole,
    isAdministrator,
    isManager,
    isTechnician,
  };
}

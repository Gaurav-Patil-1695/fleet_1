import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { useAuth } from './useAuth';
import { AuthContext } from '../context/AuthContext';
import type { AuthContextValue } from '../context/AuthContext';
import type { UserRead } from '../types/auth';

const mockLogin = vi.fn();
const mockLogout = vi.fn();
const mockRefreshToken = vi.fn();

const makeUser = (role: 'administrator' | 'manager' | 'technician'): UserRead => ({
  id: 'user-1',
  depot_id: 'depot-1',
  full_name: 'Test User',
  email: 'test@example.com',
  role,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
});

function makeWrapper(contextValue: AuthContextValue) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(AuthContext.Provider, { value: contextValue }, children);
  };
}

function makeContextValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: null,
    accessToken: null,
    role: null,
    isAuthenticated: false,
    isLoading: false,
    login: mockLogin,
    logout: mockLogout,
    refreshToken: mockRefreshToken,
    ...overrides,
  };
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });

  it('returns correct values for an authenticated administrator', () => {
    const user = makeUser('administrator');
    const ctx = makeContextValue({ user, isAuthenticated: true, accessToken: 'tok', role: 'administrator' });
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper(ctx) });

    expect(result.current.user).toBe(user);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.role).toBe('administrator');
    expect(result.current.isAdministrator).toBe(true);
    expect(result.current.isManager).toBe(false);
    expect(result.current.isTechnician).toBe(false);
  });

  it('returns correct role flags for manager', () => {
    const user = makeUser('manager');
    const ctx = makeContextValue({ user, isAuthenticated: true, accessToken: 'tok', role: 'manager' });
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper(ctx) });

    expect(result.current.role).toBe('manager');
    expect(result.current.isAdministrator).toBe(false);
    expect(result.current.isManager).toBe(true);
    expect(result.current.isTechnician).toBe(false);
  });

  it('returns correct role flags for technician', () => {
    const user = makeUser('technician');
    const ctx = makeContextValue({ user, isAuthenticated: true, accessToken: 'tok', role: 'technician' });
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper(ctx) });

    expect(result.current.role).toBe('technician');
    expect(result.current.isAdministrator).toBe(false);
    expect(result.current.isManager).toBe(false);
    expect(result.current.isTechnician).toBe(true);
  });

  it('hasRole returns true for matching roles and false otherwise', () => {
    const user = makeUser('manager');
    const ctx = makeContextValue({ user, isAuthenticated: true, accessToken: 'tok', role: 'manager' });
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper(ctx) });

    expect(result.current.hasRole('manager')).toBe(true);
    expect(result.current.hasRole('administrator', 'manager')).toBe(true);
    expect(result.current.hasRole('administrator')).toBe(false);
    expect(result.current.hasRole('technician')).toBe(false);
  });

  it('returns null role and false hasRole when user is null', () => {
    const ctx = makeContextValue({ user: null, isAuthenticated: false, accessToken: null, role: null });
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper(ctx) });

    expect(result.current.role).toBeNull();
    expect(result.current.isAdministrator).toBe(false);
    expect(result.current.isManager).toBe(false);
    expect(result.current.isTechnician).toBe(false);
    expect(result.current.hasRole('administrator', 'manager', 'technician')).toBe(false);
  });

  it('exposes login and logout from context', () => {
    const ctx = makeContextValue();
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper(ctx) });

    expect(result.current.login).toBe(mockLogin);
    expect(result.current.logout).toBe(mockLogout);
  });
});

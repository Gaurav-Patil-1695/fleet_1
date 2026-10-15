import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import apiClient from './apiClient';

// We need axios-mock-adapter to intercept requests on the apiClient instance.
// Using the actual axios instance from apiClient.

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(apiClient);
  localStorage.clear();
  // Reset window.location mock
  Object.defineProperty(window, 'location', {
    value: { pathname: '/dashboard', href: '/dashboard' },
    writable: true,
  });
});

afterEach(() => {
  mock.restore();
  vi.restoreAllMocks();
});

describe('apiClient request interceptor', () => {
  it('attaches Authorization header when access_token is in localStorage', async () => {
    localStorage.setItem('access_token', 'test-jwt-token');
    mock.onGet('/auth/me').reply(200, { id: '1', email: 'a@b.com', role: 'administrator' }, {});

    const response = await apiClient.get('/auth/me');
    // The mock captures request config; verify via history
    const request = mock.history.get[0];
    expect(request.headers?.['Authorization']).toBe('Bearer test-jwt-token');
    expect(response.status).toBe(200);
  });

  it('does NOT attach Authorization header when no token is stored', async () => {
    mock.onGet('/auth/me').reply(200, { id: '1' });

    await apiClient.get('/auth/me');
    const request = mock.history.get[0];
    expect(request.headers?.['Authorization']).toBeUndefined();
  });
});

describe('apiClient response interceptor - 401 handling', () => {
  it('removes tokens and redirects to /login on 401 response', async () => {
    localStorage.setItem('access_token', 'old-token');
    localStorage.setItem('refresh_token', 'old-refresh');
    mock.onGet('/protected').reply(401, { code: 'UNAUTHORIZED', message: 'Unauthorized' });

    await expect(apiClient.get('/protected')).rejects.toThrow();

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(window.location.href).toBe('/login');
  });

  it('does NOT redirect to /login when already on /login path on 401', async () => {
    Object.defineProperty(window, 'location', {
      value: { pathname: '/login', href: '/login' },
      writable: true,
    });
    mock.onGet('/protected').reply(401, { code: 'UNAUTHORIZED', message: 'Unauthorized' });

    await expect(apiClient.get('/protected')).rejects.toThrow();
    // href should remain /login, not be changed
    expect(window.location.href).toBe('/login');
  });
});

describe('apiClient response interceptor - 403 handling', () => {
  it('redirects to /unauthorized on 403 response', async () => {
    mock.onGet('/admin-only').reply(403, { code: 'FORBIDDEN', message: 'Forbidden' });

    await expect(apiClient.get('/admin-only')).rejects.toThrow();
    expect(window.location.href).toBe('/unauthorized');
  });
});

describe('apiClient successful response pass-through', () => {
  it('returns response data unchanged on 200', async () => {
    const payload = { items: [{ id: 'v1' }], total: 1 };
    mock.onGet('/vehicles').reply(200, payload);

    const response = await apiClient.get('/vehicles');
    expect(response.data).toEqual(payload);
    expect(response.status).toBe(200);
  });
});

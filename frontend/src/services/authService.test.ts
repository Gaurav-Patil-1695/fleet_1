import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios to prevent real HTTP calls
vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios');
  return {
    default: {
      ...actual.default,
      create: vi.fn(() => ({
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      })),
      isAxiosError: actual.default.isAxiosError,
    },
  };
});

// Mock apiClient directly
vi.mock('./apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import apiClient from './apiClient';
import { login, refreshToken, logout, getCurrentUser } from './authService';

const mockPost = apiClient.post as ReturnType<typeof vi.fn>;
const mockGet = apiClient.get as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authService', () => {
  it('login posts to /auth/login and returns TokenResponse', async () => {
    const tokenResponse = {
      access_token: 'abc123',
      refresh_token: 'ref456',
      token_type: 'bearer',
    };
    mockPost.mockResolvedValueOnce({ data: tokenResponse });

    const result = await login({ email: 'user@example.com', password: 'secret' });

    expect(mockPost).toHaveBeenCalledWith('/auth/login', {
      email: 'user@example.com',
      password: 'secret',
    });
    expect(result).toEqual(tokenResponse);
  });

  it('refreshToken posts to /auth/refresh and returns TokenResponse', async () => {
    const tokenResponse = {
      access_token: 'newtoken',
      refresh_token: 'newref',
      token_type: 'bearer',
    };
    mockPost.mockResolvedValueOnce({ data: tokenResponse });

    const result = await refreshToken({ refresh_token: 'ref456' });

    expect(mockPost).toHaveBeenCalledWith('/auth/refresh', { refresh_token: 'ref456' });
    expect(result).toEqual(tokenResponse);
  });

  it('logout posts to /auth/logout and resolves void', async () => {
    mockPost.mockResolvedValueOnce({ data: undefined });

    await expect(logout()).resolves.toBeUndefined();
    expect(mockPost).toHaveBeenCalledWith('/auth/logout');
  });

  it('getCurrentUser gets /auth/me and returns UserRead', async () => {
    const user = {
      id: 'u1',
      full_name: 'Alice',
      email: 'alice@example.com',
      role: 'administrator',
      is_active: true,
      depot_id: 'd1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    mockGet.mockResolvedValueOnce({ data: user });

    const result = await getCurrentUser();

    expect(mockGet).toHaveBeenCalledWith('/auth/me');
    expect(result).toEqual(user);
  });

  it('login propagates API errors to the caller', async () => {
    const err = new Error('Network Error');
    mockPost.mockRejectedValueOnce(err);

    await expect(login({ email: 'bad@example.com', password: 'wrong' })).rejects.toThrow(
      'Network Error',
    );
  });

  it('getCurrentUser propagates 401 errors to the caller', async () => {
    const err = Object.assign(new Error('Unauthorized'), { response: { status: 401 } });
    mockGet.mockRejectedValueOnce(err);

    await expect(getCurrentUser()).rejects.toMatchObject({ response: { status: 401 } });
  });
});

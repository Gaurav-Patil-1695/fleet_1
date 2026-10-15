import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { UserRead, UserRole, TokenResponse, LoginRequest } from '../types/auth';
import {
  login as loginService,
  logout as logoutService,
  getCurrentUser,
  refreshToken as refreshTokenService,
} from '../services/authService';
import { getErrorMessage } from '../utils/errorUtils';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export interface AuthContextValue {
  user: UserRead | null;
  accessToken: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (body: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function storeTokens(tokenResponse: TokenResponse, refresh?: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokenResponse.access_token);
  if (refresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  }
}

function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const [user, setUser] = useState<UserRead | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(getStoredAccessToken);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadCurrentUser = useCallback(async (token: string): Promise<UserRead | null> => {
    try {
      const currentUser = await getCurrentUser();
      return currentUser;
    } catch {
      return null;
    }
  }, []);

  const tryRefresh = useCallback(async (): Promise<string | null> => {
    const storedRefresh = getStoredRefreshToken();
    if (!storedRefresh) return null;
    try {
      const tokenResponse = await refreshTokenService({ refresh_token: storedRefresh });
      storeTokens(tokenResponse, storedRefresh);
      setAccessToken(tokenResponse.access_token);
      return tokenResponse.access_token;
    } catch {
      clearTokens();
      setAccessToken(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setIsLoading(true);
      let token = getStoredAccessToken();

      if (!token) {
        token = await tryRefresh();
      }

      if (token && !cancelled) {
        const currentUser = await loadCurrentUser(token);
        if (!cancelled) {
          if (currentUser) {
            setUser(currentUser);
            setAccessToken(token);
          } else {
            // Token may be expired — attempt refresh
            const newToken = await tryRefresh();
            if (newToken && !cancelled) {
              const retryUser = await loadCurrentUser(newToken);
              if (!cancelled) {
                setUser(retryUser);
                if (!retryUser) {
                  clearTokens();
                  setAccessToken(null);
                }
              }
            } else if (!cancelled) {
              setUser(null);
            }
          }
        }
      } else if (!cancelled) {
        setUser(null);
      }

      if (!cancelled) {
        setIsLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [loadCurrentUser, tryRefresh]);

  const login = useCallback(async (body: LoginRequest): Promise<void> => {
    setIsLoading(true);
    try {
      const tokenResponse = await loginService(body);
      // The API returns access_token; store refresh_token if present in response
      // TokenResponse may carry refresh_token as an extension field
      const extendedResponse = tokenResponse as TokenResponse & { refresh_token?: string };
      storeTokens(tokenResponse, extendedResponse.refresh_token);
      setAccessToken(tokenResponse.access_token);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      clearTokens();
      setAccessToken(null);
      setUser(null);
      throw new Error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutService();
    } catch {
      // best-effort — clear local state regardless
    } finally {
      clearTokens();
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<void> => {
    const token = await tryRefresh();
    if (token) {
      const currentUser = await loadCurrentUser(token);
      setUser(currentUser);
    } else {
      setUser(null);
    }
  }, [tryRefresh, loadCurrentUser]);

  const role: UserRole | null = user?.role ?? null;
  const isAuthenticated = user !== null && accessToken !== null;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      role,
      isAuthenticated,
      isLoading,
      login,
      logout,
      refreshToken,
    }),
    [user, accessToken, role, isAuthenticated, isLoading, login, logout, refreshToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;

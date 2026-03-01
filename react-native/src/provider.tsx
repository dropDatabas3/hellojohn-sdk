import {
  createHelloJohn,
  getTokenExpiresIn,
  type TokenResponse,
  type User
} from "@hellojohn/js";
import * as AuthSession from "expo-auth-session";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HelloJohnContext } from "./context";
import {
  clearAllSecureStore,
  clearChallengeToken,
  createSecureStorageAdapter,
  hydrateSecureStorageMemory,
  persistUser,
  readStoredUser,
  readTokenResponse,
  setChallengeToken,
  writeTokenResponse
} from "./storage/secureStorage";
import {
  isMFARequiredResult,
  toHelloJohnUser,
  type AuthContextValue,
  type HelloJohnUser,
  type LoginWithPasswordResult
} from "./types";

export interface HelloJohnProviderProps {
  children: React.ReactNode;
  domain: string;
  clientId: string;
  tenantId?: string;
  redirectScheme?: string;
  redirectUri?: string;
}

export function HelloJohnProvider({
  children,
  domain,
  clientId,
  tenantId,
  redirectScheme,
  redirectUri
}: HelloJohnProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<HelloJohnUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshSessionRef = useRef<() => Promise<void>>(async () => {});

  const storageAdapter = useMemo(() => createSecureStorageAdapter(), []);

  const resolvedRedirectUri = useMemo(
    () =>
      redirectUri ??
      AuthSession.makeRedirectUri(
        redirectScheme
          ? {
              scheme: redirectScheme
            }
          : undefined
      ),
    [redirectScheme, redirectUri]
  );

  const auth = useMemo(
    () =>
      createHelloJohn({
        domain,
        clientID: clientId,
        tenantID: tenantId,
        redirectURI: resolvedRedirectUri,
        storage: storageAdapter
      }),
    [clientId, domain, resolvedRedirectUri, storageAdapter, tenantId]
  );

  const clearRefreshTimer = useCallback((): void => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const syncUserState = useCallback(async (): Promise<void> => {
    const remoteUser = await auth.getUser().catch(() => null);
    if (remoteUser) {
      await persistUser(remoteUser as HelloJohnUser);
      setUser(remoteUser as HelloJohnUser);
      setIsAuthenticated(true);
      return;
    }

    const cachedUser = await readStoredUser();
    if (cachedUser) {
      setUser(cachedUser);
      setIsAuthenticated(true);
      return;
    }

    setUser(null);
    setIsAuthenticated(false);
  }, [auth]);

  const scheduleBackgroundRefresh = useCallback((): void => {
    clearRefreshTimer();

    const tokens = auth.getStoredTokens();
    if (!tokens?.access_token || !tokens.refresh_token) {
      return;
    }

    const expiresInMs = getTokenExpiresIn(tokens.access_token);
    const refreshInMs = expiresInMs <= 0 ? 0 : Math.max(Math.floor(expiresInMs * 0.75), 5000);

    refreshTimerRef.current = setTimeout(() => {
      void refreshSessionRef.current();
    }, refreshInMs);
  }, [auth, clearRefreshTimer]);

  const refreshSession = useCallback(async (): Promise<void> => {
    try {
      await auth.refreshSession();
      await syncUserState();
      setError(null);
      scheduleBackgroundRefresh();
    } catch (refreshError: unknown) {
      await clearAllSecureStore();
      clearRefreshTimer();
      setIsAuthenticated(false);
      setUser(null);
      setError(refreshError instanceof Error ? refreshError.message : "Session refresh failed");
    }
  }, [auth, clearRefreshTimer, scheduleBackgroundRefresh, syncUserState]);

  useEffect(() => {
    refreshSessionRef.current = refreshSession;
  }, [refreshSession]);

  useEffect(() => {
    let aborted = false;

    const unsubscribe = auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "SESSION_EXPIRED") {
        clearRefreshTimer();
        setIsAuthenticated(false);
        setUser(null);
        setError(null);
        void clearAllSecureStore();
        return;
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        void syncUserState().finally(() => {
          scheduleBackgroundRefresh();
        });
      }
    });

    const init = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        await hydrateSecureStorageMemory();
        const storedTokens = await readTokenResponse();

        if (!storedTokens) {
          setIsAuthenticated(false);
          setUser(null);
          return;
        }

        if (auth.isAuthenticated()) {
          await syncUserState();
          scheduleBackgroundRefresh();
          return;
        }

        if (storedTokens.refresh_token) {
          await refreshSession();
          return;
        }

        await clearAllSecureStore();
        setIsAuthenticated(false);
        setUser(null);
      } catch (initError: unknown) {
        if (!aborted) {
          setError(initError instanceof Error ? initError.message : "Failed to initialize auth");
          setIsAuthenticated(false);
          setUser(null);
        }
      } finally {
        if (!aborted) {
          setIsLoading(false);
        }
      }
    };

    void init();

    return () => {
      aborted = true;
      unsubscribe();
      clearRefreshTimer();
      auth.destroy();
    };
  }, [auth, clearRefreshTimer, refreshSession, scheduleBackgroundRefresh, syncUserState]);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginWithPasswordResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await auth.loginWithPassword(email, password);
        if (isMFARequiredResult(result)) {
          await setChallengeToken(result.mfaToken);
          return result;
        }

        await clearChallengeToken();
        await persistUser(result as HelloJohnUser);
        setUser(result as HelloJohnUser);
        setIsAuthenticated(true);
        scheduleBackgroundRefresh();
        return result;
      } catch (loginError: unknown) {
        setError(loginError instanceof Error ? loginError.message : "Login failed");
        throw loginError;
      } finally {
        setIsLoading(false);
      }
    },
    [auth, scheduleBackgroundRefresh]
  );

  const applyPKCEResult = useCallback(
    async (result: {
      accessToken: string;
      refreshToken?: string;
      idToken?: string;
      tokenType: string;
      scope: string;
      expiresIn: number;
      user: Record<string, unknown>;
    }): Promise<void> => {
      const tokenResponse: TokenResponse = {
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        id_token: result.idToken,
        token_type: result.tokenType,
        scope: result.scope,
        expires_in: result.expiresIn
      };

      const normalizedUser = toHelloJohnUser(result.user);

      await writeTokenResponse(tokenResponse);
      await clearChallengeToken();
      await persistUser(normalizedUser);

      setError(null);
      setIsAuthenticated(true);
      setUser(normalizedUser);
      scheduleBackgroundRefresh();
    },
    [scheduleBackgroundRefresh]
  );

  const logout = useCallback(async (): Promise<void> => {
    clearRefreshTimer();
    try {
      await auth.revokeToken();
    } catch {
      // Local cleanup still happens below.
    }
    await clearAllSecureStore();
    setError(null);
    setIsAuthenticated(false);
    setUser(null);
  }, [auth, clearRefreshTimer]);

  const contextValue: AuthContextValue = {
    isAuthenticated,
    user,
    isLoading,
    error,
    domain,
    clientId,
    tenantId,
    redirectScheme,
    redirectUri: resolvedRedirectUri,
    login,
    logout,
    refreshSession,
    applyPKCEResult,
    auth
  };

  return <HelloJohnContext.Provider value={contextValue}>{children}</HelloJohnContext.Provider>;
}

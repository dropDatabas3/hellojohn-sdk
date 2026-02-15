import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode } from "react";
import { AuthClient, createHelloJohn, User, AuthConfig, LoginOptions, RegisterOptions, HelloJohnError } from "@hellojohn/js";
import { I18nProvider, type Locale, type DeepPartial } from "./i18n";
import { AuthError } from "./components/AuthError";
import {
    DEFAULT_ROUTES,
    RoutingProvider,
    type AuthRoutes,
    type NavigateFn,
    type IntegrationMode,
    normalizeAuthBasePath,
    resolveAllowedRedirects,
} from "./routing";
import type { ThemeName } from "./lib/themes";

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: User | null;
    config: AuthConfig | null;
    client: AuthClient | null;
    error: string | null;
    /** The active theme name from the provider */
    theme: ThemeName;
    /** Integration mode primitive for upcoming quick-mode support */
    integrationMode: IntegrationMode;
    /** Base auth path primitive for upcoming quick-mode support */
    authBasePath: string;
    /** Sanitized internal redirect allowlist */
    allowedRedirects: string[];

    // Actions
    login: (opts?: LoginOptions) => Promise<void>;
    loginWithCredentials: (email: string, pass: string) => Promise<void>;
    loginWithSocialProvider: (provider: string) => Promise<void>;
    register: (opts: RegisterOptions) => Promise<any>;
    logout: (returnTo?: string) => void;
    completeProfile: (fields: Record<string, string>) => Promise<void>;

    // Profile completion (post-social)
    needsProfileCompletion: boolean;

    // RBAC
    hasRole: (role: string) => boolean;
    hasPermission: (perm: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface AuthProviderProps {
    children: ReactNode;
    domain: string;
    clientID: string;
    tenantID?: string;
    /**
     * OAuth redirect URI. Default: auto-detected from `window.location.origin` + callback route.
     * Only override this if your callback lives on a different origin.
     */
    redirectURI?: string;
    /** Locale: 'en' | 'es' | custom Locale object. Default: 'en' */
    locale?: string | Locale;
    /** Partial overrides for locale strings */
    localeOverrides?: DeepPartial<Locale>;
    /** Theme for pre-built components (AuthError, etc.). Default: 'minimal' */
    theme?: ThemeName;
    /** Custom handler for auth errors. If provided, AuthError component is NOT rendered automatically. */
    onAuthError?: (error: string) => void;
    /**
     * Route paths for auth pages. Merged with mode-appropriate defaults.
     *
     * - In **quick mode**: defaults are auto-prefixed with `authBasePath` (e.g. `/auth/login`).
     *   You only need to override `afterLogin` / `afterLogout` if they differ from `/` and `/auth/login`.
     * - In **advanced mode**: defaults are root-level (e.g. `/login`).
     *
     * Any explicit value you provide always wins over the computed default.
     */
    routes?: Partial<AuthRoutes>;
    /** Navigation function for SPA routing. Default: window.location.href. Pass router.push for SPA nav. */
    navigate?: NavigateFn;
    /** Integration mode. Default: "advanced" (backward compatible). */
    mode?: IntegrationMode;
    /**
     * Base auth path for quick mode. Default: "/auth".
     * In quick mode, all auth routes are auto-prefixed under this path.
     * Pass a custom value (e.g. "/cuenta") to change the prefix.
     * Ignored in advanced mode.
     */
    authBasePath?: string;
    /**
     * Explicit internal redirect allowlist (sanitized).
     * In quick mode this is auto-computed from routes + authBasePath — you rarely need to set it.
     * Any paths you provide here are *merged* with the auto-computed list.
     */
    allowedRedirects?: string[];
}

export function AuthProvider({
    children,
    domain,
    clientID,
    tenantID,
    redirectURI,
    locale,
    localeOverrides,
    theme = "minimal",
    onAuthError,
    routes,
    navigate,
    mode = "advanced",
    authBasePath,
    allowedRedirects,
}: AuthProviderProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [config, setConfig] = useState<AuthConfig | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [errorCode, setErrorCode] = useState<string | null>(null);
    const [errorFlow, setErrorFlow] = useState<string | null>(null);
    const integrationMode: IntegrationMode = mode === "quick" ? "quick" : "advanced";

    // --- Quick mode: resolve authBasePath and auto-prefix routes ---
    const resolvedAuthBasePath = useMemo(
        () => normalizeAuthBasePath(authBasePath),
        [authBasePath]
    );

    // In quick mode, routes default to {authBasePath}/login, etc.
    // In advanced mode, routes default to /login, etc. (backward compatible).
    // Consumer-provided routes always win.
    const effectiveRoutes: Partial<AuthRoutes> = useMemo(() => {
        if (integrationMode === "quick") {
            const bp = resolvedAuthBasePath;
            const quickDefaults: AuthRoutes = {
                login: `${bp}/login`,
                register: `${bp}/register`,
                forgotPassword: `${bp}/forgot-password`,
                resetPassword: `${bp}/reset-password`,
                callback: `${bp}/callback`,
                afterLogin: "/",
                afterLogout: `${bp}/login`,
            };
            // Merge: consumer overrides on top of quick defaults
            return { ...quickDefaults, ...routes };
        }
        return routes || {};
    }, [integrationMode, resolvedAuthBasePath, routes]);

    // Auto-compute allowed redirects from effective routes + authBasePath.
    // Consumer-provided extras are merged in.
    const resolvedAllowedRedirects = useMemo(() => {
        const merged = { ...DEFAULT_ROUTES, ...effectiveRoutes };
        return resolveAllowedRedirects([
            ...(allowedRedirects || []),
            merged.afterLogin,
            merged.afterLogout,
            merged.login,
            merged.register,
            merged.forgotPassword,
            merged.resetPassword,
            merged.callback,
            resolvedAuthBasePath,
        ]);
    }, [allowedRedirects, effectiveRoutes, resolvedAuthBasePath]);

    // --- Resolve redirectURI internally (SSR-safe) ---
    const resolvedRedirectURI = useMemo(() => {
        if (redirectURI) return redirectURI;
        if (typeof window === "undefined") return undefined;
        const merged = { ...DEFAULT_ROUTES, ...effectiveRoutes };
        return `${window.location.origin}${merged.callback}`;
    }, [redirectURI, effectiveRoutes]);

    // Initialize Client
    const client = useMemo(() => {
        if (typeof window === "undefined") return null;
        return createHelloJohn({
            domain,
            clientID,
            tenantID,
            redirectURI: resolvedRedirectURI || window.location.origin,
        });
    }, [domain, clientID, tenantID, resolvedRedirectURI]);

    useEffect(() => {
        if (!client) return;

        // Store domain globally for byeJohn helper
        if (typeof window !== "undefined") {
            (window as any).__HELLOJOHN_DOMAIN__ = domain;
        }

        const init = async () => {
            try {
                // 1. Load Config (parallelizable with user check)
                const cfg = await client.getTenantConfig().catch(e => {
                    console.error("Failed to load tenant config", e);
                    return null;
                });
                setConfig(cfg);

                // 2. Check for Callback FIRST (Prioritize new login attempt)
                const hasCodeParam = window.location.search.includes("code=");
                const hasErrorParam = window.location.search.includes("error=");

                if (hasCodeParam || (hasErrorParam && client.isSocialCallback())) {
                    // Force clear any stale session to ensuring clean login
                    if (client.isAuthenticated()) {
                        console.warn("Found callback params but session exists. Clearing stale session.");
                        client.logout();
                    }

                    // Check if this is a social callback (success with code, or error redirect)
                    if (client.isSocialCallback()) {
                        // Social login callback - exchange login_code for tokens (or handle error)
                        try {
                            await client.handleSocialCallback();
                        } catch (err: any) {
                            console.error("Social callback failed", err);
                            const errorMsg = err.message || "Social login failed";
                            const errCode = err.code || err.error || undefined;
                            setError(errorMsg);
                            setErrorCode(errCode);
                            setErrorFlow("social");
                            setIsLoading(false);
                            // Clean URL
                            window.history.replaceState({}, document.title, window.location.pathname);
                            // Notify custom handler if provided
                            if (onAuthError) {
                                onAuthError(errorMsg);
                            }
                            return;
                        }
                    } else {
                        // PKCE callback - standard OAuth2 flow
                        await client.handleRedirectCallback();
                    }

                    // Try to get user profile, but don't logout if it fails immediately after callback
                    // (the token might need a moment to propagate)
                    try {
                        const profile = await client.getUser();
                        if (profile) {
                            setUser(profile);
                            setIsAuthenticated(true);
                            // Clean URL
                            window.history.replaceState({}, document.title, window.location.pathname);
                        } else {
                            // If getUser returns null, user is still authenticated (tokens are saved)
                            // but profile fetch failed - mark as authenticated anyway
                            console.warn("Profile fetch returned null after callback, but tokens are saved");
                            setIsAuthenticated(true);
                        }
                    } catch (err) {
                        // Don't logout on error right after callback - tokens are already saved
                        console.warn("Profile fetch failed after callback, but user is authenticated", err);
                        setIsAuthenticated(true);
                    }
                } else if (client.isAuthenticated()) {
                    // 3. Normal Session Check (No callback)
                    try {
                        const profile = await client.getUser();
                        if (profile) {
                            setUser(profile);
                            setIsAuthenticated(true);
                        }
                    } catch (err: any) {
                        console.warn("Token appears invalid, clearing session", err);
                        client.logout();
                        setIsAuthenticated(false);
                        setUser(null);
                    }
                }
            } catch (e) {
                console.error("Auth init error", e);
                // If we hit a fatal error during init, ensure we don't leave stale state if possible
            } finally {
                setIsLoading(false);
            }
        };

        // Avoid double-init in StrictMode
        init();
    }, [client]);

    const login = async (opts?: LoginOptions) => {
        if (!client) return;
        return client.loginWithRedirect(opts);
    };

    const loginWithCredentials = async (email: string, pass: string) => {
        if (!client) return;
        const u = await client.loginWithCredentials(email, pass);
        setUser(u);
        setIsAuthenticated(true);
    };

    const register = async (opts: RegisterOptions) => {
        if (!client) return;
        try {
            return await client.register(opts);
        } catch (err: any) {
            // Server errors (5xx) → show full-page AuthError
            const isServerError = (err instanceof HelloJohnError && err.statusCode && err.statusCode >= 500)
                || (err.code === "INTERNAL_SERVER_ERROR");
            if (isServerError) {
                const errorMsg = err.message || "Server error";
                const errCode = err.code || "server_error";
                setError(errorMsg);
                setErrorCode(errCode);
                setErrorFlow("register");
                if (onAuthError) onAuthError(errorMsg);
                return;
            }
            // Validation errors (4xx) → re-throw for inline handling in SignUp/SignIn
            throw err;
        }
    };

    const logout = (returnTo?: string) => {
        if (!client) return;
        // Optimistic local state clear so UI updates immediately even before navigation.
        setIsAuthenticated(false);
        setUser(null);
        setError(null);
        const merged = { ...DEFAULT_ROUTES, ...effectiveRoutes };
        client.logout(returnTo || merged.afterLogout);
    };

    const loginWithSocialProvider = async (provider: string) => {
        if (!client) return;
        try {
            setError(null);
            setErrorCode(null);
            setErrorFlow(null);
            await client.loginWithSocialProvider(provider);
        } catch (err: any) {
            const errorMsg = err?.message || "Social login failed";
            const errCode = err?.code || err?.error || "social_start_failed";
            setError(errorMsg);
            setErrorCode(errCode);
            setErrorFlow("social");
            if (onAuthError) onAuthError(errorMsg);
        }
    };

    const hasRole = (role: string): boolean => {
        if (!user || !user.custom) return false;
        // Look for /claims/sys
        for (const k in user.custom) {
            if (k.endsWith("/claims/sys")) {
                const sys = user.custom[k];
                if (sys.is_admin && role === "admin") return true;
                if (Array.isArray(sys.roles) && sys.roles.includes(role)) return true;
            }
        }
        return false;
    };

    const hasPermission = (perm: string): boolean => {
        if (!user || !user.custom) return false;
        for (const k in user.custom) {
            if (k.endsWith("/claims/sys")) {
                const sys = user.custom[k];
                // Admins often have all perms, but explicit check:
                if (Array.isArray(sys.perms) && sys.perms.includes(perm)) return true;
            }
        }
        return false;
    };

    // Check if user needs to complete profile (missing required custom fields)
    const needsProfileCompletion = (() => {
        if (!isAuthenticated || !user || !config?.custom_fields) return false;

        // Normalize user fields keys to lowercase for comparison
        const userFieldsLower: Record<string, any> = {};
        if (user.custom_fields) {
            Object.keys(user.custom_fields).forEach(k => {
                userFieldsLower[k.toLowerCase()] = user.custom_fields![k];
            });
        }

        for (const field of config.custom_fields) {
            if (field.required) {
                // Check exact match first, then lowercase match
                const val = user.custom_fields?.[field.name] || userFieldsLower[field.name.toLowerCase()];
                if (!val || val === "") return true;
            }
        }
        return false;
    })();

    // Complete profile with missing custom fields
    const completeProfile = async (fields: Record<string, string>): Promise<void> => {
        if (!client) throw new Error("Client not initialized");
        await client.completeProfile(fields);
        // Refresh user data
        const updatedUser = await client.getUser();
        if (updatedUser) setUser(updatedUser);
    };

    return (
        <AuthContext.Provider value={{
            isAuthenticated, isLoading, user, config, client,
            login, loginWithCredentials, loginWithSocialProvider, register, logout,
            completeProfile, needsProfileCompletion,
            hasRole, hasPermission, error, theme,
            integrationMode,
            authBasePath: resolvedAuthBasePath,
            allowedRedirects: resolvedAllowedRedirects,
        }}>
            <RoutingProvider routes={effectiveRoutes} navigate={navigate}>
                <I18nProvider locale={locale} overrides={localeOverrides}>
                    {error && !onAuthError ? (
                        <AuthError
                            error={error}
                            errorCode={errorCode || undefined}
                            errorFlow={errorFlow || undefined}
                            theme={theme}
                            onRetry={() => {
                                setError(null);
                                setErrorCode(null);
                                setErrorFlow(null);
                                if (typeof window !== "undefined") {
                                    window.location.href = "/";
                                }
                            }}
                        />
                    ) : children}
                </I18nProvider>
            </RoutingProvider>
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}

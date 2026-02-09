import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode } from "react";
import { AuthClient, createHelloJohn, User, AuthConfig, LoginOptions, RegisterOptions } from "@hellojohn/js";
import { I18nProvider, type Locale, type DeepPartial } from "./i18n";

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: User | null;
    config: AuthConfig | null;
    client: AuthClient | null;

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
    redirectURI?: string;
    /** Locale: 'en' | 'es' | custom Locale object. Default: 'en' */
    locale?: string | Locale;
    /** Partial overrides for locale strings */
    localeOverrides?: DeepPartial<Locale>;
}

export function AuthProvider({ children, domain, clientID, tenantID, redirectURI, locale, localeOverrides }: AuthProviderProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [config, setConfig] = useState<AuthConfig | null>(null);

    // Initialize Client
    const client = useMemo(() => {
        if (typeof window === "undefined") {
            // console.log("[AuthProvider] SSR: client is null");
            return null;
        }
        console.log("[AuthProvider] Creating AuthClient", { domain, clientID });
        return createHelloJohn({
            domain,
            clientID,
            tenantID,
            redirectURI: redirectURI || window.location.origin
        });
    }, [domain, clientID, tenantID, redirectURI]);

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
                if (window.location.search.includes("code=")) {
                    // Force clear any stale session to ensuring clean login
                    if (client.isAuthenticated()) {
                        console.warn("Found 'code' param but session exists. Clearing stale session.");
                        client.logout();
                    }

                    // Check if this is a social callback or PKCE callback
                    if (client.isSocialCallback()) {
                        // Social login callback - exchange login_code for tokens
                        await client.handleSocialCallback();
                    } else {
                        // PKCE callback - standard OAuth2 flow
                        await client.handleRedirectCallback();
                    }
                    const profile = await client.getUser();
                    if (profile) {
                        setUser(profile);
                        setIsAuthenticated(true);
                        // Clean URL
                        window.history.replaceState({}, document.title, window.location.pathname);
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
        return client.register(opts);
    };

    const logout = (returnTo?: string) => {
        if (!client) return;
        client.logout(returnTo);
    };

    const loginWithSocialProvider = async (provider: string) => {
        if (!client) return;
        await client.loginWithSocialProvider(provider);
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

                // Debug log
                console.log(`[SDK] Checking field '${field.name}' (required):`, {
                    val,
                    foundInLower: userFieldsLower[field.name.toLowerCase()],
                    allLowerKeys: Object.keys(userFieldsLower)
                });

                if (!val || val === "") {
                    console.log(`[SDK] Missing required field: ${field.name}`);
                    return true;
                }
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
            hasRole, hasPermission
        }}>
            <I18nProvider locale={locale} overrides={localeOverrides}>
                {children}
            </I18nProvider>
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}

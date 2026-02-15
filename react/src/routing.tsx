import React, { createContext, useContext, useMemo } from "react";

// --- Route Configuration ---

export interface AuthRoutes {
    /** Login page path. Default: "/login" */
    login: string;
    /** Register page path. Default: "/register" */
    register: string;
    /** Forgot password page path. Default: "/forgot-password" */
    forgotPassword: string;
    /** Reset password page path. Default: "/reset-password" */
    resetPassword: string;
    /** OAuth callback page path. Default: "/callback" */
    callback: string;
    /** Where to redirect after successful login. Default: "/" */
    afterLogin: string;
    /** Where to redirect after logout. Default: "/login" */
    afterLogout: string;
}

export const DEFAULT_ROUTES: AuthRoutes = {
    login: "/login",
    register: "/register",
    forgotPassword: "/forgot-password",
    resetPassword: "/reset-password",
    callback: "/callback",
    afterLogin: "/",
    afterLogout: "/login",
};

// --- Integration Mode (phase 1 primitives) ---

export type IntegrationMode = "advanced" | "quick";

/** Base path used by quick mode routing. */
export const DEFAULT_AUTH_BASE_PATH = "/auth";

/** Conservative baseline to avoid open redirect footguns. */
export const DEFAULT_ALLOWED_REDIRECTS = ["/"];

const HAS_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

/**
 * Normalizes and validates an internal app path.
 * Rejects absolute URLs, protocol-relative URLs, and malformed values.
 */
export function normalizeInternalPath(path?: string | null): string | null {
    if (!path) return null;
    const trimmed = path.trim();
    if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//") || HAS_SCHEME.test(trimmed)) {
        return null;
    }

    try {
        const parsed = new URL(trimmed, "https://sdk.local");
        if (parsed.origin !== "https://sdk.local") return null;
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
        return null;
    }
}

/** Normalizes auth base path with a secure default. */
export function normalizeAuthBasePath(path?: string): string {
    const normalized = normalizeInternalPath(path);
    if (!normalized) return DEFAULT_AUTH_BASE_PATH;

    const pathname = normalized.split("?")[0].split("#")[0] || DEFAULT_AUTH_BASE_PATH;
    if (pathname === "/") return DEFAULT_AUTH_BASE_PATH;
    return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

/**
 * Deduplicates and sanitizes internal redirect allowlist.
 * If nothing valid is provided, returns DEFAULT_ALLOWED_REDIRECTS.
 */
export function resolveAllowedRedirects(
    paths: Array<string | null | undefined>,
    fallback: string[] = DEFAULT_ALLOWED_REDIRECTS
): string[] {
    const seen = new Set<string>();

    for (const entry of paths) {
        const normalized = normalizeInternalPath(entry);
        if (normalized) seen.add(normalized);
    }

    if (seen.size === 0) {
        for (const entry of fallback) {
            const normalized = normalizeInternalPath(entry);
            if (normalized) seen.add(normalized);
        }
    }

    if (seen.size === 0) {
        seen.add("/");
    }

    return Array.from(seen);
}

/** Checks if redirect target is present in the allowlist after normalization. */
export function isAllowedRedirectPath(path: string, allowedRedirects: string[]): boolean {
    const normalized = normalizeInternalPath(path);
    return !!normalized && allowedRedirects.includes(normalized);
}

// --- Navigation Function ---

export type NavigateFn = (path: string) => void;

const defaultNavigate: NavigateFn = (path: string) => {
    if (typeof window !== "undefined") {
        window.location.href = path;
    }
};

// --- Contexts ---

const RoutesContext = createContext<AuthRoutes>(DEFAULT_ROUTES);
const NavigateContext = createContext<NavigateFn>(defaultNavigate);

// --- Provider (used internally by AuthProvider) ---

export interface RoutingProviderProps {
    routes?: Partial<AuthRoutes>;
    navigate?: NavigateFn;
    children: React.ReactNode;
}

export function RoutingProvider({ routes, navigate, children }: RoutingProviderProps) {
    const mergedRoutes = useMemo(
        () => ({ ...DEFAULT_ROUTES, ...routes }),
        [routes]
    );
    const nav = navigate || defaultNavigate;

    return (
        <RoutesContext.Provider value={mergedRoutes}>
            <NavigateContext.Provider value={nav}>
                {children}
            </NavigateContext.Provider>
        </RoutesContext.Provider>
    );
}

// --- Hooks ---

/** Read configured auth routes */
export function useRoutes(): AuthRoutes {
    return useContext(RoutesContext);
}

/** Get the navigation function (SPA-aware if consumer provided router.push) */
export function useHJNavigate(): NavigateFn {
    return useContext(NavigateContext);
}

/**
 * Framework-agnostic URL search param extraction.
 * Returns the value of the given key from the current URL's query string.
 */
export function useSearchParam(key: string): string | null {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get(key);
}


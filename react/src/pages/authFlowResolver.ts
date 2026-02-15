import { normalizeAuthBasePath } from "../routing";

export const AUTH_FLOW_VALUES = [
    "login",
    "register",
    "forgot-password",
    "reset-password",
    "callback",
] as const;

export type AuthFlow = typeof AUTH_FLOW_VALUES[number];

const FLOW_ALIASES: Record<string, AuthFlow> = {
    login: "login",
    signin: "login",
    "sign-in": "login",
    register: "register",
    signup: "register",
    "sign-up": "register",
    forgot: "forgot-password",
    forgotpassword: "forgot-password",
    "forgot-password": "forgot-password",
    reset: "reset-password",
    resetpassword: "reset-password",
    "reset-password": "reset-password",
    callback: "callback",
    "auth-callback": "callback",
};

function normalizeFlow(raw?: string | null): AuthFlow | null {
    if (!raw) return null;
    const normalized = raw.trim().toLowerCase();
    return FLOW_ALIASES[normalized] || null;
}

export function extractFlowFromPathname(pathname: string | null | undefined, basePath: string): AuthFlow | null {
    if (!pathname) return null;

    const resolvedBasePath = normalizeAuthBasePath(basePath);
    const cleanPathname = pathname.split("?")[0].split("#")[0];

    const pathSegments = cleanPathname.split("/").filter(Boolean);
    const baseSegments = resolvedBasePath.split("/").filter(Boolean);

    if (baseSegments.length === 0) {
        return normalizeFlow(pathSegments[0] || null);
    }

    if (pathSegments.length <= baseSegments.length) {
        return null;
    }

    for (let i = 0; i < baseSegments.length; i++) {
        if (pathSegments[i] !== baseSegments[i]) {
            return null;
        }
    }

    return normalizeFlow(pathSegments[baseSegments.length] || null);
}

export function extractFlowFromSearch(search: string | null | undefined): AuthFlow | null {
    if (!search) return null;

    const query = search.startsWith("?") ? search.slice(1) : search;
    const params = new URLSearchParams(query);

    return normalizeFlow(params.get("flow"));
}

export interface ResolveAuthFlowInput {
    flow?: string | null;
    fallbackFlow?: string | null;
    pathname?: string | null;
    search?: string | null;
    basePath: string;
}

/**
 * Resolves auth flow in this order:
 * 1) explicit prop `flow`
 * 2) URL path segment under `basePath` (e.g. /auth/register)
 * 3) query param `?flow=...`
 * 4) fallbackFlow (or login if invalid/missing)
 */
export function resolveAuthFlow(input: ResolveAuthFlowInput): AuthFlow {
    const explicit = normalizeFlow(input.flow);
    if (explicit) return explicit;

    const fromPath = extractFlowFromPathname(input.pathname, input.basePath);
    if (fromPath) return fromPath;

    const fromSearch = extractFlowFromSearch(input.search);
    if (fromSearch) return fromSearch;

    return normalizeFlow(input.fallbackFlow) || "login";
}


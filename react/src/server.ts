/**
 * Server-side utilities for HelloJohn React SDK.
 * Use these in Next.js App Router server components, route handlers, and middleware.
 *
 * @example
 * // In a Next.js server component or route handler:
 * import { createServerClient } from '@hellojohn/react/server'
 * import { cookies } from 'next/headers'
 *
 * const hj = createServerClient({
 *   domain: 'https://auth.example.com',
 *   cookies: cookies(),
 * })
 *
 * const session = hj.getSession()
 * if (session) {
 *   console.log('User:', session.user)
 * }
 */

export interface ServerClientConfig {
    /** HelloJohn server domain */
    domain: string;
    /** Cookie store (from next/headers cookies()) or plain object */
    cookies: CookieStore;
}

interface CookieStore {
    get(name: string): { value: string } | undefined;
}

export interface ServerSession {
    accessToken: string;
    user: {
        sub: string;
        [key: string]: any;
    };
}

export interface ServerClient {
    /** Get the current session from cookies, or null if not authenticated */
    getSession(): ServerSession | null;
    /** Get the access token from cookies, or null */
    getAccessToken(): string | null;
}

/**
 * Creates a server-side HelloJohn client for use in Next.js App Router.
 *
 * Reads auth tokens from cookies set by the browser SDK.
 * Does NOT perform token verification — use the Node.js SDK
 * (`@hellojohn/node`) for JWT verification on the server.
 */
export function createServerClient(config: ServerClientConfig): ServerClient {
    const { cookies } = config;

    const getAccessToken = (): string | null => {
        const cookie = cookies.get("hj:token");
        return cookie?.value ?? null;
    };

    const getSession = (): ServerSession | null => {
        const token = getAccessToken();
        if (!token) return null;

        try {
            // Decode JWT payload (no verification — use @hellojohn/node for that)
            const parts = token.split(".");
            if (parts.length !== 3) return null;

            // Base64url decode without Node.js Buffer dependency
            const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
            const decoded = typeof globalThis.atob === "function"
                ? globalThis.atob(b64)
                : (() => { throw new Error("atob not available"); })();
            const payload = JSON.parse(decoded);

            return {
                accessToken: token,
                user: payload,
            };
        } catch {
            return null;
        }
    };

    return {
        getSession,
        getAccessToken,
    };
}

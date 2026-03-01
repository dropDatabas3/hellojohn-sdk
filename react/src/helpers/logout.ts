/**
 * Simple logout function - just call byeJohn() and you're out!
 * Clears local tokens and reloads the page after logout.
 */
const ROUTES = {
    CSRF: "/v2/csrf",
    AUTH_LOGOUT: "/v2/auth/logout",
} as const

export function byeJohn(returnTo?: string): void {
    if (typeof window !== "undefined") {
        // Clear all HelloJohn tokens
        localStorage.removeItem("hj:token");
        sessionStorage.removeItem("hj:verifier");
        sessionStorage.removeItem("hj:state");
        sessionStorage.removeItem("hj:nonce");

        // Get domain from current config or use default
        const domain = (window as any).__HELLOJOHN_DOMAIN__ || "http://localhost:8080";
        const redirectUrl = returnTo || window.location.origin;

        void (async () => {
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
            }

            try {
                const csrfResp = await fetch(`${domain}${ROUTES.CSRF}`, {
                    method: "GET",
                    credentials: "include",
                })
                if (csrfResp.ok) {
                    const body = await csrfResp.json().catch(() => null) as { csrf_token?: string; csrfToken?: string } | null
                    const csrfToken = body?.csrf_token || body?.csrfToken
                    if (csrfToken) {
                        headers["X-CSRF-Token"] = csrfToken
                    }
                }
            } catch {
                // Continue without CSRF header; server decides fallback policy.
            }

            try {
                await fetch(`${domain}${ROUTES.AUTH_LOGOUT}`, {
                    method: "POST",
                    credentials: "include",
                    headers,
                    body: JSON.stringify({
                        post_logout_redirect_uri: redirectUrl,
                    }),
                })
            } finally {
                // Reload the page to clear any React state
                window.location.href = redirectUrl
            }
        })()
    }
}

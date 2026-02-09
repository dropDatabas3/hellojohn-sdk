/**
 * Simple logout function - just call byeJohn() and you're out!
 * Clears local tokens and reloads the page after logout.
 */
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

        // Use fetch to call logout endpoint, then reload
        fetch(`${domain}/v2/session/logout`, {
            method: "POST",
            credentials: "include"
        }).finally(() => {
            // Reload the page to clear any React state
            window.location.href = redirectUrl;
        });
    }
}

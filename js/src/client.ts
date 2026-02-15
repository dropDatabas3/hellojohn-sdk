import { generateCodeChallenge, generateCodeVerifier, generateState } from "./pkce"
import { AuthClientOptions, LoginOptions, TokenResponse, User, RegisterOptions, RegisterResponse, AuthConfig } from "./types"
import { StorageAdapter, localStorageAdapter } from "./storage"
import { AuthEventEmitter, AuthEvent, AuthSession, AuthEventCallback } from "./event-emitter"
import { TokenManager } from "./token-manager"
import { MFAClient, createMFAClient } from "./mfa"
import { createFetchWrapper } from "./fetch-wrapper"
import { decodeJWTPayload } from "./jwt"
import { parseAPIError, MFARequiredError, NetworkError, HelloJohnError } from "./errors"

const CACHE_KEY_VERIFIER = "hj:verifier"
const CACHE_KEY_STATE = "hj:state"
const CACHE_KEY_NONCE = "hj:nonce"

type SocialStartErrorBody = {
    code?: string
    error?: string
    message?: string
    error_description?: string
    detail?: string
}

function parseSocialStartError(status: number, body: SocialStartErrorBody): HelloJohnError {
    const rawCode = body.code || body.error || "social_start_failed"
    const code = typeof rawCode === "string" ? rawCode : "social_start_failed"
    const lowerCode = code.toLowerCase()

    const rawMessage = body.error_description || body.message || body.detail || "Social login could not be started"
    const message = typeof rawMessage === "string" && rawMessage.trim()
        ? rawMessage.trim()
        : "Social login could not be started"

    const detail = typeof body.detail === "string" ? body.detail.toLowerCase() : ""
    const lowerMessage = message.toLowerCase()
    const redirectIssue = lowerCode === "redirect_uri_not_allowed"
        || lowerCode === "invalid_redirect_uri"
        || (lowerCode === "internal_server_error" && detail.includes("redirect_uri"))
        || detail.includes("redirect_uri")
        || lowerMessage.includes("redirect_uri not allowed")
        || lowerMessage.includes("redirect uri not allowed")

    if (redirectIssue) {
        return new HelloJohnError(
            "La URL de callback no esta permitida para este cliente. Configura redirect_uris y vuelve a intentar.",
            "redirect_uri_not_allowed",
            status,
        )
    }

    return new HelloJohnError(message, code, status)
}

export class AuthClient {
    private domain: string
    private clientID: string
    private redirectURI: string
    private scope: string
    private tenantID?: string
    private cachedConfig?: AuthConfig
    private storage: StorageAdapter
    private emitter: AuthEventEmitter
    private tokenManager: TokenManager

    /** MFA operations (enroll, verify, challenge, disable, recovery) */
    public mfa: MFAClient

    constructor(options: AuthClientOptions) {
        this.domain = options.domain.replace(/\/$/, "")
        this.clientID = options.clientID
        this.redirectURI = options.redirectURI || (typeof window !== "undefined" ? window.location.origin + "/callback" : "")
        this.scope = options.scope || "openid profile email"
        this.tenantID = options.tenantID
        this.storage = options.storage || localStorageAdapter

        this.emitter = new AuthEventEmitter()
        this.tokenManager = new TokenManager({
            domain: this.domain,
            clientId: this.clientID,
            storage: this.storage,
            emitter: this.emitter,
            autoRefresh: options.autoRefresh !== false,
        })

        // Initialize token lifecycle (schedule refresh for existing tokens)
        this.tokenManager.initialize()

        // MFA sub-client
        this.mfa = createMFAClient(this.domain, () => this.getAccessToken())
    }

    // --- Event System ---

    /**
     * Subscribe to auth state changes.
     * Fires on: SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, SESSION_EXPIRED, USER_UPDATED, MFA_REQUIRED
     * Returns an unsubscribe function.
     */
    onAuthStateChange(callback: AuthEventCallback): () => void {
        return this.emitter.on(callback)
    }

    // --- Token Access ---

    /**
     * Get a valid access token. Refreshes automatically if expired.
     * Throws if no session exists.
     */
    async getAccessToken(): Promise<string> {
        return this.tokenManager.getAccessToken()
    }

    /** Get the stored token set (may be expired) */
    getStoredTokens(): TokenResponse | null {
        return this.tokenManager.getStoredTokens()
    }

    /** Force a token refresh */
    async refreshSession(): Promise<void> {
        await this.tokenManager.refreshSession()
    }

    // --- Authentication Check ---

    /** Check if user is authenticated (has a non-expired access token) */
    isAuthenticated(): boolean {
        return this.tokenManager.isAuthenticated()
    }

    // --- Tenant Config ---

    async getTenantConfig(): Promise<AuthConfig> {
        if (this.cachedConfig) {
            return this.cachedConfig
        }

        const url = new URL(`${this.domain}/v2/auth/config`)
        url.searchParams.set("client_id", this.clientID)

        const resp = await fetch(url.toString())
        if (!resp.ok) {
            throw new Error("Failed to load tenant config")
        }
        this.cachedConfig = await resp.json()
        return this.cachedConfig!
    }

    // --- OAuth2 PKCE Flow ---

    async loginWithRedirect(options?: LoginOptions): Promise<void> {
        const verifier = await generateCodeVerifier()
        const challenge = await generateCodeChallenge(verifier)
        const state = generateState()
        const nonce = generateState()

        sessionStorage.setItem(CACHE_KEY_VERIFIER, verifier)
        sessionStorage.setItem(CACHE_KEY_STATE, state)
        sessionStorage.setItem(CACHE_KEY_NONCE, nonce)

        const params = new URLSearchParams({
            response_type: "code",
            client_id: this.clientID,
            redirect_uri: this.redirectURI,
            scope: options?.scope || this.scope,
            state: state,
            nonce: nonce,
            code_challenge: challenge,
            code_challenge_method: "S256",
        })

        window.location.assign(`${this.domain}/oauth2/authorize?${params.toString()}`)
    }

    async handleRedirectCallback(url = window.location.href): Promise<void> {
        const searchParams = new URL(url).searchParams
        const code = searchParams.get("code")
        const state = searchParams.get("state")
        const error = searchParams.get("error")

        if (error) {
            throw new Error(`Auth Error: ${error} - ${searchParams.get("error_description")}`)
        }

        const storedState = sessionStorage.getItem(CACHE_KEY_STATE)
        const storedVerifier = sessionStorage.getItem(CACHE_KEY_VERIFIER)

        // Idempotency check for React StrictMode
        if (!code) {
            throw new Error("No code found in URL")
        }
        if (!storedVerifier) {
            if (this.isAuthenticated()) {
                try {
                    window.history.replaceState({}, document.title, window.location.pathname)
                } catch { }
                return
            }
            throw new Error("No PKCE verifier found. (storedVerifier is null)")
        }
        if (state !== storedState) {
            throw new Error("Invalid state")
        }

        const body = new URLSearchParams({
            grant_type: "authorization_code",
            client_id: this.clientID,
            code: code,
            redirect_uri: this.redirectURI,
            code_verifier: storedVerifier,
        })

        const resp = await fetch(`${this.domain}/oauth2/token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: body,
        })

        if (!resp.ok) {
            const err = await resp.json()
            throw new Error(err.error_description || "Token exchange failed")
        }

        const tokenData: TokenResponse = await resp.json()

        this.tokenManager.setTokens(tokenData)
        this.emitter.emit("SIGNED_IN", this.tokenManager.buildSession())

        // Cleanup
        sessionStorage.removeItem(CACHE_KEY_VERIFIER)
        sessionStorage.removeItem(CACHE_KEY_STATE)
        sessionStorage.removeItem(CACHE_KEY_NONCE)

        try {
            window.history.replaceState({}, document.title, window.location.pathname)
        } catch { }
    }

    // --- Social Login ---

    async loginWithSocialProvider(provider: string): Promise<void> {
        let tenantSlug = this.tenantID

        if (!tenantSlug) {
            const config = await this.getTenantConfig()
            tenantSlug = config.tenant_slug
        }

        if (!tenantSlug) {
            throw new Error("Could not determine tenant for social login")
        }

        const params = new URLSearchParams({
            client_id: this.clientID,
            redirect_uri: this.redirectURI,
            tenant_id: tenantSlug,
        })

        const startURL = `${this.domain}/v2/auth/social/${provider}/start?${params.toString()}`

        let preflightResp: Response
        try {
            preflightResp = await fetch(startURL, {
                method: "GET",
                redirect: "manual",
            })
        } catch {
            // CORS-restricted deployments may block preflight fetches.
            // Keep backward compatibility and continue with normal navigation.
            sessionStorage.setItem("hj:social_login", "true")
            window.location.assign(startURL)
            return
        }

        // Browsers can return opaqueredirect when redirect headers are hidden.
        if (preflightResp.type === "opaqueredirect") {
            sessionStorage.setItem("hj:social_login", "true")
            window.location.assign(startURL)
            return
        }

        // Successful social start should return a redirect (302) to the provider.
        if (preflightResp.status >= 300 && preflightResp.status < 400) {
            sessionStorage.setItem("hj:social_login", "true")
            const location = preflightResp.headers.get("Location")
            window.location.assign(location || startURL)
            return
        }

        if (!preflightResp.ok) {
            const errBody = await preflightResp.json().catch(() => ({} as SocialStartErrorBody))
            throw parseSocialStartError(preflightResp.status, errBody)
        }

        // If backend returns 2xx unexpectedly, continue with navigation.
        sessionStorage.setItem("hj:social_login", "true")
        window.location.assign(startURL)
    }

    isSocialCallback(url = window.location.href): boolean {
        const searchParams = new URL(url).searchParams
        const hasCode = searchParams.has("code")
        const hasError = searchParams.has("error")
        const hasVerifier = !!sessionStorage.getItem(CACHE_KEY_VERIFIER)

        // Check if backend marked this as social callback
        const socialParam = searchParams.get("social") === "true"

        // Also check sessionStorage as fallback (for backwards compatibility)
        const isSocial = sessionStorage.getItem("hj:social_login") === "true" || socialParam

        // A social callback can have either a code (success) or an error (failure redirect)
        return (hasCode || (hasError && isSocial)) && !hasVerifier
    }

    async handleSocialCallback(url = window.location.href): Promise<void> {
        const searchParams = new URL(url).searchParams

        // Check for error redirect from server (OAuth2 style)
        const error = searchParams.get("error")
        if (error) {
            const description = searchParams.get("error_description") || "Social login failed"
            sessionStorage.removeItem("hj:social_login")
            throw new HelloJohnError(description, error)
        }

        const code = searchParams.get("code")

        if (!code) {
            throw new HelloJohnError("No code found in URL for social callback", "missing_code")
        }

        const resp = await fetch(`${this.domain}/v2/auth/social/exchange`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                code: code,
                client_id: this.clientID,
            }),
        })

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({ error: "unknown" }))
            throw new HelloJohnError(
                err.error_description || err.message || "Social login exchange failed",
                err.error || err.code || "exchange_failed",
                resp.status
            )
        }

        const data: TokenResponse = await resp.json()

        this.tokenManager.setTokens(data)
        this.emitter.emit("SIGNED_IN", this.tokenManager.buildSession())

        sessionStorage.removeItem("hj:social_login")
    }

    // --- Direct Credential Login ---

    async loginWithCredentials(email: string, password: string): Promise<User> {
        const body = JSON.stringify({
            tenant_id: this.tenantID,
            client_id: this.clientID,
            email,
            password,
        })

        let resp: Response
        try {
            resp = await fetch(`${this.domain}/v2/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body,
            })
        } catch {
            throw new NetworkError()
        }

        if (!resp.ok) {
            const errBody = await resp.json().catch(() => ({}))
            const err = parseAPIError(resp.status, errBody)
            if (err instanceof MFARequiredError) {
                this.emitter.emit("MFA_REQUIRED", null)
            }
            throw err
        }

        const tokenData: TokenResponse = await resp.json()
        this.tokenManager.setTokens(tokenData)

        const user = await this.getUser()
        if (!user) throw new Error("Failed to fetch user profile after login")

        this.emitter.emit("SIGNED_IN", this.tokenManager.buildSession())
        return user
    }

    // --- Registration ---

    async register(options: RegisterOptions): Promise<RegisterResponse> {
        const customFields = options.customFields || {}
        if (options.name) {
            customFields["name"] = options.name
        }

        const body = JSON.stringify({
            tenant_id: this.tenantID,
            client_id: this.clientID,
            email: options.email,
            password: options.password,
            custom_fields: customFields,
        })

        const resp = await fetch(`${this.domain}/v2/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
        })

        if (!resp.ok) {
            const errBody = await resp.json().catch(() => ({}))
            throw parseAPIError(resp.status, errBody)
        }

        const result: RegisterResponse = await resp.json()

        // If auto-login is enabled, store tokens
        if (result.access_token) {
            this.tokenManager.setTokens({
                access_token: result.access_token,
                expires_in: result.expires_in || 3600,
                token_type: "Bearer",
                scope: this.scope,
            })
            this.emitter.emit("SIGNED_IN", this.tokenManager.buildSession())
        }

        return result
    }

    // --- User Info ---

    async getUser(): Promise<User | null> {
        let token: string
        try {
            token = await this.getAccessToken()
        } catch {
            return null
        }

        const resp = await fetch(`${this.domain}/userinfo`, {
            headers: { Authorization: `Bearer ${token}` },
        })
        if (!resp.ok) return null
        return resp.json()
    }

    // --- Logout ---

    logout(returnTo?: string): void {
        this.tokenManager.clearTokens()
        this.emitter.emit("SIGNED_OUT", null)

        if (typeof window === "undefined") return

        const target = returnTo || window.location.origin

        const form = document.createElement("form")
        form.method = "POST"
        form.action = `${this.domain}/v2/session/logout?return_to=${encodeURIComponent(target)}`
        document.body.appendChild(form)
        form.submit()
    }

    /** Logout from all sessions/devices */
    async logoutAll(): Promise<void> {
        let token: string
        try {
            token = await this.getAccessToken()
        } catch {
            // Even if no valid token, clear local state
            this.tokenManager.clearTokens()
            this.emitter.emit("SIGNED_OUT", null)
            return
        }

        await fetch(`${this.domain}/v2/auth/logout-all`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
        }).catch(() => { })

        this.tokenManager.clearTokens()
        this.emitter.emit("SIGNED_OUT", null)
    }

    // --- Token Revocation ---

    /** Revoke the current access token */
    async revokeToken(): Promise<void> {
        const tokens = this.tokenManager.getStoredTokens()
        if (!tokens?.access_token) return

        await fetch(`${this.domain}/oauth2/revoke`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                token: tokens.access_token,
                client_id: this.clientID,
            }),
        }).catch(() => { })

        this.tokenManager.clearTokens()
        this.emitter.emit("SIGNED_OUT", null)
    }

    // --- Providers ---

    /** Get available auth providers for the current tenant */
    async getProviders(): Promise<string[]> {
        let tenantId = this.tenantID
        if (!tenantId) {
            const config = await this.getTenantConfig()
            tenantId = config.tenant_slug
        }

        const url = new URL(`${this.domain}/v2/auth/providers`)
        url.searchParams.set("client_id", this.clientID)
        if (tenantId) url.searchParams.set("tenant_id", tenantId)

        const resp = await fetch(url.toString())
        if (!resp.ok) return []
        const data = await resp.json()
        return data.providers || []
    }

    // --- Password Recovery ---

    async forgotPassword(email: string): Promise<void> {
        let tenantId = this.tenantID

        if (!tenantId) {
            const config = await this.getTenantConfig()
            tenantId = config.tenant_slug
        }

        const resp = await fetch(`${this.domain}/v2/auth/forgot`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                tenant_id: tenantId,
                client_id: this.clientID,
                email: email,
                redirect_uri: this.redirectURI,
            }),
        })

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({ error: "unknown" }))
            throw new Error(err.error_description || "Failed to send password reset email")
        }
    }

    async resetPassword(token: string, newPassword: string): Promise<void> {
        let tenantId = this.tenantID

        if (!tenantId) {
            const config = await this.getTenantConfig()
            tenantId = config.tenant_slug
        }

        const resp = await fetch(`${this.domain}/v2/auth/reset`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                tenant_id: tenantId,
                client_id: this.clientID,
                token: token,
                new_password: newPassword,
            }),
        })

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({ error: "unknown" }))
            throw new Error(err.error_description || "Failed to reset password")
        }
    }

    // --- Email Verification ---

    async resendVerificationEmail(email?: string): Promise<void> {
        let tenantId = this.tenantID

        if (!tenantId) {
            const config = await this.getTenantConfig()
            tenantId = config.tenant_slug
        }

        // Use provided email or extract from stored token
        if (!email) {
            const tokens = this.tokenManager.getStoredTokens()
            if (tokens?.access_token) {
                const payload = decodeJWTPayload(tokens.access_token)
                email = payload?.email || ""
            }
        }

        const resp = await fetch(`${this.domain}/v2/auth/verify-email/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                tenant_id: tenantId,
                client_id: this.clientID,
                email: email || "",
                redirect_uri: this.redirectURI,
            }),
        })

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({ error: "unknown" }))
            throw new Error(err.error_description || "Failed to resend verification email")
        }
    }

    // --- Profile ---

    async completeProfile(fields: Record<string, string>): Promise<void> {
        const token = await this.getAccessToken()

        const resp = await fetch(`${this.domain}/v2/auth/complete-profile`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                custom_fields: fields,
            }),
        })

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({ error: "unknown" }))
            throw new Error(err.error_description || err.error || "Profile update failed")
        }

        this.emitter.emit("USER_UPDATED", this.tokenManager.buildSession())
    }

    // --- HTTP Helper ---

    /** Create a fetch function that auto-injects the Bearer token */
    createFetchWrapper(): typeof fetch {
        return createFetchWrapper(() => this.getAccessToken())
    }

    // --- Cleanup ---

    /** Destroy the client (cancel timers, clear listeners) */
    destroy(): void {
        this.tokenManager.destroy()
        this.emitter.clear()
    }
}

/** Create a new HelloJohn auth client */
export function createHelloJohn(options: AuthClientOptions): AuthClient {
    return new AuthClient(options)
}

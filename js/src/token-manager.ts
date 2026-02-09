/**
 * Token lifecycle manager for HelloJohn JS SDK.
 * Handles auto-refresh scheduling at 75% of token lifetime.
 */

import type { StorageAdapter } from "./storage"
import type { AuthEventEmitter, AuthSession } from "./event-emitter"
import type { TokenResponse } from "./types"
import { decodeJWTPayload, getTokenExpiresIn, isTokenExpired } from "./jwt"
import { TokenError } from "./errors"

const TOKEN_STORAGE_KEY = "hj:token"

/** Refresh at 75% of token lifetime */
const REFRESH_THRESHOLD = 0.75

export interface TokenManagerOptions {
  domain: string
  clientId: string
  storage: StorageAdapter
  emitter: AuthEventEmitter
  autoRefresh?: boolean
}

export class TokenManager {
  private domain: string
  private clientId: string
  private storage: StorageAdapter
  private emitter: AuthEventEmitter
  private autoRefresh: boolean
  private refreshTimer: ReturnType<typeof setTimeout> | null = null
  private refreshPromise: Promise<TokenResponse> | null = null

  constructor(opts: TokenManagerOptions) {
    this.domain = opts.domain
    this.clientId = opts.clientId
    this.storage = opts.storage
    this.emitter = opts.emitter
    this.autoRefresh = opts.autoRefresh !== false
  }

  /** Get stored tokens */
  getStoredTokens(): TokenResponse | null {
    const json = this.storage.get(TOKEN_STORAGE_KEY)
    if (!json) return null
    try {
      return JSON.parse(json) as TokenResponse
    } catch {
      return null
    }
  }

  /** Store tokens and schedule refresh */
  setTokens(tokens: TokenResponse): void {
    this.storage.set(TOKEN_STORAGE_KEY, JSON.stringify(tokens))
    if (this.autoRefresh) {
      this.scheduleRefresh(tokens)
    }
  }

  /** Clear tokens and cancel any pending refresh */
  clearTokens(): void {
    this.cancelScheduledRefresh()
    this.storage.remove(TOKEN_STORAGE_KEY)
  }

  /** Check if the stored access token is still valid (not expired) */
  isAuthenticated(): boolean {
    const tokens = this.getStoredTokens()
    if (!tokens?.access_token) return false
    return !isTokenExpired(tokens.access_token)
  }

  /**
   * Get a valid access token, refreshing if necessary.
   * Deduplicates concurrent refresh calls.
   */
  async getAccessToken(): Promise<string> {
    const tokens = this.getStoredTokens()
    if (!tokens?.access_token) {
      throw new TokenError("No access token available", "no_token")
    }

    // If token is still valid, return it
    if (!isTokenExpired(tokens.access_token)) {
      return tokens.access_token
    }

    // Token expired — try refresh
    if (!tokens.refresh_token) {
      this.clearTokens()
      this.emitter.emit("SESSION_EXPIRED", null)
      throw new TokenError("Session expired and no refresh token available", "session_expired")
    }

    const refreshed = await this.refreshTokens(tokens.refresh_token)
    return refreshed.access_token
  }

  /**
   * Force a token refresh.
   * Deduplicates concurrent calls.
   */
  async refreshSession(): Promise<TokenResponse> {
    const tokens = this.getStoredTokens()
    if (!tokens?.refresh_token) {
      throw new TokenError("No refresh token available", "no_refresh_token")
    }
    return this.refreshTokens(tokens.refresh_token)
  }

  /** Build an AuthSession from current tokens */
  buildSession(): AuthSession | null {
    const tokens = this.getStoredTokens()
    if (!tokens?.access_token) return null

    const payload = decodeJWTPayload(tokens.access_token)
    if (!payload) return null

    return {
      accessToken: tokens.access_token,
      idToken: tokens.id_token,
      refreshToken: tokens.refresh_token,
      user: {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        ...payload,
      },
      expiresAt: payload.exp,
    }
  }

  /** Initialize: check stored tokens and schedule refresh if needed */
  initialize(): void {
    const tokens = this.getStoredTokens()
    if (!tokens?.access_token) return

    if (isTokenExpired(tokens.access_token)) {
      // Token expired — try background refresh
      if (tokens.refresh_token && this.autoRefresh) {
        this.refreshTokens(tokens.refresh_token).catch(() => {
          this.clearTokens()
          this.emitter.emit("SESSION_EXPIRED", null)
        })
      } else {
        this.clearTokens()
        this.emitter.emit("SESSION_EXPIRED", null)
      }
    } else if (this.autoRefresh) {
      this.scheduleRefresh(tokens)
    }
  }

  /** Destroy: cancel timers */
  destroy(): void {
    this.cancelScheduledRefresh()
  }

  // --- Private ---

  private scheduleRefresh(tokens: TokenResponse): void {
    this.cancelScheduledRefresh()

    const expiresInMs = getTokenExpiresIn(tokens.access_token)
    if (expiresInMs <= 0) return

    // Schedule at 75% of lifetime
    const refreshInMs = Math.max(expiresInMs * REFRESH_THRESHOLD, 5000) // min 5s
    this.refreshTimer = setTimeout(() => {
      const current = this.getStoredTokens()
      if (current?.refresh_token) {
        this.refreshTokens(current.refresh_token).catch(() => {
          this.clearTokens()
          this.emitter.emit("SESSION_EXPIRED", null)
        })
      }
    }, refreshInMs)
  }

  private cancelScheduledRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  /**
   * Call the refresh endpoint. Deduplicates concurrent calls.
   */
  private async refreshTokens(refreshToken: string): Promise<TokenResponse> {
    // Deduplicate
    if (this.refreshPromise) return this.refreshPromise

    this.refreshPromise = this.doRefresh(refreshToken)
      .finally(() => {
        this.refreshPromise = null
      })

    return this.refreshPromise
  }

  private async doRefresh(refreshToken: string): Promise<TokenResponse> {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: this.clientId,
      refresh_token: refreshToken,
    })

    let resp: Response
    try {
      resp = await fetch(`${this.domain}/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      })
    } catch {
      throw new TokenError("Network error during token refresh", "refresh_network_error")
    }

    if (!resp.ok) {
      // Refresh failed — session is dead
      this.clearTokens()
      this.emitter.emit("SESSION_EXPIRED", null)
      throw new TokenError("Token refresh failed", "refresh_failed")
    }

    const tokens: TokenResponse = await resp.json()

    // Carry over refresh_token if not returned (some servers don't rotate)
    if (!tokens.refresh_token) {
      tokens.refresh_token = refreshToken
    }

    this.setTokens(tokens)
    this.emitter.emit("TOKEN_REFRESHED", this.buildSession())

    return tokens
  }
}

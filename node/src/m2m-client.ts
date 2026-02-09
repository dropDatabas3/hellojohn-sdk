import { M2MAuthError } from "./errors"

export interface M2MClientOptions {
  domain: string
  tenantId: string
  clientId: string
  clientSecret: string
}

interface CachedToken {
  accessToken: string
  expiresAt: number
  scope: string
}

export class M2MClient {
  private domain: string
  private tenantId: string
  private clientId: string
  private clientSecret: string
  private cache = new Map<string, CachedToken>()

  constructor(options: M2MClientOptions) {
    if (!options.domain) throw new M2MAuthError("domain is required")
    if (!options.clientId) throw new M2MAuthError("clientId is required")
    if (!options.clientSecret) throw new M2MAuthError("clientSecret is required")

    this.domain = options.domain.replace(/\/$/, "")
    this.tenantId = options.tenantId
    this.clientId = options.clientId
    this.clientSecret = options.clientSecret
  }

  /**
   * Get an access token for machine-to-machine communication.
   * Tokens are cached until 60 seconds before expiry.
   */
  async getToken(opts?: { scopes?: string[] }): Promise<{ accessToken: string; expiresAt: number }> {
    const scopeKey = (opts?.scopes ?? []).sort().join(" ")

    const cached = this.cache.get(scopeKey)
    if (cached && cached.expiresAt > Date.now() / 1000 + 60) {
      return { accessToken: cached.accessToken, expiresAt: cached.expiresAt }
    }

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.clientId,
      client_secret: this.clientSecret,
    })
    if (opts?.scopes?.length) {
      body.set("scope", opts.scopes.join(" "))
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    }
    if (this.tenantId) {
      headers["X-Tenant-Slug"] = this.tenantId
    }

    const res = await fetch(`${this.domain}/oauth2/token`, {
      method: "POST",
      headers,
      body,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({} as Record<string, unknown>)) as Record<string, unknown>
      throw new M2MAuthError(`M2M auth failed: ${err.error || res.statusText}`)
    }

    const data = await res.json() as { access_token: string; expires_in?: number; scope?: string }
    const expiresAt = Math.floor(Date.now() / 1000) + (data.expires_in || 3600)

    this.cache.set(scopeKey, {
      accessToken: data.access_token,
      expiresAt,
      scope: data.scope || scopeKey,
    })

    return { accessToken: data.access_token, expiresAt }
  }

  /** Convenience: fetch with auto-injected M2M Bearer token */
  async fetch(url: string, init?: RequestInit): Promise<Response> {
    const { accessToken } = await this.getToken()
    const headers = new Headers(init?.headers)
    headers.set("Authorization", `Bearer ${accessToken}`)
    return fetch(url, { ...init, headers })
  }

  clearCache(): void {
    this.cache.clear()
  }
}

export function createM2MClient(options: M2MClientOptions): M2MClient {
  return new M2MClient(options)
}

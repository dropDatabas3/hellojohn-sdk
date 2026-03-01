import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { AuthClient } from "../src/client"
import { createMemoryStorageAdapter } from "../src/storage"
import type { TokenResponse } from "../src/types"

function createClient() {
  return new AuthClient({
    domain: "http://localhost:8080",
    clientID: "bananacorp_client_web",
    tenantID: "bananacorp",
    redirectURI: "http://localhost:3001/auth/callback",
    autoRefresh: false,
    storage: createMemoryStorageAdapter(),
  })
}

function seedTokens(client: AuthClient, overrides?: Partial<TokenResponse>) {
  const tokens: TokenResponse = {
    access_token: overrides?.access_token ?? "at_test",
    refresh_token: overrides?.refresh_token ?? "rt_test",
    scope: overrides?.scope ?? "openid profile email",
    expires_in: overrides?.expires_in ?? 3600,
    token_type: overrides?.token_type ?? "Bearer",
    id_token: overrides?.id_token,
  }
  ;(client as any).tokenManager.setTokens(tokens)
}

describe("AuthClient.logout", () => {
  const assign = vi.fn()

  beforeEach(() => {
    vi.stubGlobal("window", {
      location: {
        assign,
        href: "http://localhost:3001/profile",
        origin: "http://localhost:3001",
      },
    } as any)
    vi.stubGlobal("fetch", vi.fn())
    assign.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("uses csrf + unified auth logout and applies server redirect uri", async () => {
    const fetchMock = fetch as ReturnType<typeof vi.fn>

    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrf_token: "csrf_123" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ post_logout_redirect_uri: "http://localhost:3001/after" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )

    const client = createClient()
    seedTokens(client)

    client.logout("http://localhost:3001/goodbye")

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    const [csrfURL, csrfInit] = fetchMock.mock.calls[0]
    expect(csrfURL).toBe("http://localhost:8080/v2/csrf")
    expect(csrfInit).toMatchObject({
      method: "GET",
      credentials: "include",
    })

    const [logoutURL, logoutInit] = fetchMock.mock.calls[1]
    expect(logoutURL).toBe("http://localhost:8080/v2/auth/logout")
    expect(logoutInit.method).toBe("POST")
    expect(logoutInit.credentials).toBe("include")

    const headers = logoutInit.headers as Record<string, string>
    expect(headers["Content-Type"]).toBe("application/json")
    expect(headers.Authorization).toBe("Bearer at_test")
    expect(headers["X-CSRF-Token"]).toBe("csrf_123")

    const body = JSON.parse(logoutInit.body as string)
    expect(body).toEqual({
      client_id: "bananacorp_client_web",
      tenant_id: "bananacorp",
      refresh_token: "rt_test",
      post_logout_redirect_uri: "http://localhost:3001/goodbye",
    })

    expect(assign).toHaveBeenCalledWith("http://localhost:3001/after")
  })

  it("falls back to local redirect when csrf/logout fail", async () => {
    const fetchMock = fetch as ReturnType<typeof vi.fn>

    fetchMock
      .mockRejectedValueOnce(new Error("csrf unavailable"))
      .mockResolvedValueOnce(new Response("{}", { status: 500 }))

    const client = createClient()

    client.logout()

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    const [, logoutInit] = fetchMock.mock.calls[1]
    const headers = logoutInit.headers as Record<string, string>

    expect(headers["Content-Type"]).toBe("application/json")
    expect(headers.Authorization).toBeUndefined()
    expect(headers["X-CSRF-Token"]).toBeUndefined()

    const body = JSON.parse(logoutInit.body as string)
    expect(body).toEqual({
      client_id: "bananacorp_client_web",
      tenant_id: "bananacorp",
      post_logout_redirect_uri: "http://localhost:3001",
    })

    expect(assign).toHaveBeenCalledWith("http://localhost:3001")
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { AuthClient } from "../src/client"

function createClient() {
  return new AuthClient({
    domain: "http://localhost:8080",
    clientID: "bananacorp_client_web",
    tenantID: "bananacorp",
    redirectURI: "http://localhost:3001/auth/callback",
    autoRefresh: false,
  })
}

describe("AuthClient.loginWithSocialProvider", () => {
  const assign = vi.fn()
  const sessionStorageMock = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  }

  beforeEach(() => {
    vi.stubGlobal("window", {
      location: {
        assign,
        href: "http://localhost:3001/login",
        origin: "http://localhost:3001",
      },
    } as any)
    vi.stubGlobal("sessionStorage", sessionStorageMock as any)
    vi.stubGlobal("fetch", vi.fn())
    assign.mockReset()
    sessionStorageMock.getItem.mockClear()
    sessionStorageMock.setItem.mockClear()
    sessionStorageMock.removeItem.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("redirects when social start returns 302", async () => {
    const startLocation = "https://accounts.google.com/o/oauth2/v2/auth?state=abc"
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { Location: startLocation },
      }),
    )

    const client = createClient()
    await client.loginWithSocialProvider("google")

    expect(fetch).toHaveBeenCalledOnce()
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain("/v2/auth/social/google/start?")
    expect(url).toContain("client_id=bananacorp_client_web")
    expect(url).toContain("tenant_id=bananacorp")
    expect(url).toContain("redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fauth%2Fcallback")
    expect(init.redirect).toBe("manual")
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith("hj:social_login", "true")
    expect(assign).toHaveBeenCalledWith(startLocation)
  })

  it("maps redirect_uri backend errors to a friendly SDK error", async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "INTERNAL_SERVER_ERROR",
          message: "Ocurrio un error interno en el servidor.",
          detail: "redirect_uri not allowed",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      ),
    )

    const client = createClient()
    await expect(client.loginWithSocialProvider("google")).rejects.toMatchObject({
      code: "redirect_uri_not_allowed",
      statusCode: 500,
    })
    expect(assign).not.toHaveBeenCalled()
    expect(sessionStorageMock.setItem).not.toHaveBeenCalled()
  })

  it("falls back to browser navigation when preflight fetch is blocked", async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new TypeError("Failed to fetch"))

    const client = createClient()
    await client.loginWithSocialProvider("google")

    expect(sessionStorageMock.setItem).toHaveBeenCalledWith("hj:social_login", "true")
    expect(assign).toHaveBeenCalledOnce()
    expect(assign.mock.calls[0][0]).toContain("/v2/auth/social/google/start?")
  })
})

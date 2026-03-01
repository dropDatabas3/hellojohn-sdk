import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AuthClient } from "../src/client"

function createClient(opts?: { tenantID?: string }) {
  return new AuthClient({
    domain: "http://localhost:8080",
    clientID: "bananacorp_client_web",
    tenantID: opts?.tenantID,
    redirectURI: "http://localhost:3001/auth/callback",
    autoRefresh: false,
  })
}

describe("AuthClient.getPasswordPolicy", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("uses tenantID from client options when available", async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          min_length: 10,
          max_length: 128,
          require_uppercase: true,
          require_lowercase: true,
          require_numbers: true,
          require_symbols: false,
          max_history: 5,
          breach_detection: false,
          common_password: true,
          personal_info: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )

    const client = createClient({ tenantID: "bananacorp" })
    await client.getPasswordPolicy()

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(String(url)).toContain("/v2/auth/password-policy")
    expect(String(url)).toContain("tenant_id=bananacorp")
    expect(init).toMatchObject({ cache: "no-store" })
    expect((init as RequestInit | undefined)?.headers).toBeUndefined()
  })

  it("falls back to tenant slug from auth config when tenantID is missing", async () => {
    ;(fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            tenant_name: "Banana Corp",
            tenant_slug: "bananacorp",
            client_name: "Web App",
            social_providers: [],
            password_enabled: true,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            min_length: 8,
            max_length: 128,
            require_uppercase: true,
            require_lowercase: true,
            require_numbers: true,
            require_symbols: false,
            max_history: 5,
            breach_detection: false,
            common_password: true,
            personal_info: true,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )

    const client = createClient()
    await client.getPasswordPolicy()

    expect(fetch).toHaveBeenCalledTimes(2)
    const [configURL] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const [policyURL] = (fetch as ReturnType<typeof vi.fn>).mock.calls[1]
    expect(String(configURL)).toContain("/v2/auth/config")
    expect(String(policyURL)).toContain("/v2/auth/password-policy")
    expect(String(policyURL)).toContain("tenant_id=bananacorp")
  })
})

import { createRemoteJWKSet, jwtVerify } from "jose"
import type { AuthClaims } from "./claims"

export interface VerifierOptions {
  audience?: string
  clockTolerance?: number
  algorithms?: string[]
}

export class JWTVerifier {
  private jwks: ReturnType<typeof createRemoteJWKSet>
  private options: Required<Pick<VerifierOptions, "clockTolerance" | "algorithms">> & Pick<VerifierOptions, "audience">

  constructor(domain: string, options: VerifierOptions = {}) {
    const jwksUrl = new URL("/.well-known/jwks.json", domain)
    this.jwks = createRemoteJWKSet(jwksUrl)
    this.options = {
      clockTolerance: options.clockTolerance ?? 30,
      algorithms: options.algorithms ?? ["EdDSA"],
      audience: options.audience,
    }
  }

  async verify(token: string): Promise<AuthClaims> {
    const { payload } = await jwtVerify(token, this.jwks, {
      clockTolerance: this.options.clockTolerance,
      algorithms: this.options.algorithms,
      ...(this.options.audience ? { audience: this.options.audience } : {}),
    })

    return this.parseClaims(payload, token)
  }

  private parseClaims(payload: Record<string, unknown>, token: string): AuthClaims {
    const scopes = extractArray(payload.scp ?? payload.scope)
    const roles = extractArray(payload.roles)
    const permissions = extractArray(payload.perms)
    const amr = extractArray(payload.amr)

    return {
      userId: String(payload.sub ?? ""),
      tenantId: String(payload.tid ?? ""),
      scopes,
      roles,
      permissions,
      isM2M: amr.includes("client"),
      clientId: amr.includes("client") ? String(payload.sub) : undefined,
      issuedAt: (payload.iat as number) ?? 0,
      expiresAt: (payload.exp as number) ?? 0,
      issuer: String(payload.iss ?? ""),
      raw: payload,
      token,
    }
  }
}

function extractArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === "string") return value.split(" ").filter(Boolean)
  return []
}

import type { JWTPayload } from "jose"

export interface AuthClaims {
  /** User ID (sub claim). For M2M, this is the client ID. */
  userId: string
  /** Tenant ID (tid claim) */
  tenantId: string
  /** OAuth2 scopes */
  scopes: string[]
  /** RBAC roles */
  roles: string[]
  /** RBAC permissions */
  permissions: string[]
  /** Whether this token is from a machine-to-machine client */
  isM2M: boolean
  /** Client ID (only for M2M tokens) */
  clientId?: string
  /** Token issued at (Unix timestamp) */
  issuedAt: number
  /** Token expires at (Unix timestamp) */
  expiresAt: number
  /** Token issuer */
  issuer: string
  /** Raw JWT payload */
  raw: JWTPayload
  /** The original token string */
  token: string
}

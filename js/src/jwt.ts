/**
 * JWT decode utilities for HelloJohn JS SDK.
 * Client-side only — no verification (that's the backend SDK's job).
 */

export interface JWTPayload {
  sub: string
  iss?: string
  aud?: string | string[]
  exp: number
  iat?: number
  nbf?: number
  tid?: string
  email?: string
  email_verified?: boolean
  name?: string
  nonce?: string
  [key: string]: any
}

/**
 * Decode a JWT payload without verification.
 * Returns null if the token is malformed.
 */
export function decodeJWTPayload(token: string): JWTPayload | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null

    // Base64url decode the payload
    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")

    const json = atob(payload)
    return JSON.parse(json)
  } catch {
    return null
  }
}

/**
 * Check if a JWT is expired.
 * Returns true if expired or undecodable.
 * Uses a clock skew buffer of 30 seconds.
 */
export function isTokenExpired(token: string, clockSkewSeconds = 30): boolean {
  const payload = decodeJWTPayload(token)
  if (!payload || !payload.exp) return true

  const nowSeconds = Math.floor(Date.now() / 1000)
  return payload.exp <= nowSeconds + clockSkewSeconds
}

/**
 * Get the time in milliseconds until a token expires.
 * Returns 0 if already expired or undecodable.
 */
export function getTokenExpiresIn(token: string): number {
  const payload = decodeJWTPayload(token)
  if (!payload || !payload.exp) return 0

  const nowMs = Date.now()
  const expMs = payload.exp * 1000
  return Math.max(0, expMs - nowMs)
}

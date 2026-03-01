/**
 * Typed error classes for HelloJohn JS SDK.
 */

export class HelloJohnError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
  ) {
    super(message)
    this.name = "HelloJohnError"
  }
}

export class AuthenticationError extends HelloJohnError {
  constructor(message: string, code = "authentication_error", statusCode = 401) {
    super(message, code, statusCode)
    this.name = "AuthenticationError"
  }
}

export class TokenError extends HelloJohnError {
  constructor(message: string, code = "token_error") {
    super(message, code)
    this.name = "TokenError"
  }
}

export class MFARequiredError extends HelloJohnError {
  public mfaToken: string
  public challengeId: string
  public availableFactors: string[]
  public preferredFactor?: string
  constructor(mfaToken: string, availableFactors: string[] = [], preferredFactor?: string) {
    super("MFA verification required", "mfa_required", 403)
    this.name = "MFARequiredError"
    this.mfaToken = mfaToken
    // Backward-compatible alias used by old flows.
    this.challengeId = mfaToken
    this.availableFactors = availableFactors
    this.preferredFactor = preferredFactor
  }
}

export class NetworkError extends HelloJohnError {
  constructor(message = "Network request failed") {
    super(message, "network_error")
    this.name = "NetworkError"
  }
}

/** Parse an API error response into a typed error */
export function parseAPIError(status: number, body: any): HelloJohnError {
  const message = body?.error_description || body?.message || body?.error || "Unknown error"
  const code = body?.error || "api_error"

  const mfaToken = body?.mfa_token || body?.challenge_id
  const availableFactors = Array.isArray(body?.available_factors)
    ? body.available_factors.filter((factor: unknown): factor is string => typeof factor === "string")
    : []
  const preferredFactor = typeof body?.preferred_factor === "string" ? body.preferred_factor : undefined

  if (code === "mfa_required" && typeof mfaToken === "string" && mfaToken.trim() !== "") {
    return new MFARequiredError(mfaToken, availableFactors, preferredFactor)
  }

  if (status === 401) return new AuthenticationError(message, code, status)
  return new HelloJohnError(message, code, status)
}

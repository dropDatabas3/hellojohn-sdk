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
  public challengeId: string
  constructor(challengeId: string) {
    super("MFA verification required", "mfa_required", 403)
    this.name = "MFARequiredError"
    this.challengeId = challengeId
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

  if (code === "mfa_required" && body?.challenge_id) {
    return new MFARequiredError(body.challenge_id)
  }

  if (status === 401) return new AuthenticationError(message, code, status)
  return new HelloJohnError(message, code, status)
}

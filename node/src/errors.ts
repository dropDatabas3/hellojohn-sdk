export class HelloJohnError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = "HelloJohnError"
  }
}

export class TokenVerificationError extends HelloJohnError {
  constructor(message: string) {
    super(message, "token_verification_failed")
    this.name = "TokenVerificationError"
  }
}

export class M2MAuthError extends HelloJohnError {
  constructor(message: string) {
    super(message, "m2m_auth_failed")
    this.name = "M2MAuthError"
  }
}

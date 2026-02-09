import { JWTVerifier, type VerifierOptions } from "./jwt/verifier"
import type { AuthClaims } from "./jwt/claims"

export interface ServerClientOptions extends VerifierOptions {
  domain: string
}

export class HelloJohnServer {
  readonly verifier: JWTVerifier
  readonly domain: string

  constructor(options: ServerClientOptions) {
    this.domain = options.domain.replace(/\/$/, "")
    this.verifier = new JWTVerifier(this.domain, {
      audience: options.audience,
      clockTolerance: options.clockTolerance,
      algorithms: options.algorithms,
    })
  }

  async verifyToken(token: string): Promise<AuthClaims> {
    return this.verifier.verify(token)
  }
}

export function createHelloJohnServer(options: ServerClientOptions): HelloJohnServer {
  return new HelloJohnServer(options)
}

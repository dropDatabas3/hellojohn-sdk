import type { Request, Response, NextFunction } from "express"
import type { HelloJohnServer } from "../server-client"
import type { AuthClaims } from "../jwt/claims"

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      auth?: AuthClaims
    }
  }
}

/**
 * Non-blocking middleware: attaches req.auth if a valid Bearer token is present.
 * Does not reject requests without a token — use requireAuth() for that.
 */
export function hjMiddleware(server: HelloJohnServer) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractBearerToken(req)
    if (token) {
      try {
        req.auth = await server.verifyToken(token)
      } catch {
        // Non-blocking: just don't set req.auth
      }
    }
    next()
  }
}

/** Block requests without a valid auth token (must be used after hjMiddleware) */
export function requireAuth() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      res.status(401).json({ error: "Unauthorized" })
      return
    }
    next()
  }
}

/** Require a specific OAuth2 scope */
export function requireScope(scope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth?.scopes.includes(scope)) {
      res.status(403).json({ error: "Forbidden", message: `Missing scope: ${scope}` })
      return
    }
    next()
  }
}

/** Require a specific RBAC role */
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth?.roles.includes(role)) {
      res.status(403).json({ error: "Forbidden", message: `Missing role: ${role}` })
      return
    }
    next()
  }
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization
  if (!header?.startsWith("Bearer ")) return null
  return header.slice(7)
}

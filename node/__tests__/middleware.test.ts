import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hjMiddleware, requireAuth, requireScope, requireRole } from '../src/express/middleware'
import type { AuthClaims } from '../src/jwt/claims'
import type { HelloJohnServer } from '../src/server-client'

// --- Mock helpers ---

const mockReq = (auth?: AuthClaims | undefined, headers?: Record<string, string>) => ({
  auth,
  headers: headers || {},
} as any)

const mockRes = () => {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

const mockNext = () => vi.fn()

function createMockClaims(overrides: Partial<AuthClaims> = {}): AuthClaims {
  return {
    userId: 'user-123',
    tenantId: 'tenant-abc',
    scopes: ['read', 'write'],
    roles: ['admin'],
    permissions: ['users:read', 'users:write'],
    isM2M: false,
    issuedAt: 1700000000,
    expiresAt: 1700003600,
    issuer: 'https://auth.example.com',
    raw: { sub: 'user-123' },
    token: 'valid-token',
    ...overrides,
  }
}

function createMockServer(verifyResult?: AuthClaims | Error): HelloJohnServer {
  return {
    domain: 'https://auth.example.com',
    verifier: {} as any,
    verifyToken: verifyResult instanceof Error
      ? vi.fn().mockRejectedValue(verifyResult)
      : vi.fn().mockResolvedValue(verifyResult),
  } as any
}

// --- Tests ---

describe('hjMiddleware', () => {
  it('should attach req.auth when a valid Bearer token is present', async () => {
    const claims = createMockClaims()
    const server = createMockServer(claims)
    const middleware = hjMiddleware(server)

    const req = mockReq(undefined, { authorization: 'Bearer valid-token' })
    const res = mockRes()
    const next = mockNext()

    await middleware(req, res, next)

    expect(server.verifyToken).toHaveBeenCalledWith('valid-token')
    expect(req.auth).toBe(claims)
    expect(next).toHaveBeenCalled()
  })

  it('should not set req.auth when token verification fails', async () => {
    const server = createMockServer(new Error('invalid token'))
    const middleware = hjMiddleware(server)

    const req = mockReq(undefined, { authorization: 'Bearer bad-token' })
    const res = mockRes()
    const next = mockNext()

    await middleware(req, res, next)

    expect(req.auth).toBeUndefined()
    expect(next).toHaveBeenCalled()
  })

  it('should not set req.auth when no Authorization header is present', async () => {
    const server = createMockServer()
    const middleware = hjMiddleware(server)

    const req = mockReq(undefined, {})
    const res = mockRes()
    const next = mockNext()

    await middleware(req, res, next)

    expect(server.verifyToken).not.toHaveBeenCalled()
    expect(req.auth).toBeUndefined()
    expect(next).toHaveBeenCalled()
  })

  it('should not set req.auth when Authorization header is not Bearer', async () => {
    const server = createMockServer()
    const middleware = hjMiddleware(server)

    const req = mockReq(undefined, { authorization: 'Basic dXNlcjpwYXNz' })
    const res = mockRes()
    const next = mockNext()

    await middleware(req, res, next)

    expect(server.verifyToken).not.toHaveBeenCalled()
    expect(req.auth).toBeUndefined()
    expect(next).toHaveBeenCalled()
  })

  it('should always call next() even on verification failure (non-blocking)', async () => {
    const server = createMockServer(new Error('expired'))
    const middleware = hjMiddleware(server)

    const req = mockReq(undefined, { authorization: 'Bearer expired-token' })
    const res = mockRes()
    const next = mockNext()

    await middleware(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    // Should not send any response
    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).not.toHaveBeenCalled()
  })

  it('should not block when Bearer token is empty string after prefix', async () => {
    const server = createMockServer()
    const middleware = hjMiddleware(server)

    const req = mockReq(undefined, { authorization: 'Bearer ' })
    const res = mockRes()
    const next = mockNext()

    await middleware(req, res, next)

    // An empty token string is still passed to verifyToken
    // but the middleware is non-blocking regardless
    expect(next).toHaveBeenCalled()
  })
})

describe('requireAuth', () => {
  it('should return 401 when req.auth is missing', () => {
    const middleware = requireAuth()
    const req = mockReq(undefined)
    const res = mockRes()
    const next = mockNext()

    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
    expect(next).not.toHaveBeenCalled()
  })

  it('should call next() when req.auth is present', () => {
    const middleware = requireAuth()
    const claims = createMockClaims()
    const req = mockReq(claims)
    const res = mockRes()
    const next = mockNext()

    middleware(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('should not modify req.auth when it is present', () => {
    const middleware = requireAuth()
    const claims = createMockClaims()
    const req = mockReq(claims)
    const res = mockRes()
    const next = mockNext()

    middleware(req, res, next)

    expect(req.auth).toBe(claims)
  })

  it('should return 401 when req.auth is undefined', () => {
    const middleware = requireAuth()
    const req = { headers: {} } as any // no auth property at all
    const res = mockRes()
    const next = mockNext()

    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })
})

describe('requireScope', () => {
  it('should return 403 when req.auth is missing', () => {
    const middleware = requireScope('read')
    const req = mockReq(undefined)
    const res = mockRes()
    const next = mockNext()

    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Forbidden',
      message: 'Missing scope: read',
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('should return 403 when required scope is not in claims', () => {
    const middleware = requireScope('admin:write')
    const claims = createMockClaims({ scopes: ['read', 'write'] })
    const req = mockReq(claims)
    const res = mockRes()
    const next = mockNext()

    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Forbidden',
      message: 'Missing scope: admin:write',
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('should call next() when required scope is present', () => {
    const middleware = requireScope('read')
    const claims = createMockClaims({ scopes: ['read', 'write'] })
    const req = mockReq(claims)
    const res = mockRes()
    const next = mockNext()

    middleware(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('should handle claims with empty scopes array', () => {
    const middleware = requireScope('read')
    const claims = createMockClaims({ scopes: [] })
    const req = mockReq(claims)
    const res = mockRes()
    const next = mockNext()

    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('should perform exact scope matching', () => {
    const middleware = requireScope('read')
    const claims = createMockClaims({ scopes: ['readonly', 'readwrite'] })
    const req = mockReq(claims)
    const res = mockRes()
    const next = mockNext()

    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('should include the missing scope name in the error message', () => {
    const middleware = requireScope('super:admin:delete')
    const claims = createMockClaims({ scopes: [] })
    const req = mockReq(claims)
    const res = mockRes()
    const next = mockNext()

    middleware(req, res, next)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Missing scope: super:admin:delete',
      })
    )
  })
})

describe('requireRole', () => {
  it('should return 403 when req.auth is missing', () => {
    const middleware = requireRole('admin')
    const req = mockReq(undefined)
    const res = mockRes()
    const next = mockNext()

    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Forbidden',
      message: 'Missing role: admin',
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('should return 403 when required role is not in claims', () => {
    const middleware = requireRole('superadmin')
    const claims = createMockClaims({ roles: ['admin', 'editor'] })
    const req = mockReq(claims)
    const res = mockRes()
    const next = mockNext()

    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Forbidden',
      message: 'Missing role: superadmin',
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('should call next() when required role is present', () => {
    const middleware = requireRole('admin')
    const claims = createMockClaims({ roles: ['admin', 'editor'] })
    const req = mockReq(claims)
    const res = mockRes()
    const next = mockNext()

    middleware(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('should handle claims with empty roles array', () => {
    const middleware = requireRole('admin')
    const claims = createMockClaims({ roles: [] })
    const req = mockReq(claims)
    const res = mockRes()
    const next = mockNext()

    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('should perform exact role matching', () => {
    const middleware = requireRole('admin')
    const claims = createMockClaims({ roles: ['administrator', 'admin-user'] })
    const req = mockReq(claims)
    const res = mockRes()
    const next = mockNext()

    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('should include the missing role name in the error message', () => {
    const middleware = requireRole('org:billing:manager')
    const claims = createMockClaims({ roles: [] })
    const req = mockReq(claims)
    const res = mockRes()
    const next = mockNext()

    middleware(req, res, next)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Missing role: org:billing:manager',
      })
    )
  })
})

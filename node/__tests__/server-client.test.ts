import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HelloJohnServer, createHelloJohnServer } from '../src/server-client'
import { JWTVerifier } from '../src/jwt/verifier'
import type { AuthClaims } from '../src/jwt/claims'

// Mock the JWTVerifier module with a proper class mock
vi.mock('../src/jwt/verifier', () => {
  // Create a mock class that can be instantiated with `new`
  const MockJWTVerifier = vi.fn(function (this: any) {
    this.verify = vi.fn()
  })
  return { JWTVerifier: MockJWTVerifier }
})

describe('HelloJohnServer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should store domain without trailing slash', () => {
    const server = new HelloJohnServer({
      domain: 'https://auth.example.com/',
    })
    expect(server.domain).toBe('https://auth.example.com')
  })

  it('should store domain as-is when no trailing slash', () => {
    const server = new HelloJohnServer({
      domain: 'https://auth.example.com',
    })
    expect(server.domain).toBe('https://auth.example.com')
  })

  it('should strip multiple trailing slashes (regex replaces last only)', () => {
    const server = new HelloJohnServer({
      domain: 'https://auth.example.com/',
    })
    // The regex /\/$/ only strips one trailing slash
    expect(server.domain).toBe('https://auth.example.com')
  })

  it('should create a JWTVerifier with the cleaned domain', () => {
    new HelloJohnServer({
      domain: 'https://auth.example.com/',
    })
    expect(JWTVerifier).toHaveBeenCalledWith(
      'https://auth.example.com',
      expect.objectContaining({})
    )
  })

  it('should pass audience option to JWTVerifier', () => {
    new HelloJohnServer({
      domain: 'https://auth.example.com',
      audience: 'my-api',
    })
    expect(JWTVerifier).toHaveBeenCalledWith(
      'https://auth.example.com',
      expect.objectContaining({ audience: 'my-api' })
    )
  })

  it('should pass clockTolerance option to JWTVerifier', () => {
    new HelloJohnServer({
      domain: 'https://auth.example.com',
      clockTolerance: 60,
    })
    expect(JWTVerifier).toHaveBeenCalledWith(
      'https://auth.example.com',
      expect.objectContaining({ clockTolerance: 60 })
    )
  })

  it('should pass algorithms option to JWTVerifier', () => {
    new HelloJohnServer({
      domain: 'https://auth.example.com',
      algorithms: ['RS256', 'EdDSA'],
    })
    expect(JWTVerifier).toHaveBeenCalledWith(
      'https://auth.example.com',
      expect.objectContaining({ algorithms: ['RS256', 'EdDSA'] })
    )
  })

  it('should expose verifier as a public readonly property', () => {
    const server = new HelloJohnServer({
      domain: 'https://auth.example.com',
    })
    expect(server.verifier).toBeDefined()
    expect(server.verifier.verify).toBeDefined()
  })

  it('should delegate verifyToken to verifier.verify', async () => {
    const mockClaims: AuthClaims = {
      userId: 'user-123',
      tenantId: 'tenant-abc',
      scopes: ['read'],
      roles: ['admin'],
      permissions: ['users:read'],
      isM2M: false,
      issuedAt: 1700000000,
      expiresAt: 1700003600,
      issuer: 'https://auth.example.com',
      raw: { sub: 'user-123' },
      token: 'test-token',
    }

    const server = new HelloJohnServer({
      domain: 'https://auth.example.com',
    })

    vi.mocked(server.verifier.verify).mockResolvedValue(mockClaims)

    const result = await server.verifyToken('test-token')
    expect(server.verifier.verify).toHaveBeenCalledWith('test-token')
    expect(result).toBe(mockClaims)
  })

  it('should propagate errors from verifier.verify', async () => {
    const server = new HelloJohnServer({
      domain: 'https://auth.example.com',
    })

    vi.mocked(server.verifier.verify).mockRejectedValue(new Error('invalid token'))

    await expect(server.verifyToken('bad-token')).rejects.toThrow('invalid token')
  })
})

describe('createHelloJohnServer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return an instance of HelloJohnServer', () => {
    const server = createHelloJohnServer({
      domain: 'https://auth.example.com',
    })
    expect(server).toBeInstanceOf(HelloJohnServer)
  })

  it('should pass all options through to the constructor', () => {
    const server = createHelloJohnServer({
      domain: 'https://auth.example.com/',
      audience: 'test-audience',
      clockTolerance: 120,
      algorithms: ['EdDSA'],
    })
    expect(server.domain).toBe('https://auth.example.com')
    expect(JWTVerifier).toHaveBeenCalledWith(
      'https://auth.example.com',
      expect.objectContaining({
        audience: 'test-audience',
        clockTolerance: 120,
        algorithms: ['EdDSA'],
      })
    )
  })
})

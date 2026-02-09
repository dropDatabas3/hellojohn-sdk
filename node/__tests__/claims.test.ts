import { describe, it, expect } from 'vitest'
import type { AuthClaims } from '../src/jwt/claims'
import type { JWTPayload } from 'jose'

describe('AuthClaims', () => {
  it('should accept a fully populated claims object', () => {
    const raw: JWTPayload = {
      sub: 'user-123',
      tid: 'tenant-abc',
      scp: ['read', 'write'],
      roles: ['admin'],
      perms: ['users:read', 'users:write'],
      amr: [],
      iat: 1700000000,
      exp: 1700003600,
      iss: 'https://auth.example.com',
    }

    const claims: AuthClaims = {
      userId: 'user-123',
      tenantId: 'tenant-abc',
      scopes: ['read', 'write'],
      roles: ['admin'],
      permissions: ['users:read', 'users:write'],
      isM2M: false,
      clientId: undefined,
      issuedAt: 1700000000,
      expiresAt: 1700003600,
      issuer: 'https://auth.example.com',
      raw,
      token: 'eyJhbGciOiJFZERTQSJ9.test.sig',
    }

    expect(claims.userId).toBe('user-123')
    expect(claims.tenantId).toBe('tenant-abc')
    expect(claims.scopes).toEqual(['read', 'write'])
    expect(claims.roles).toEqual(['admin'])
    expect(claims.permissions).toEqual(['users:read', 'users:write'])
    expect(claims.isM2M).toBe(false)
    expect(claims.clientId).toBeUndefined()
    expect(claims.issuedAt).toBe(1700000000)
    expect(claims.expiresAt).toBe(1700003600)
    expect(claims.issuer).toBe('https://auth.example.com')
    expect(claims.raw).toBe(raw)
    expect(claims.token).toBe('eyJhbGciOiJFZERTQSJ9.test.sig')
  })

  it('should accept an M2M claims object with clientId', () => {
    const claims: AuthClaims = {
      userId: 'client-456',
      tenantId: 'tenant-xyz',
      scopes: ['api:access'],
      roles: [],
      permissions: [],
      isM2M: true,
      clientId: 'client-456',
      issuedAt: 1700000000,
      expiresAt: 1700003600,
      issuer: 'https://auth.example.com',
      raw: { sub: 'client-456', amr: ['client'] },
      token: 'eyJ...',
    }

    expect(claims.isM2M).toBe(true)
    expect(claims.clientId).toBe('client-456')
    expect(claims.userId).toBe('client-456')
  })

  it('should accept empty arrays for scopes, roles, and permissions', () => {
    const claims: AuthClaims = {
      userId: 'user-empty',
      tenantId: 'tenant-empty',
      scopes: [],
      roles: [],
      permissions: [],
      isM2M: false,
      issuedAt: 0,
      expiresAt: 0,
      issuer: '',
      raw: {},
      token: '',
    }

    expect(claims.scopes).toEqual([])
    expect(claims.roles).toEqual([])
    expect(claims.permissions).toEqual([])
  })

  it('should support multiple scopes', () => {
    const claims: AuthClaims = {
      userId: 'user-multi',
      tenantId: 'tenant-multi',
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      roles: ['admin', 'editor', 'viewer'],
      permissions: ['users:read', 'users:write', 'users:delete', 'admin:access'],
      isM2M: false,
      issuedAt: 1700000000,
      expiresAt: 1700003600,
      issuer: 'https://auth.example.com',
      raw: { sub: 'user-multi' },
      token: 'tok',
    }

    expect(claims.scopes).toHaveLength(4)
    expect(claims.roles).toHaveLength(3)
    expect(claims.permissions).toHaveLength(4)
  })

  it('should hold the original token string', () => {
    const originalToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.payload.signature'
    const claims: AuthClaims = {
      userId: 'u',
      tenantId: 't',
      scopes: [],
      roles: [],
      permissions: [],
      isM2M: false,
      issuedAt: 0,
      expiresAt: 0,
      issuer: '',
      raw: {},
      token: originalToken,
    }

    expect(claims.token).toBe(originalToken)
    expect(claims.token.split('.')).toHaveLength(3)
  })

  it('should store raw JWT payload for custom claim access', () => {
    const raw: JWTPayload = {
      sub: 'user-raw',
      tid: 'tenant-raw',
      custom_claim: 'custom_value',
      org_id: 'org-123',
    }

    const claims: AuthClaims = {
      userId: 'user-raw',
      tenantId: 'tenant-raw',
      scopes: [],
      roles: [],
      permissions: [],
      isM2M: false,
      issuedAt: 0,
      expiresAt: 0,
      issuer: '',
      raw,
      token: '',
    }

    expect(claims.raw['custom_claim']).toBe('custom_value')
    expect(claims.raw['org_id']).toBe('org-123')
  })
})

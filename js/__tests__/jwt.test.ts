import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { decodeJWTPayload, isTokenExpired, getTokenExpiresIn } from '../src/jwt'

// ---------------------------------------------------------------------------
// Helper: build a fake 3-part JWT with base64url encoding
// ---------------------------------------------------------------------------
function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function fakeJWT(payload: Record<string, any>): string {
  const header = { alg: 'EdDSA', typ: 'JWT' }
  const h = base64UrlEncode(JSON.stringify(header))
  const p = base64UrlEncode(JSON.stringify(payload))
  return `${h}.${p}.fake-signature`
}

// ---------------------------------------------------------------------------
// decodeJWTPayload
// ---------------------------------------------------------------------------
describe('decodeJWTPayload', () => {
  it('decodes a valid JWT payload', () => {
    const payload = {
      sub: 'user-123',
      iss: 'https://auth.example.com',
      exp: 9999999999,
      iat: 1700000000,
      email: 'test@example.com',
    }
    const token = fakeJWT(payload)
    const result = decodeJWTPayload(token)

    expect(result).not.toBeNull()
    expect(result!.sub).toBe('user-123')
    expect(result!.iss).toBe('https://auth.example.com')
    expect(result!.exp).toBe(9999999999)
    expect(result!.email).toBe('test@example.com')
  })

  it('returns null for a completely malformed string', () => {
    expect(decodeJWTPayload('not-a-jwt')).toBeNull()
  })

  it('returns null for a 2-part token (missing signature)', () => {
    const h = base64UrlEncode(JSON.stringify({ alg: 'EdDSA' }))
    const p = base64UrlEncode(JSON.stringify({ sub: 'x' }))
    expect(decodeJWTPayload(`${h}.${p}`)).toBeNull()
  })

  it('returns null for a token with invalid base64 payload', () => {
    expect(decodeJWTPayload('aaa.!!!invalid!!!.ccc')).toBeNull()
  })

  it('returns null for a token with non-JSON payload', () => {
    const h = base64UrlEncode(JSON.stringify({ alg: 'EdDSA' }))
    const p = base64UrlEncode('this is not json')
    expect(decodeJWTPayload(`${h}.${p}.sig`)).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(decodeJWTPayload('')).toBeNull()
  })

  it('handles JWT with extra custom claims', () => {
    const payload = { sub: 'u1', exp: 99999, tid: 'tenant-abc', role: 'admin' }
    const result = decodeJWTPayload(fakeJWT(payload))
    expect(result!.tid).toBe('tenant-abc')
    expect(result!.role).toBe('admin')
  })
})

// ---------------------------------------------------------------------------
// isTokenExpired
// ---------------------------------------------------------------------------
describe('isTokenExpired', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns true for an expired token', () => {
    vi.setSystemTime(new Date('2025-06-01T00:00:00Z'))
    const nowSec = Math.floor(Date.now() / 1000)
    // Expired 1 hour ago
    const token = fakeJWT({ sub: 'u', exp: nowSec - 3600 })
    expect(isTokenExpired(token)).toBe(true)
  })

  it('returns false for a valid (future) token', () => {
    vi.setSystemTime(new Date('2025-06-01T00:00:00Z'))
    const nowSec = Math.floor(Date.now() / 1000)
    // Expires in 1 hour
    const token = fakeJWT({ sub: 'u', exp: nowSec + 3600 })
    expect(isTokenExpired(token)).toBe(false)
  })

  it('accounts for default 30-second clock skew', () => {
    vi.setSystemTime(new Date('2025-06-01T00:00:00Z'))
    const nowSec = Math.floor(Date.now() / 1000)
    // Expires exactly 20 seconds from now: within 30s skew => expired
    const token = fakeJWT({ sub: 'u', exp: nowSec + 20 })
    expect(isTokenExpired(token)).toBe(true)
  })

  it('respects custom clock skew', () => {
    vi.setSystemTime(new Date('2025-06-01T00:00:00Z'))
    const nowSec = Math.floor(Date.now() / 1000)
    // Expires in 20s, with 10s skew: 20 > 10 => not expired
    const token = fakeJWT({ sub: 'u', exp: nowSec + 20 })
    expect(isTokenExpired(token, 10)).toBe(false)
  })

  it('returns true for a malformed token', () => {
    expect(isTokenExpired('garbage')).toBe(true)
  })

  it('returns true for a token without exp claim', () => {
    const token = fakeJWT({ sub: 'u' }) // no exp
    expect(isTokenExpired(token)).toBe(true)
  })

  it('returns true when exp equals now + skew (boundary)', () => {
    vi.setSystemTime(new Date('2025-06-01T00:00:00Z'))
    const nowSec = Math.floor(Date.now() / 1000)
    // exp == now + 30 => payload.exp <= nowSeconds + clockSkewSeconds => expired
    const token = fakeJWT({ sub: 'u', exp: nowSec + 30 })
    expect(isTokenExpired(token, 30)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// getTokenExpiresIn
// ---------------------------------------------------------------------------
describe('getTokenExpiresIn', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns milliseconds until expiry for a valid token', () => {
    vi.setSystemTime(new Date('2025-06-01T00:00:00Z'))
    const nowSec = Math.floor(Date.now() / 1000)
    const token = fakeJWT({ sub: 'u', exp: nowSec + 3600 })
    const ms = getTokenExpiresIn(token)
    expect(ms).toBe(3600 * 1000)
  })

  it('returns 0 for an expired token', () => {
    vi.setSystemTime(new Date('2025-06-01T00:00:00Z'))
    const nowSec = Math.floor(Date.now() / 1000)
    const token = fakeJWT({ sub: 'u', exp: nowSec - 100 })
    expect(getTokenExpiresIn(token)).toBe(0)
  })

  it('returns 0 for a malformed token', () => {
    expect(getTokenExpiresIn('garbage')).toBe(0)
  })

  it('returns 0 for a token without exp', () => {
    const token = fakeJWT({ sub: 'u' })
    expect(getTokenExpiresIn(token)).toBe(0)
  })

  it('decreases over time', () => {
    vi.setSystemTime(new Date('2025-06-01T00:00:00Z'))
    const nowSec = Math.floor(Date.now() / 1000)
    const token = fakeJWT({ sub: 'u', exp: nowSec + 100 })

    const first = getTokenExpiresIn(token)
    vi.advanceTimersByTime(50_000) // advance 50s
    const second = getTokenExpiresIn(token)

    expect(second).toBe(first - 50_000)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { createServerClient } from '../src/server'
import type { ServerClient } from '../src/server'

/** Helper to create a base64url-encoded JWT token with the given payload. */
function makeJWT(payload: Record<string, any>): string {
  const header = { alg: 'EdDSA', typ: 'JWT' }

  function toBase64Url(obj: Record<string, any>): string {
    const json = JSON.stringify(obj)
    // Use btoa (available in jsdom) and convert to base64url
    const b64 = btoa(json)
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  const headerB64 = toBase64Url(header)
  const payloadB64 = toBase64Url(payload)
  const signature = 'fake-signature'

  return `${headerB64}.${payloadB64}.${signature}`
}

/** Helper to create a mock cookie store. */
function makeCookieStore(cookies: Record<string, string>) {
  return {
    get(name: string) {
      if (name in cookies) {
        return { value: cookies[name] }
      }
      return undefined
    },
  }
}

describe('createServerClient', () => {
  it('returns a valid ServerClient object', () => {
    const client = createServerClient({
      domain: 'https://auth.example.com',
      cookies: makeCookieStore({}),
    })

    expect(client).toHaveProperty('getSession')
    expect(client).toHaveProperty('getAccessToken')
    expect(typeof client.getSession).toBe('function')
    expect(typeof client.getAccessToken).toBe('function')
  })

  it('returns session with user data when valid cookie is present', () => {
    const payload = {
      sub: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      iat: Math.floor(Date.now() / 1000),
    }
    const token = makeJWT(payload)

    const client = createServerClient({
      domain: 'https://auth.example.com',
      cookies: makeCookieStore({ 'hj:token': token }),
    })

    const session = client.getSession()

    expect(session).not.toBeNull()
    expect(session!.accessToken).toBe(token)
    expect(session!.user.sub).toBe('user-123')
    expect(session!.user.email).toBe('test@example.com')
    expect(session!.user.name).toBe('Test User')
  })

  it('returns null session when no cookie is present', () => {
    const client = createServerClient({
      domain: 'https://auth.example.com',
      cookies: makeCookieStore({}),
    })

    const session = client.getSession()

    expect(session).toBeNull()
  })

  it('returns null when cookie has invalid JWT (not 3 parts)', () => {
    const client = createServerClient({
      domain: 'https://auth.example.com',
      cookies: makeCookieStore({ 'hj:token': 'not-a-jwt' }),
    })

    const session = client.getSession()

    expect(session).toBeNull()
  })

  it('returns null when cookie has malformed base64 payload', () => {
    const client = createServerClient({
      domain: 'https://auth.example.com',
      cookies: makeCookieStore({ 'hj:token': 'header.!!!invalid-base64!!!.signature' }),
    })

    const session = client.getSession()

    expect(session).toBeNull()
  })

  it('returns null when JWT payload is not valid JSON', () => {
    // Create a token where payload decodes to non-JSON
    const notJson = btoa('this is not json').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const token = `eyJhbGciOiJFZERTQSJ9.${notJson}.signature`

    const client = createServerClient({
      domain: 'https://auth.example.com',
      cookies: makeCookieStore({ 'hj:token': token }),
    })

    const session = client.getSession()

    expect(session).toBeNull()
  })

  it('properly decodes JWT payload with special characters', () => {
    const payload = {
      sub: 'user-456',
      email: 'unicode+test@example.com',
      name: 'Jose Garcia',
      'https://hellojohn.dev/claims/sys': {
        roles: ['admin'],
        perms: ['users:write'],
        is_admin: true,
      },
    }
    const token = makeJWT(payload)

    const client = createServerClient({
      domain: 'https://auth.example.com',
      cookies: makeCookieStore({ 'hj:token': token }),
    })

    const session = client.getSession()

    expect(session).not.toBeNull()
    expect(session!.user.sub).toBe('user-456')
    expect(session!.user['https://hellojohn.dev/claims/sys']).toEqual({
      roles: ['admin'],
      perms: ['users:write'],
      is_admin: true,
    })
  })

  it('getAccessToken returns the raw token string', () => {
    const token = makeJWT({ sub: 'user-789' })

    const client = createServerClient({
      domain: 'https://auth.example.com',
      cookies: makeCookieStore({ 'hj:token': token }),
    })

    expect(client.getAccessToken()).toBe(token)
  })

  it('getAccessToken returns null when no cookie exists', () => {
    const client = createServerClient({
      domain: 'https://auth.example.com',
      cookies: makeCookieStore({}),
    })

    expect(client.getAccessToken()).toBeNull()
  })

  it('handles base64url encoding with padding variations', () => {
    // Create a payload that produces padding characters
    const payload = { sub: 'a', x: 'y' }
    const token = makeJWT(payload)

    const client = createServerClient({
      domain: 'https://auth.example.com',
      cookies: makeCookieStore({ 'hj:token': token }),
    })

    const session = client.getSession()

    expect(session).not.toBeNull()
    expect(session!.user.sub).toBe('a')
  })
})

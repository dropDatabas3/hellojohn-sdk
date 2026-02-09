import { describe, it, expect } from 'vitest'
import { generateCodeVerifier, generateCodeChallenge, generateState } from '../src/pkce'

// URL-safe base64 characters: A-Z a-z 0-9 - _
const BASE64URL_REGEX = /^[A-Za-z0-9_-]+$/

describe('generateCodeVerifier', () => {
  it('returns a non-empty string', async () => {
    const verifier = await generateCodeVerifier()
    expect(verifier.length).toBeGreaterThan(0)
  })

  it('returns a base64url-safe string (no +, /, =)', async () => {
    const verifier = await generateCodeVerifier()
    expect(verifier).toMatch(BASE64URL_REGEX)
    expect(verifier).not.toContain('+')
    expect(verifier).not.toContain('/')
    expect(verifier).not.toContain('=')
  })

  it('returns a string of correct length (43 chars for 32 bytes)', async () => {
    const verifier = await generateCodeVerifier()
    // 32 bytes -> ceil(32 * 4/3) = 43 base64 chars (no padding)
    expect(verifier.length).toBe(43)
  })

  it('generates unique values across calls', async () => {
    const a = await generateCodeVerifier()
    const b = await generateCodeVerifier()
    expect(a).not.toBe(b)
  })

  it('generates values with sufficient entropy (not all same char)', async () => {
    const verifier = await generateCodeVerifier()
    const uniqueChars = new Set(verifier.split(''))
    expect(uniqueChars.size).toBeGreaterThan(5)
  })
})

describe('generateCodeChallenge', () => {
  it('returns a non-empty string', async () => {
    const verifier = await generateCodeVerifier()
    const challenge = await generateCodeChallenge(verifier)
    expect(challenge.length).toBeGreaterThan(0)
  })

  it('returns a base64url-safe string', async () => {
    const verifier = await generateCodeVerifier()
    const challenge = await generateCodeChallenge(verifier)
    expect(challenge).toMatch(BASE64URL_REGEX)
  })

  it('returns a value different from the verifier', async () => {
    const verifier = await generateCodeVerifier()
    const challenge = await generateCodeChallenge(verifier)
    expect(challenge).not.toBe(verifier)
  })

  it('returns a SHA-256 digest length (43 chars for 32 bytes)', async () => {
    const verifier = await generateCodeVerifier()
    const challenge = await generateCodeChallenge(verifier)
    // SHA-256 = 32 bytes -> 43 base64url chars
    expect(challenge.length).toBe(43)
  })

  it('is deterministic (same verifier gives same challenge)', async () => {
    const verifier = await generateCodeVerifier()
    const c1 = await generateCodeChallenge(verifier)
    const c2 = await generateCodeChallenge(verifier)
    expect(c1).toBe(c2)
  })

  it('different verifiers produce different challenges', async () => {
    const v1 = await generateCodeVerifier()
    const v2 = await generateCodeVerifier()
    const c1 = await generateCodeChallenge(v1)
    const c2 = await generateCodeChallenge(v2)
    expect(c1).not.toBe(c2)
  })
})

describe('generateState', () => {
  it('returns a non-empty string', () => {
    const state = generateState()
    expect(state.length).toBeGreaterThan(0)
  })

  it('returns a base64url-safe string', () => {
    const state = generateState()
    expect(state).toMatch(BASE64URL_REGEX)
  })

  it('returns a string of correct length (43 chars for 32 bytes)', () => {
    const state = generateState()
    expect(state.length).toBe(43)
  })

  it('generates unique values across calls', () => {
    const a = generateState()
    const b = generateState()
    expect(a).not.toBe(b)
  })

  it('contains no padding characters', () => {
    const state = generateState()
    expect(state).not.toContain('=')
  })
})

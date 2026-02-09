import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TokenManager } from '../src/token-manager'
import { AuthEventEmitter } from '../src/event-emitter'
import { createMemoryStorageAdapter } from '../src/storage'
import { TokenError } from '../src/errors'
import type { TokenResponse } from '../src/types'

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

function makeTokens(overrides?: Partial<TokenResponse & { expIn?: number }>): TokenResponse {
  const nowSec = Math.floor(Date.now() / 1000)
  const exp = nowSec + (overrides?.expIn ?? 3600)
  return {
    access_token: overrides?.access_token ?? fakeJWT({ sub: 'user-1', exp }),
    refresh_token: overrides?.refresh_token ?? 'rt_test_refresh',
    id_token: overrides?.id_token,
    scope: overrides?.scope ?? 'openid profile',
    expires_in: overrides?.expires_in ?? 3600,
    token_type: overrides?.token_type ?? 'Bearer',
  }
}

function createManager(opts?: { autoRefresh?: boolean }) {
  const storage = createMemoryStorageAdapter()
  const emitter = new AuthEventEmitter()
  const tm = new TokenManager({
    domain: 'https://auth.example.com',
    clientId: 'test-client',
    storage,
    emitter,
    autoRefresh: opts?.autoRefresh ?? false, // disable auto-refresh by default in tests
  })
  return { tm, storage, emitter }
}

describe('TokenManager', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // -------------------------------------------------------------------------
  // getStoredTokens
  // -------------------------------------------------------------------------
  describe('getStoredTokens', () => {
    it('returns null when nothing is stored', () => {
      const { tm } = createManager()
      expect(tm.getStoredTokens()).toBeNull()
    })

    it('returns parsed tokens after setTokens', () => {
      const { tm } = createManager()
      const tokens = makeTokens()
      tm.setTokens(tokens)
      const stored = tm.getStoredTokens()
      expect(stored).not.toBeNull()
      expect(stored!.access_token).toBe(tokens.access_token)
      expect(stored!.refresh_token).toBe(tokens.refresh_token)
    })

    it('returns null if storage contains invalid JSON', () => {
      const { tm, storage } = createManager()
      storage.set('hj:token', 'not-json')
      expect(tm.getStoredTokens()).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // setTokens
  // -------------------------------------------------------------------------
  describe('setTokens', () => {
    it('stores tokens in storage', () => {
      const { tm, storage } = createManager()
      const tokens = makeTokens()
      tm.setTokens(tokens)
      const raw = storage.get('hj:token')
      expect(raw).not.toBeNull()
      expect(JSON.parse(raw!)).toEqual(tokens)
    })

    it('schedules refresh when autoRefresh is true', () => {
      const { tm } = createManager({ autoRefresh: true })
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')

      const tokens = makeTokens()
      tm.setTokens(tokens)

      // scheduleRefresh should have been called, which uses setTimeout
      expect(setTimeoutSpy).toHaveBeenCalled()
    })

    it('does not schedule refresh when autoRefresh is false', () => {
      const { tm } = createManager({ autoRefresh: false })
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')

      const tokens = makeTokens()
      tm.setTokens(tokens)

      // setTimeout should not have been called by scheduleRefresh
      // (Note: vitest fake timers may use setTimeout internally, so check call count)
      const callsBefore = setTimeoutSpy.mock.calls.length
      tm.setTokens(tokens)
      expect(setTimeoutSpy.mock.calls.length).toBe(callsBefore)
    })
  })

  // -------------------------------------------------------------------------
  // clearTokens
  // -------------------------------------------------------------------------
  describe('clearTokens', () => {
    it('removes tokens from storage', () => {
      const { tm } = createManager()
      tm.setTokens(makeTokens())
      expect(tm.getStoredTokens()).not.toBeNull()

      tm.clearTokens()
      expect(tm.getStoredTokens()).toBeNull()
    })

    it('cancels scheduled refresh timer', () => {
      const { tm } = createManager({ autoRefresh: true })
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

      tm.setTokens(makeTokens())
      tm.clearTokens()

      expect(clearTimeoutSpy).toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // isAuthenticated
  // -------------------------------------------------------------------------
  describe('isAuthenticated', () => {
    it('returns false when no tokens stored', () => {
      const { tm } = createManager()
      expect(tm.isAuthenticated()).toBe(false)
    })

    it('returns true when valid (non-expired) token is stored', () => {
      const { tm } = createManager()
      tm.setTokens(makeTokens({ expIn: 3600 }))
      expect(tm.isAuthenticated()).toBe(true)
    })

    it('returns false when token is expired', () => {
      const { tm } = createManager()
      tm.setTokens(makeTokens({ expIn: -100 })) // expired 100s ago
      expect(tm.isAuthenticated()).toBe(false)
    })

    it('returns false when token has no access_token', () => {
      const { tm, storage } = createManager()
      storage.set('hj:token', JSON.stringify({ refresh_token: 'rt' }))
      expect(tm.isAuthenticated()).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // getAccessToken
  // -------------------------------------------------------------------------
  describe('getAccessToken', () => {
    it('returns the access token if valid', async () => {
      const { tm } = createManager()
      const tokens = makeTokens({ expIn: 3600 })
      tm.setTokens(tokens)

      const result = await tm.getAccessToken()
      expect(result).toBe(tokens.access_token)
    })

    it('throws TokenError if no tokens stored', async () => {
      const { tm } = createManager()
      await expect(tm.getAccessToken()).rejects.toThrow(TokenError)
      await expect(tm.getAccessToken()).rejects.toThrow('No access token available')
    })

    it('fires SESSION_EXPIRED and throws when expired with no refresh token', async () => {
      const { tm, emitter } = createManager()
      const listener = vi.fn()
      emitter.on(listener)

      // Store expired token without refresh_token
      const nowSec = Math.floor(Date.now() / 1000)
      const expiredToken = fakeJWT({ sub: 'u', exp: nowSec - 100 })
      tm.setTokens({
        access_token: expiredToken,
        scope: 'openid',
        expires_in: 0,
        token_type: 'Bearer',
      } as TokenResponse)

      await expect(tm.getAccessToken()).rejects.toThrow('Session expired')
      expect(listener).toHaveBeenCalledWith('SESSION_EXPIRED', null)
    })

    it('attempts refresh when token expired but refresh_token exists', async () => {
      const { tm } = createManager()
      const nowSec = Math.floor(Date.now() / 1000)
      const expiredToken = fakeJWT({ sub: 'u', exp: nowSec - 100 })
      const freshToken = fakeJWT({ sub: 'u', exp: nowSec + 7200 })

      tm.setTokens({
        access_token: expiredToken,
        refresh_token: 'rt_valid',
        scope: 'openid',
        expires_in: 0,
        token_type: 'Bearer',
      })

      // Mock fetch for refresh endpoint
      const refreshResponse = {
        access_token: freshToken,
        scope: 'openid',
        expires_in: 7200,
        token_type: 'Bearer',
      }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
        new Response(JSON.stringify(refreshResponse), { status: 200 })
      ))

      const result = await tm.getAccessToken()
      expect(result).toBe(freshToken)
    })
  })

  // -------------------------------------------------------------------------
  // buildSession
  // -------------------------------------------------------------------------
  describe('buildSession', () => {
    it('returns null when no tokens stored', () => {
      const { tm } = createManager()
      expect(tm.buildSession()).toBeNull()
    })

    it('builds session from stored tokens', () => {
      const { tm } = createManager()
      const nowSec = Math.floor(Date.now() / 1000)
      const payload = { sub: 'user-1', email: 'test@test.com', name: 'Test', exp: nowSec + 3600 }
      const tokens = makeTokens({ access_token: fakeJWT(payload) })
      tm.setTokens(tokens)

      const session = tm.buildSession()
      expect(session).not.toBeNull()
      expect(session!.accessToken).toBe(tokens.access_token)
      expect(session!.refreshToken).toBe(tokens.refresh_token)
      expect(session!.user.sub).toBe('user-1')
      expect(session!.user.email).toBe('test@test.com')
      expect(session!.expiresAt).toBe(payload.exp)
    })
  })

  // -------------------------------------------------------------------------
  // destroy
  // -------------------------------------------------------------------------
  describe('destroy', () => {
    it('cancels refresh timer', () => {
      const { tm } = createManager({ autoRefresh: true })
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

      tm.setTokens(makeTokens())
      tm.destroy()

      expect(clearTimeoutSpy).toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // refreshSession
  // -------------------------------------------------------------------------
  describe('refreshSession', () => {
    it('throws if no refresh token available', async () => {
      const { tm } = createManager()
      const nowSec = Math.floor(Date.now() / 1000)
      tm.setTokens({
        access_token: fakeJWT({ sub: 'u', exp: nowSec + 3600 }),
        scope: 'openid',
        expires_in: 3600,
        token_type: 'Bearer',
      } as TokenResponse)

      await expect(tm.refreshSession()).rejects.toThrow('No refresh token available')
    })

    it('calls the refresh endpoint and updates stored tokens', async () => {
      const { tm } = createManager()
      const nowSec = Math.floor(Date.now() / 1000)
      const freshToken = fakeJWT({ sub: 'u', exp: nowSec + 7200 })

      tm.setTokens(makeTokens())

      const refreshResponse = {
        access_token: freshToken,
        refresh_token: 'rt_new',
        scope: 'openid',
        expires_in: 7200,
        token_type: 'Bearer',
      }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
        new Response(JSON.stringify(refreshResponse), { status: 200 })
      ))

      const result = await tm.refreshSession()
      expect(result.access_token).toBe(freshToken)
      expect(result.refresh_token).toBe('rt_new')

      // Tokens should be updated in storage
      const stored = tm.getStoredTokens()
      expect(stored!.access_token).toBe(freshToken)
    })
  })
})

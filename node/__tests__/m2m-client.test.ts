import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { M2MClient, createM2MClient } from '../src/m2m-client'
import { M2MAuthError } from '../src/errors'

const DEFAULT_OPTS = {
  domain: 'https://auth.example.com',
  tenantId: 'acme',
  clientId: 'client-123',
  clientSecret: 'secret-456',
}

function mockFetchResponse(data: Record<string, unknown>, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Bad Request',
    json: vi.fn().mockResolvedValue(data),
  })
}

describe('M2MClient', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T00:00:00Z'))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('constructor validation', () => {
    it('should throw M2MAuthError when domain is empty', () => {
      expect(() => new M2MClient({
        ...DEFAULT_OPTS,
        domain: '',
      })).toThrow(M2MAuthError)
      expect(() => new M2MClient({
        ...DEFAULT_OPTS,
        domain: '',
      })).toThrow('domain is required')
    })

    it('should throw M2MAuthError when clientId is empty', () => {
      expect(() => new M2MClient({
        ...DEFAULT_OPTS,
        clientId: '',
      })).toThrow(M2MAuthError)
      expect(() => new M2MClient({
        ...DEFAULT_OPTS,
        clientId: '',
      })).toThrow('clientId is required')
    })

    it('should throw M2MAuthError when clientSecret is empty', () => {
      expect(() => new M2MClient({
        ...DEFAULT_OPTS,
        clientSecret: '',
      })).toThrow(M2MAuthError)
      expect(() => new M2MClient({
        ...DEFAULT_OPTS,
        clientSecret: '',
      })).toThrow('clientSecret is required')
    })

    it('should strip trailing slash from domain', () => {
      const fetchMock = mockFetchResponse({
        access_token: 'tok',
        expires_in: 3600,
      })
      vi.stubGlobal('fetch', fetchMock)

      const client = new M2MClient({
        ...DEFAULT_OPTS,
        domain: 'https://auth.example.com/',
      })
      // We verify it by calling getToken and checking the URL
      client.getToken()
      expect(fetchMock).toHaveBeenCalledWith(
        'https://auth.example.com/oauth2/token',
        expect.any(Object)
      )
    })

    it('should accept valid options without throwing', () => {
      expect(() => new M2MClient(DEFAULT_OPTS)).not.toThrow()
    })
  })

  describe('createM2MClient factory', () => {
    it('should return an instance of M2MClient', () => {
      const client = createM2MClient(DEFAULT_OPTS)
      expect(client).toBeInstanceOf(M2MClient)
    })
  })

  describe('getToken', () => {
    it('should call /oauth2/token with correct parameters', async () => {
      const fetchMock = mockFetchResponse({
        access_token: 'access-token-value',
        expires_in: 3600,
      })
      vi.stubGlobal('fetch', fetchMock)

      const client = new M2MClient(DEFAULT_OPTS)
      await client.getToken()

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://auth.example.com/oauth2/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        })
      )

      // Verify the body params
      const callArgs = fetchMock.mock.calls[0]
      const body = callArgs[1].body as URLSearchParams
      expect(body.get('grant_type')).toBe('client_credentials')
      expect(body.get('client_id')).toBe('client-123')
      expect(body.get('client_secret')).toBe('secret-456')
    })

    it('should return accessToken and expiresAt', async () => {
      vi.stubGlobal('fetch', mockFetchResponse({
        access_token: 'my-token',
        expires_in: 3600,
      }))

      const client = new M2MClient(DEFAULT_OPTS)
      const result = await client.getToken()

      expect(result.accessToken).toBe('my-token')
      // expiresAt should be now + 3600 seconds
      const expectedExpiresAt = Math.floor(Date.now() / 1000) + 3600
      expect(result.expiresAt).toBe(expectedExpiresAt)
    })

    it('should cache token and return cached on subsequent calls', async () => {
      const fetchMock = mockFetchResponse({
        access_token: 'cached-token',
        expires_in: 3600,
      })
      vi.stubGlobal('fetch', fetchMock)

      const client = new M2MClient(DEFAULT_OPTS)
      const first = await client.getToken()
      const second = await client.getToken()

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(first.accessToken).toBe('cached-token')
      expect(second.accessToken).toBe('cached-token')
    })

    it('should re-fetch when cached token is within 60 seconds of expiry', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            access_token: 'first-token',
            expires_in: 120,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            access_token: 'second-token',
            expires_in: 3600,
          }),
        })
      vi.stubGlobal('fetch', fetchMock)

      const client = new M2MClient(DEFAULT_OPTS)
      const first = await client.getToken()
      expect(first.accessToken).toBe('first-token')

      // Advance time by 61 seconds -- token has 120s TTL, so 59s left, < 60s buffer
      vi.advanceTimersByTime(61 * 1000)

      const second = await client.getToken()
      expect(second.accessToken).toBe('second-token')
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('should send X-Tenant-Slug header when tenantId is set', async () => {
      const fetchMock = mockFetchResponse({
        access_token: 'tenant-token',
        expires_in: 3600,
      })
      vi.stubGlobal('fetch', fetchMock)

      const client = new M2MClient(DEFAULT_OPTS)
      await client.getToken()

      const callArgs = fetchMock.mock.calls[0]
      expect(callArgs[1].headers['X-Tenant-Slug']).toBe('acme')
    })

    it('should NOT send X-Tenant-Slug header when tenantId is empty', async () => {
      const fetchMock = mockFetchResponse({
        access_token: 'no-tenant-token',
        expires_in: 3600,
      })
      vi.stubGlobal('fetch', fetchMock)

      const client = new M2MClient({
        ...DEFAULT_OPTS,
        tenantId: '',
      })
      await client.getToken()

      const callArgs = fetchMock.mock.calls[0]
      expect(callArgs[1].headers['X-Tenant-Slug']).toBeUndefined()
    })

    it('should send scope parameter when scopes are provided', async () => {
      const fetchMock = mockFetchResponse({
        access_token: 'scoped-token',
        expires_in: 3600,
        scope: 'read write',
      })
      vi.stubGlobal('fetch', fetchMock)

      const client = new M2MClient(DEFAULT_OPTS)
      await client.getToken({ scopes: ['read', 'write'] })

      const callArgs = fetchMock.mock.calls[0]
      const body = callArgs[1].body as URLSearchParams
      expect(body.get('scope')).toBe('read write')
    })

    it('should NOT send scope parameter when scopes is empty', async () => {
      const fetchMock = mockFetchResponse({
        access_token: 'noscope-token',
        expires_in: 3600,
      })
      vi.stubGlobal('fetch', fetchMock)

      const client = new M2MClient(DEFAULT_OPTS)
      await client.getToken({ scopes: [] })

      const callArgs = fetchMock.mock.calls[0]
      const body = callArgs[1].body as URLSearchParams
      expect(body.get('scope')).toBeNull()
    })

    it('should cache tokens separately by scope key', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            access_token: 'token-read',
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            access_token: 'token-write',
            expires_in: 3600,
          }),
        })
      vi.stubGlobal('fetch', fetchMock)

      const client = new M2MClient(DEFAULT_OPTS)
      const first = await client.getToken({ scopes: ['read'] })
      const second = await client.getToken({ scopes: ['write'] })

      expect(first.accessToken).toBe('token-read')
      expect(second.accessToken).toBe('token-write')
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('should default expires_in to 3600 when not provided', async () => {
      vi.stubGlobal('fetch', mockFetchResponse({
        access_token: 'default-ttl',
      }))

      const client = new M2MClient(DEFAULT_OPTS)
      const result = await client.getToken()

      const expectedExpiresAt = Math.floor(Date.now() / 1000) + 3600
      expect(result.expiresAt).toBe(expectedExpiresAt)
    })

    it('should throw M2MAuthError on non-200 response', async () => {
      vi.stubGlobal('fetch', mockFetchResponse(
        { error: 'invalid_client' },
        401
      ))

      const client = new M2MClient(DEFAULT_OPTS)
      await expect(client.getToken()).rejects.toThrow(M2MAuthError)
      await expect(client.getToken()).rejects.toThrow('M2M auth failed')
    })

    it('should handle non-JSON error response gracefully', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockRejectedValue(new Error('not json')),
      }))

      const client = new M2MClient(DEFAULT_OPTS)
      await expect(client.getToken()).rejects.toThrow(M2MAuthError)
      await expect(client.getToken()).rejects.toThrow('Internal Server Error')
    })
  })

  describe('clearCache', () => {
    it('should clear all cached tokens', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            access_token: 'first',
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            access_token: 'second',
            expires_in: 3600,
          }),
        })
      vi.stubGlobal('fetch', fetchMock)

      const client = new M2MClient(DEFAULT_OPTS)
      const first = await client.getToken()
      expect(first.accessToken).toBe('first')

      client.clearCache()

      const second = await client.getToken()
      expect(second.accessToken).toBe('second')
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
  })

  describe('fetch', () => {
    it('should inject Bearer token into request headers', async () => {
      const tokenFetch = mockFetchResponse({
        access_token: 'bearer-token',
        expires_in: 3600,
      })

      // fetch is called twice: once for getToken, once for the actual fetch
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            access_token: 'bearer-token',
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: 'result' }),
        })
      vi.stubGlobal('fetch', fetchMock)

      const client = new M2MClient(DEFAULT_OPTS)
      await client.fetch('https://api.example.com/data')

      // Second call is the actual fetch with Bearer header
      const secondCall = fetchMock.mock.calls[1]
      expect(secondCall[0]).toBe('https://api.example.com/data')
      const headers = secondCall[1].headers as Headers
      expect(headers.get('Authorization')).toBe('Bearer bearer-token')
    })

    it('should preserve existing init options when fetching', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            access_token: 'bearer-token',
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({}),
        })
      vi.stubGlobal('fetch', fetchMock)

      const client = new M2MClient(DEFAULT_OPTS)
      await client.fetch('https://api.example.com/data', {
        method: 'POST',
        body: JSON.stringify({ key: 'value' }),
      })

      const secondCall = fetchMock.mock.calls[1]
      expect(secondCall[1].method).toBe('POST')
      expect(secondCall[1].body).toBe(JSON.stringify({ key: 'value' }))
    })
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createFetchWrapper } from '../src/fetch-wrapper'

describe('createFetchWrapper', () => {
  const mockResponse = new Response(JSON.stringify({ ok: true }), { status: 200 })

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('injects Bearer token into requests', async () => {
    const getAccessToken = vi.fn().mockResolvedValue('my-token-123')
    const authedFetch = createFetchWrapper(getAccessToken)

    await authedFetch('https://api.example.com/data')

    expect(fetch).toHaveBeenCalledOnce()
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const headers = new Headers(init.headers)
    expect(headers.get('Authorization')).toBe('Bearer my-token-123')
  })

  it('calls getAccessToken for every request', async () => {
    const getAccessToken = vi.fn()
      .mockResolvedValueOnce('token-1')
      .mockResolvedValueOnce('token-2')
    const authedFetch = createFetchWrapper(getAccessToken)

    await authedFetch('https://api.example.com/first')
    await authedFetch('https://api.example.com/second')

    expect(getAccessToken).toHaveBeenCalledTimes(2)

    const [, init1] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const [, init2] = (fetch as ReturnType<typeof vi.fn>).mock.calls[1]
    expect(new Headers(init1.headers).get('Authorization')).toBe('Bearer token-1')
    expect(new Headers(init2.headers).get('Authorization')).toBe('Bearer token-2')
  })

  it('passes through other init options (method, body)', async () => {
    const getAccessToken = vi.fn().mockResolvedValue('tok')
    const authedFetch = createFetchWrapper(getAccessToken)

    await authedFetch('https://api.example.com/data', {
      method: 'POST',
      body: JSON.stringify({ key: 'value' }),
    })

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('https://api.example.com/data')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify({ key: 'value' }))
  })

  it('merges with existing headers', async () => {
    const getAccessToken = vi.fn().mockResolvedValue('tok')
    const authedFetch = createFetchWrapper(getAccessToken)

    await authedFetch('https://api.example.com/data', {
      headers: { 'Content-Type': 'application/json', 'X-Custom': 'yes' },
    })

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const headers = new Headers(init.headers)
    expect(headers.get('Authorization')).toBe('Bearer tok')
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(headers.get('X-Custom')).toBe('yes')
  })

  it('overrides existing Authorization header', async () => {
    const getAccessToken = vi.fn().mockResolvedValue('fresh-token')
    const authedFetch = createFetchWrapper(getAccessToken)

    await authedFetch('https://api.example.com/data', {
      headers: { Authorization: 'Bearer old-token' },
    })

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const headers = new Headers(init.headers)
    expect(headers.get('Authorization')).toBe('Bearer fresh-token')
  })

  it('returns the fetch Response', async () => {
    const getAccessToken = vi.fn().mockResolvedValue('tok')
    const authedFetch = createFetchWrapper(getAccessToken)

    const response = await authedFetch('https://api.example.com/data')
    expect(response).toBe(mockResponse)
  })

  it('propagates getAccessToken errors', async () => {
    const getAccessToken = vi.fn().mockRejectedValue(new Error('no token'))
    const authedFetch = createFetchWrapper(getAccessToken)

    await expect(authedFetch('https://api.example.com/data')).rejects.toThrow('no token')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('propagates fetch errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const getAccessToken = vi.fn().mockResolvedValue('tok')
    const authedFetch = createFetchWrapper(getAccessToken)

    await expect(authedFetch('https://api.example.com/data')).rejects.toThrow('Failed to fetch')
  })

  it('works with no init parameter', async () => {
    const getAccessToken = vi.fn().mockResolvedValue('tok')
    const authedFetch = createFetchWrapper(getAccessToken)

    await authedFetch('https://api.example.com/data')

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const headers = new Headers(init.headers)
    expect(headers.get('Authorization')).toBe('Bearer tok')
  })
})

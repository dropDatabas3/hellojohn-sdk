import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMFAClient } from '../src/mfa'
import { NetworkError } from '../src/errors'

const DOMAIN = 'https://auth.example.com'
const ACCESS_TOKEN = 'test-access-token-123'

function mockFetchOk(body: object) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  )
}

function mockFetchError(status: number, body: object) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  )
}

describe('createMFAClient', () => {
  let getAccessToken: ReturnType<typeof vi.fn>

  beforeEach(() => {
    getAccessToken = vi.fn().mockResolvedValue(ACCESS_TOKEN)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns an object with all 6 MFA methods', () => {
    const mfa = createMFAClient(DOMAIN, getAccessToken)
    expect(typeof mfa.enrollTOTP).toBe('function')
    expect(typeof mfa.verifyTOTP).toBe('function')
    expect(typeof mfa.challengeTOTP).toBe('function')
    expect(typeof mfa.solveTOTP).toBe('function')
    expect(typeof mfa.disableTOTP).toBe('function')
    expect(typeof mfa.rotateRecoveryCodes).toBe('function')
  })

  // -------------------------------------------------------------------------
  // enrollTOTP
  // -------------------------------------------------------------------------
  describe('enrollTOTP', () => {
    it('calls POST /v2/mfa/totp/enroll with Bearer token', async () => {
      const responseBody = {
        secret: 'JBSWY3DPEHPK3PXP',
        qr_uri: 'otpauth://totp/test?secret=JBSWY3DPEHPK3PXP',
        recovery_codes: ['code1', 'code2'],
      }
      vi.stubGlobal('fetch', mockFetchOk(responseBody))

      const mfa = createMFAClient(DOMAIN, getAccessToken)
      const result = await mfa.enrollTOTP()

      expect(fetch).toHaveBeenCalledOnce()
      const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(url).toBe(`${DOMAIN}/v2/mfa/totp/enroll`)
      expect(init.method).toBe('POST')
      expect(init.headers.Authorization).toBe(`Bearer ${ACCESS_TOKEN}`)
      expect(init.headers['Content-Type']).toBe('application/json')
      expect(result.secret).toBe('JBSWY3DPEHPK3PXP')
      expect(result.recovery_codes).toHaveLength(2)
    })

    it('sends no body', async () => {
      vi.stubGlobal('fetch', mockFetchOk({ secret: 's', qr_uri: 'q', recovery_codes: [] }))
      const mfa = createMFAClient(DOMAIN, getAccessToken)
      await mfa.enrollTOTP()

      const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(init.body).toBeUndefined()
    })
  })

  // -------------------------------------------------------------------------
  // verifyTOTP
  // -------------------------------------------------------------------------
  describe('verifyTOTP', () => {
    it('calls POST /v2/mfa/totp/verify with {code}', async () => {
      vi.stubGlobal('fetch', mockFetchOk({ success: true }))
      const mfa = createMFAClient(DOMAIN, getAccessToken)
      const result = await mfa.verifyTOTP('123456')

      const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(url).toBe(`${DOMAIN}/v2/mfa/totp/verify`)
      expect(init.method).toBe('POST')
      expect(JSON.parse(init.body)).toEqual({ code: '123456' })
      expect(result.success).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // challengeTOTP
  // -------------------------------------------------------------------------
  describe('challengeTOTP', () => {
    it('calls POST /v2/mfa/totp/challenge and returns challenge_id', async () => {
      vi.stubGlobal('fetch', mockFetchOk({ challenge_id: 'ch-abc' }))
      const mfa = createMFAClient(DOMAIN, getAccessToken)
      const result = await mfa.challengeTOTP()

      const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(url).toBe(`${DOMAIN}/v2/mfa/totp/challenge`)
      expect(init.method).toBe('POST')
      expect(init.body).toBeUndefined()
      expect(result.challenge_id).toBe('ch-abc')
    })
  })

  // -------------------------------------------------------------------------
  // solveTOTP
  // -------------------------------------------------------------------------
  describe('solveTOTP', () => {
    it('calls POST /v2/mfa/totp/challenge with {challenge_id, code}', async () => {
      const tokenResp = {
        access_token: 'at_new',
        scope: 'openid',
        expires_in: 3600,
        token_type: 'Bearer',
      }
      vi.stubGlobal('fetch', mockFetchOk(tokenResp))
      const mfa = createMFAClient(DOMAIN, getAccessToken)
      const result = await mfa.solveTOTP('ch-42', '654321')

      const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(url).toBe(`${DOMAIN}/v2/mfa/totp/challenge`)
      expect(JSON.parse(init.body)).toEqual({
        challenge_id: 'ch-42',
        code: '654321',
      })
      expect(result.access_token).toBe('at_new')
    })
  })

  // -------------------------------------------------------------------------
  // disableTOTP
  // -------------------------------------------------------------------------
  describe('disableTOTP', () => {
    it('calls POST /v2/mfa/totp/disable with {code}', async () => {
      // disableTOTP returns void, so the response body is irrelevant
      vi.stubGlobal('fetch', mockFetchOk({}))
      const mfa = createMFAClient(DOMAIN, getAccessToken)
      await mfa.disableTOTP('999999')

      const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(url).toBe(`${DOMAIN}/v2/mfa/totp/disable`)
      expect(JSON.parse(init.body)).toEqual({ code: '999999' })
    })

    it('returns undefined (void)', async () => {
      vi.stubGlobal('fetch', mockFetchOk({}))
      const mfa = createMFAClient(DOMAIN, getAccessToken)
      const result = await mfa.disableTOTP('123456')
      expect(result).toBeUndefined()
    })
  })

  // -------------------------------------------------------------------------
  // rotateRecoveryCodes
  // -------------------------------------------------------------------------
  describe('rotateRecoveryCodes', () => {
    it('calls POST /v2/mfa/recovery/rotate and returns codes', async () => {
      vi.stubGlobal('fetch', mockFetchOk({ codes: ['a1', 'b2', 'c3'] }))
      const mfa = createMFAClient(DOMAIN, getAccessToken)
      const result = await mfa.rotateRecoveryCodes()

      const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(url).toBe(`${DOMAIN}/v2/mfa/recovery/rotate`)
      expect(result.codes).toEqual(['a1', 'b2', 'c3'])
    })
  })

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------
  describe('error handling', () => {
    it('throws NetworkError when fetch throws', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
      const mfa = createMFAClient(DOMAIN, getAccessToken)
      await expect(mfa.enrollTOTP()).rejects.toThrow(NetworkError)
    })

    it('throws parsed API error for non-OK response', async () => {
      vi.stubGlobal('fetch', mockFetchError(400, {
        error: 'invalid_code',
        error_description: 'The TOTP code is invalid',
      }))
      const mfa = createMFAClient(DOMAIN, getAccessToken)
      await expect(mfa.verifyTOTP('000000')).rejects.toThrow('The TOTP code is invalid')
    })

    it('includes Bearer token from getAccessToken in all requests', async () => {
      // Must create a new Response for each call, otherwise body gets consumed
      vi.stubGlobal('fetch', vi.fn(() =>
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      ))
      const mfa = createMFAClient(DOMAIN, getAccessToken)

      await mfa.enrollTOTP()
      await mfa.verifyTOTP('123')
      await mfa.challengeTOTP()
      await mfa.solveTOTP('ch', '123')
      await mfa.disableTOTP('123')
      await mfa.rotateRecoveryCodes()

      expect(getAccessToken).toHaveBeenCalledTimes(6)
      for (const call of (fetch as ReturnType<typeof vi.fn>).mock.calls) {
        expect(call[1].headers.Authorization).toBe(`Bearer ${ACCESS_TOKEN}`)
      }
    })
  })
})

import { describe, it, expect } from 'vitest'
import {
  HelloJohnError,
  AuthenticationError,
  TokenError,
  MFARequiredError,
  NetworkError,
  parseAPIError,
} from '../src/errors'

// ---------------------------------------------------------------------------
// HelloJohnError
// ---------------------------------------------------------------------------
describe('HelloJohnError', () => {
  it('sets message, code, and statusCode', () => {
    const err = new HelloJohnError('something broke', 'broken', 500)
    expect(err.message).toBe('something broke')
    expect(err.code).toBe('broken')
    expect(err.statusCode).toBe(500)
  })

  it('has name "HelloJohnError"', () => {
    const err = new HelloJohnError('msg', 'code')
    expect(err.name).toBe('HelloJohnError')
  })

  it('is an instance of Error', () => {
    const err = new HelloJohnError('msg', 'code')
    expect(err).toBeInstanceOf(Error)
  })

  it('statusCode is optional and defaults to undefined', () => {
    const err = new HelloJohnError('msg', 'code')
    expect(err.statusCode).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// AuthenticationError
// ---------------------------------------------------------------------------
describe('AuthenticationError', () => {
  it('has default code "authentication_error" and statusCode 401', () => {
    const err = new AuthenticationError('bad creds')
    expect(err.code).toBe('authentication_error')
    expect(err.statusCode).toBe(401)
    expect(err.message).toBe('bad creds')
  })

  it('has name "AuthenticationError"', () => {
    const err = new AuthenticationError('msg')
    expect(err.name).toBe('AuthenticationError')
  })

  it('extends HelloJohnError', () => {
    const err = new AuthenticationError('msg')
    expect(err).toBeInstanceOf(HelloJohnError)
  })

  it('allows custom code and statusCode', () => {
    const err = new AuthenticationError('msg', 'custom_code', 403)
    expect(err.code).toBe('custom_code')
    expect(err.statusCode).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// TokenError
// ---------------------------------------------------------------------------
describe('TokenError', () => {
  it('has default code "token_error"', () => {
    const err = new TokenError('expired')
    expect(err.code).toBe('token_error')
    expect(err.message).toBe('expired')
  })

  it('has name "TokenError"', () => {
    const err = new TokenError('msg')
    expect(err.name).toBe('TokenError')
  })

  it('extends HelloJohnError', () => {
    const err = new TokenError('msg')
    expect(err).toBeInstanceOf(HelloJohnError)
  })

  it('allows custom code', () => {
    const err = new TokenError('msg', 'refresh_failed')
    expect(err.code).toBe('refresh_failed')
  })

  it('statusCode is undefined by default', () => {
    const err = new TokenError('msg')
    expect(err.statusCode).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// MFARequiredError
// ---------------------------------------------------------------------------
describe('MFARequiredError', () => {
  it('stores challengeId', () => {
    const err = new MFARequiredError('challenge-xyz')
    expect(err.challengeId).toBe('challenge-xyz')
  })

  it('has code "mfa_required" and statusCode 403', () => {
    const err = new MFARequiredError('c1')
    expect(err.code).toBe('mfa_required')
    expect(err.statusCode).toBe(403)
  })

  it('has descriptive message', () => {
    const err = new MFARequiredError('c1')
    expect(err.message).toBe('MFA verification required')
  })

  it('has name "MFARequiredError"', () => {
    const err = new MFARequiredError('c1')
    expect(err.name).toBe('MFARequiredError')
  })

  it('extends HelloJohnError', () => {
    const err = new MFARequiredError('c1')
    expect(err).toBeInstanceOf(HelloJohnError)
  })
})

// ---------------------------------------------------------------------------
// NetworkError
// ---------------------------------------------------------------------------
describe('NetworkError', () => {
  it('has default message and code', () => {
    const err = new NetworkError()
    expect(err.message).toBe('Network request failed')
    expect(err.code).toBe('network_error')
  })

  it('has name "NetworkError"', () => {
    const err = new NetworkError()
    expect(err.name).toBe('NetworkError')
  })

  it('allows custom message', () => {
    const err = new NetworkError('timeout')
    expect(err.message).toBe('timeout')
  })

  it('extends HelloJohnError', () => {
    const err = new NetworkError()
    expect(err).toBeInstanceOf(HelloJohnError)
  })
})

// ---------------------------------------------------------------------------
// parseAPIError
// ---------------------------------------------------------------------------
describe('parseAPIError', () => {
  it('parses mfa_required error with challenge_id', () => {
    const body = { error: 'mfa_required', challenge_id: 'ch-42' }
    const err = parseAPIError(403, body)
    expect(err).toBeInstanceOf(MFARequiredError)
    expect((err as MFARequiredError).challengeId).toBe('ch-42')
    expect(err.statusCode).toBe(403)
  })

  it('parses 401 errors as AuthenticationError', () => {
    const body = { error: 'invalid_grant', error_description: 'Bad password' }
    const err = parseAPIError(401, body)
    expect(err).toBeInstanceOf(AuthenticationError)
    expect(err.message).toBe('Bad password')
    expect(err.code).toBe('invalid_grant')
    expect(err.statusCode).toBe(401)
  })

  it('parses generic errors as HelloJohnError', () => {
    const body = { error: 'server_error', message: 'Internal failure' }
    const err = parseAPIError(500, body)
    expect(err).toBeInstanceOf(HelloJohnError)
    expect(err.message).toBe('Internal failure')
    expect(err.code).toBe('server_error')
    expect(err.statusCode).toBe(500)
  })

  it('uses error_description over message over error', () => {
    const body = {
      error: 'code',
      error_description: 'desc wins',
      message: 'msg loses',
    }
    const err = parseAPIError(400, body)
    expect(err.message).toBe('desc wins')
  })

  it('falls back to "Unknown error" for empty body', () => {
    const err = parseAPIError(500, {})
    expect(err.message).toBe('Unknown error')
    expect(err.code).toBe('api_error')
  })

  it('handles null body gracefully', () => {
    const err = parseAPIError(500, null)
    expect(err.message).toBe('Unknown error')
  })

  it('does not create MFARequiredError without challenge_id', () => {
    const body = { error: 'mfa_required' }
    const err = parseAPIError(403, body)
    // Without challenge_id, it should fall through to generic
    expect(err).not.toBeInstanceOf(MFARequiredError)
    expect(err).toBeInstanceOf(HelloJohnError)
  })
})

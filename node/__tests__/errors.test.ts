import { describe, it, expect } from 'vitest'
import { HelloJohnError, TokenVerificationError, M2MAuthError } from '../src/errors'

describe('HelloJohnError', () => {
  it('should create an error with message and code', () => {
    const err = new HelloJohnError('something went wrong', 'generic_error')
    expect(err.message).toBe('something went wrong')
    expect(err.code).toBe('generic_error')
  })

  it('should be an instance of Error', () => {
    const err = new HelloJohnError('test', 'test_code')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(HelloJohnError)
  })

  it('should have name set to HelloJohnError', () => {
    const err = new HelloJohnError('test', 'test_code')
    expect(err.name).toBe('HelloJohnError')
  })

  it('should have a stack trace', () => {
    const err = new HelloJohnError('stack test', 'stack_code')
    expect(err.stack).toBeDefined()
    expect(err.stack).toContain('HelloJohnError')
  })

  it('should be catchable as Error', () => {
    let caught = false
    try {
      throw new HelloJohnError('thrown', 'thrown_code')
    } catch (e) {
      if (e instanceof Error) {
        caught = true
        expect(e.message).toBe('thrown')
      }
    }
    expect(caught).toBe(true)
  })

  it('should preserve code across different values', () => {
    const err1 = new HelloJohnError('a', 'code_a')
    const err2 = new HelloJohnError('b', 'code_b')
    expect(err1.code).toBe('code_a')
    expect(err2.code).toBe('code_b')
    expect(err1.code).not.toBe(err2.code)
  })
})

describe('TokenVerificationError', () => {
  it('should create an error with the given message', () => {
    const err = new TokenVerificationError('token is expired')
    expect(err.message).toBe('token is expired')
  })

  it('should have code set to token_verification_failed', () => {
    const err = new TokenVerificationError('any message')
    expect(err.code).toBe('token_verification_failed')
  })

  it('should have name set to TokenVerificationError', () => {
    const err = new TokenVerificationError('test')
    expect(err.name).toBe('TokenVerificationError')
  })

  it('should be an instance of HelloJohnError', () => {
    const err = new TokenVerificationError('test')
    expect(err).toBeInstanceOf(HelloJohnError)
    expect(err).toBeInstanceOf(Error)
  })

  it('should be an instance of TokenVerificationError', () => {
    const err = new TokenVerificationError('test')
    expect(err).toBeInstanceOf(TokenVerificationError)
  })

  it('should always use the fixed code regardless of message', () => {
    const err1 = new TokenVerificationError('expired')
    const err2 = new TokenVerificationError('invalid signature')
    const err3 = new TokenVerificationError('missing kid')
    expect(err1.code).toBe('token_verification_failed')
    expect(err2.code).toBe('token_verification_failed')
    expect(err3.code).toBe('token_verification_failed')
  })
})

describe('M2MAuthError', () => {
  it('should create an error with the given message', () => {
    const err = new M2MAuthError('client secret invalid')
    expect(err.message).toBe('client secret invalid')
  })

  it('should have code set to m2m_auth_failed', () => {
    const err = new M2MAuthError('any message')
    expect(err.code).toBe('m2m_auth_failed')
  })

  it('should have name set to M2MAuthError', () => {
    const err = new M2MAuthError('test')
    expect(err.name).toBe('M2MAuthError')
  })

  it('should be an instance of HelloJohnError', () => {
    const err = new M2MAuthError('test')
    expect(err).toBeInstanceOf(HelloJohnError)
    expect(err).toBeInstanceOf(Error)
  })

  it('should be an instance of M2MAuthError', () => {
    const err = new M2MAuthError('test')
    expect(err).toBeInstanceOf(M2MAuthError)
  })

  it('should be distinguishable from TokenVerificationError', () => {
    const m2m = new M2MAuthError('failed')
    const token = new TokenVerificationError('failed')
    expect(m2m).not.toBeInstanceOf(TokenVerificationError)
    expect(token).not.toBeInstanceOf(M2MAuthError)
    expect(m2m.code).not.toBe(token.code)
    expect(m2m.name).not.toBe(token.name)
  })
})

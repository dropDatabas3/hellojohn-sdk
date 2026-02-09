import { describe, it, expect, vi } from 'vitest'
import { AuthEventEmitter } from '../src/event-emitter'
import type { AuthEvent, AuthSession } from '../src/event-emitter'

function mockSession(overrides?: Partial<AuthSession>): AuthSession {
  return {
    accessToken: 'at_test',
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    user: { sub: 'user-1', email: 'test@example.com' },
    ...overrides,
  }
}

describe('AuthEventEmitter', () => {
  it('on() returns an unsubscribe function', () => {
    const emitter = new AuthEventEmitter()
    const unsub = emitter.on(() => {})
    expect(typeof unsub).toBe('function')
  })

  it('emit() calls all listeners with event and session', () => {
    const emitter = new AuthEventEmitter()
    const listener1 = vi.fn()
    const listener2 = vi.fn()
    emitter.on(listener1)
    emitter.on(listener2)

    const session = mockSession()
    emitter.emit('SIGNED_IN', session)

    expect(listener1).toHaveBeenCalledOnce()
    expect(listener1).toHaveBeenCalledWith('SIGNED_IN', session)
    expect(listener2).toHaveBeenCalledOnce()
    expect(listener2).toHaveBeenCalledWith('SIGNED_IN', session)
  })

  it('emit() passes null session for SIGNED_OUT', () => {
    const emitter = new AuthEventEmitter()
    const listener = vi.fn()
    emitter.on(listener)

    emitter.emit('SIGNED_OUT', null)

    expect(listener).toHaveBeenCalledWith('SIGNED_OUT', null)
  })

  it('unsubscribe stops receiving events', () => {
    const emitter = new AuthEventEmitter()
    const listener = vi.fn()
    const unsub = emitter.on(listener)

    emitter.emit('SIGNED_IN', mockSession())
    expect(listener).toHaveBeenCalledOnce()

    unsub()
    emitter.emit('SIGNED_OUT', null)
    // Should still be 1 call, not 2
    expect(listener).toHaveBeenCalledOnce()
  })

  it('clear() removes all listeners', () => {
    const emitter = new AuthEventEmitter()
    const listener1 = vi.fn()
    const listener2 = vi.fn()
    emitter.on(listener1)
    emitter.on(listener2)

    emitter.clear()
    emitter.emit('TOKEN_REFRESHED', mockSession())

    expect(listener1).not.toHaveBeenCalled()
    expect(listener2).not.toHaveBeenCalled()
  })

  it('listener errors do not break other listeners', () => {
    const emitter = new AuthEventEmitter()
    const badListener = vi.fn(() => {
      throw new Error('listener explosion')
    })
    const goodListener = vi.fn()

    emitter.on(badListener)
    emitter.on(goodListener)

    const session = mockSession()
    emitter.emit('USER_UPDATED', session)

    expect(badListener).toHaveBeenCalledOnce()
    expect(goodListener).toHaveBeenCalledOnce()
    expect(goodListener).toHaveBeenCalledWith('USER_UPDATED', session)
  })

  it('supports multiple event types', () => {
    const emitter = new AuthEventEmitter()
    const events: AuthEvent[] = []
    emitter.on((event) => events.push(event))

    emitter.emit('SIGNED_IN', mockSession())
    emitter.emit('TOKEN_REFRESHED', mockSession())
    emitter.emit('SESSION_EXPIRED', null)
    emitter.emit('MFA_REQUIRED', null)

    expect(events).toEqual([
      'SIGNED_IN',
      'TOKEN_REFRESHED',
      'SESSION_EXPIRED',
      'MFA_REQUIRED',
    ])
  })

  it('same callback can be added only once (Set semantics)', () => {
    const emitter = new AuthEventEmitter()
    const listener = vi.fn()

    emitter.on(listener)
    emitter.on(listener) // duplicate

    emitter.emit('SIGNED_IN', mockSession())
    // Set only stores unique references, so called once
    expect(listener).toHaveBeenCalledOnce()
  })

  it('unsubscribing a non-subscribed callback is a no-op', () => {
    const emitter = new AuthEventEmitter()
    const listener = vi.fn()
    const unsub = emitter.on(listener)

    unsub()
    // Calling unsub again should not throw
    expect(() => unsub()).not.toThrow()
  })

  it('emitting with no listeners does not throw', () => {
    const emitter = new AuthEventEmitter()
    expect(() => emitter.emit('SIGNED_OUT', null)).not.toThrow()
  })
})

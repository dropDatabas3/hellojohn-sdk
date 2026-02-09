import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMemoryStorageAdapter,
  localStorageAdapter,
  sessionStorageAdapter,
  createCookieStorageAdapter,
} from '../src/storage'

// ---------------------------------------------------------------------------
// Memory Storage Adapter
// ---------------------------------------------------------------------------
describe('createMemoryStorageAdapter', () => {
  it('returns null for a key that was never set', () => {
    const storage = createMemoryStorageAdapter()
    expect(storage.get('missing')).toBeNull()
  })

  it('stores and retrieves a value', () => {
    const storage = createMemoryStorageAdapter()
    storage.set('key', 'value')
    expect(storage.get('key')).toBe('value')
  })

  it('overwrites an existing value', () => {
    const storage = createMemoryStorageAdapter()
    storage.set('key', 'first')
    storage.set('key', 'second')
    expect(storage.get('key')).toBe('second')
  })

  it('removes a stored value', () => {
    const storage = createMemoryStorageAdapter()
    storage.set('key', 'value')
    storage.remove('key')
    expect(storage.get('key')).toBeNull()
  })

  it('removing a non-existent key does not throw', () => {
    const storage = createMemoryStorageAdapter()
    expect(() => storage.remove('nope')).not.toThrow()
  })

  it('isolates instances from each other', () => {
    const a = createMemoryStorageAdapter()
    const b = createMemoryStorageAdapter()
    a.set('shared', 'from-a')
    expect(b.get('shared')).toBeNull()
  })

  it('handles empty string values', () => {
    const storage = createMemoryStorageAdapter()
    storage.set('empty', '')
    expect(storage.get('empty')).toBe('')
  })

  it('handles JSON-serialized objects', () => {
    const storage = createMemoryStorageAdapter()
    const data = JSON.stringify({ foo: 'bar', n: 42 })
    storage.set('json', data)
    expect(JSON.parse(storage.get('json')!)).toEqual({ foo: 'bar', n: 42 })
  })
})

// ---------------------------------------------------------------------------
// localStorage Adapter
// ---------------------------------------------------------------------------
describe('localStorageAdapter', () => {
  let mockStorage: Record<string, string>

  beforeEach(() => {
    mockStorage = {}
    const localStorageMock = {
      getItem: vi.fn((key: string) => mockStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key]
      }),
    }
    vi.stubGlobal('localStorage', localStorageMock)
  })

  it('returns null for a missing key', () => {
    expect(localStorageAdapter.get('absent')).toBeNull()
  })

  it('sets and gets a value via localStorage', () => {
    localStorageAdapter.set('token', 'abc123')
    expect(localStorageAdapter.get('token')).toBe('abc123')
  })

  it('removes a value via localStorage', () => {
    localStorageAdapter.set('token', 'abc123')
    localStorageAdapter.remove('token')
    expect(localStorageAdapter.get('token')).toBeNull()
  })

  it('calls the underlying localStorage methods', () => {
    localStorageAdapter.set('k', 'v')
    expect(localStorage.setItem).toHaveBeenCalledWith('k', 'v')
    localStorageAdapter.get('k')
    expect(localStorage.getItem).toHaveBeenCalledWith('k')
    localStorageAdapter.remove('k')
    expect(localStorage.removeItem).toHaveBeenCalledWith('k')
  })

  it('returns null when localStorage.getItem throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('SecurityError') },
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })
    expect(localStorageAdapter.get('any')).toBeNull()
  })

  it('does not throw when localStorage.setItem throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: () => { throw new Error('QuotaExceededError') },
      removeItem: vi.fn(),
    })
    expect(() => localStorageAdapter.set('key', 'value')).not.toThrow()
  })

  it('does not throw when localStorage.removeItem throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: () => { throw new Error('SecurityError') },
    })
    expect(() => localStorageAdapter.remove('key')).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// sessionStorage Adapter
// ---------------------------------------------------------------------------
describe('sessionStorageAdapter', () => {
  let mockStorage: Record<string, string>

  beforeEach(() => {
    mockStorage = {}
    const sessionStorageMock = {
      getItem: vi.fn((key: string) => mockStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key]
      }),
    }
    vi.stubGlobal('sessionStorage', sessionStorageMock)
  })

  it('returns null for a missing key', () => {
    expect(sessionStorageAdapter.get('absent')).toBeNull()
  })

  it('sets and gets a value via sessionStorage', () => {
    sessionStorageAdapter.set('session', 'xyz')
    expect(sessionStorageAdapter.get('session')).toBe('xyz')
  })

  it('removes a value via sessionStorage', () => {
    sessionStorageAdapter.set('session', 'xyz')
    sessionStorageAdapter.remove('session')
    expect(sessionStorageAdapter.get('session')).toBeNull()
  })

  it('calls the underlying sessionStorage methods', () => {
    sessionStorageAdapter.set('k', 'v')
    expect(sessionStorage.setItem).toHaveBeenCalledWith('k', 'v')
    sessionStorageAdapter.get('k')
    expect(sessionStorage.getItem).toHaveBeenCalledWith('k')
    sessionStorageAdapter.remove('k')
    expect(sessionStorage.removeItem).toHaveBeenCalledWith('k')
  })

  it('returns null when sessionStorage.getItem throws', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => { throw new Error('SecurityError') },
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })
    expect(sessionStorageAdapter.get('any')).toBeNull()
  })

  it('does not throw when sessionStorage.setItem throws', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn(),
      setItem: () => { throw new Error('QuotaExceededError') },
      removeItem: vi.fn(),
    })
    expect(() => sessionStorageAdapter.set('key', 'val')).not.toThrow()
  })

  it('does not throw when sessionStorage.removeItem throws', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: () => { throw new Error('SecurityError') },
    })
    expect(() => sessionStorageAdapter.remove('key')).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Cookie Storage Adapter
// ---------------------------------------------------------------------------
describe('createCookieStorageAdapter', () => {
  let cookieJar: string

  beforeEach(() => {
    cookieJar = ''
    Object.defineProperty(globalThis, 'document', {
      value: {
        get cookie() {
          return cookieJar
        },
        set cookie(v: string) {
          const parts = v.split(';')
          const [pair] = parts
          const eqIdx = pair.indexOf('=')
          const rawKey = pair.substring(0, eqIdx)
          const key = decodeURIComponent(rawKey)
          const maxAge = parts.find((p) => p.trim().startsWith('max-age='))
          if (maxAge && maxAge.trim() === 'max-age=0') {
            const entries = cookieJar
              .split('; ')
              .filter((e) => e && !e.startsWith(encodeURIComponent(key) + '='))
            cookieJar = entries.join('; ')
          } else {
            const rawValue = pair.substring(eqIdx + 1)
            const entries = cookieJar
              .split('; ')
              .filter((e) => e && !e.startsWith(encodeURIComponent(key) + '='))
            entries.push(`${encodeURIComponent(key)}=${rawValue}`)
            cookieJar = entries.join('; ')
          }
        },
      },
      writable: true,
      configurable: true,
    })
  })

  it('returns null for a missing cookie', () => {
    const storage = createCookieStorageAdapter()
    expect(storage.get('absent')).toBeNull()
  })

  it('sets and gets a cookie value', () => {
    const storage = createCookieStorageAdapter()
    storage.set('token', 'abc')
    expect(storage.get('token')).toBe('abc')
  })

  it('overwrites an existing cookie', () => {
    const storage = createCookieStorageAdapter()
    storage.set('token', 'first')
    storage.set('token', 'second')
    expect(storage.get('token')).toBe('second')
  })

  it('removes a cookie', () => {
    const storage = createCookieStorageAdapter()
    storage.set('token', 'abc')
    storage.remove('token')
    expect(storage.get('token')).toBeNull()
  })

  it('returns null in SSR (no document)', () => {
    const origDoc = globalThis.document
    // @ts-expect-error simulate SSR
    delete globalThis.document
    const storage = createCookieStorageAdapter()
    expect(storage.get('any')).toBeNull()
    globalThis.document = origDoc
  })

  it('set does nothing in SSR (no document)', () => {
    const origDoc = globalThis.document
    // @ts-expect-error simulate SSR
    delete globalThis.document
    const storage = createCookieStorageAdapter()
    expect(() => storage.set('key', 'val')).not.toThrow()
    globalThis.document = origDoc
  })

  it('remove does nothing in SSR (no document)', () => {
    const origDoc = globalThis.document
    // @ts-expect-error simulate SSR
    delete globalThis.document
    const storage = createCookieStorageAdapter()
    expect(() => storage.remove('key')).not.toThrow()
    globalThis.document = origDoc
  })

  it('respects custom options (domain, maxAge)', () => {
    const storage = createCookieStorageAdapter({
      domain: 'example.com',
      maxAge: 3600,
      secure: true,
      sameSite: 'Strict',
    })
    expect(() => storage.set('opt', 'val')).not.toThrow()
    expect(storage.get('opt')).toBe('val')
  })
})

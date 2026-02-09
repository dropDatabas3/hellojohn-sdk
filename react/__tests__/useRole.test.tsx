import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRole } from '../src/hooks/useRole'
import { useAuth } from '../src/context'

vi.mock('../src/context', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)

function mockAuthReturn(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  const defaults: ReturnType<typeof useAuth> = {
    isAuthenticated: true,
    isLoading: false,
    user: null,
    config: null,
    client: null,
    login: vi.fn(),
    loginWithCredentials: vi.fn(),
    loginWithSocialProvider: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    completeProfile: vi.fn(),
    needsProfileCompletion: false,
    hasRole: vi.fn().mockReturnValue(false),
    hasPermission: vi.fn().mockReturnValue(false),
  }
  mockedUseAuth.mockReturnValue({ ...defaults, ...overrides })
}

describe('useRole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty roles and permissions when user is null', () => {
    mockAuthReturn({ user: null })

    const { result } = renderHook(() => useRole())

    expect(result.current.roles).toEqual([])
    expect(result.current.permissions).toEqual([])
    expect(result.current.isAdmin).toBe(false)
  })

  it('returns empty roles and permissions when user has no custom claims', () => {
    mockAuthReturn({
      user: {
        sub: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      } as any,
    })

    const { result } = renderHook(() => useRole())

    expect(result.current.roles).toEqual([])
    expect(result.current.permissions).toEqual([])
    expect(result.current.isAdmin).toBe(false)
  })

  it('extracts roles from JWT /claims/sys namespace', () => {
    mockAuthReturn({
      user: {
        sub: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        custom: {
          'https://hellojohn.dev/claims/sys': {
            roles: ['editor', 'viewer'],
            perms: [],
          },
        },
      } as any,
    })

    const { result } = renderHook(() => useRole())

    expect(result.current.roles).toEqual(['editor', 'viewer'])
  })

  it('extracts permissions from JWT /claims/sys namespace', () => {
    mockAuthReturn({
      user: {
        sub: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        custom: {
          'https://hellojohn.dev/claims/sys': {
            roles: [],
            perms: ['users:read', 'users:write', 'reports:read'],
          },
        },
      } as any,
    })

    const { result } = renderHook(() => useRole())

    expect(result.current.permissions).toEqual(['users:read', 'users:write', 'reports:read'])
  })

  it('detects isAdmin when sys.is_admin is true', () => {
    mockAuthReturn({
      user: {
        sub: 'user-1',
        email: 'admin@example.com',
        name: 'Admin',
        custom: {
          'https://hellojohn.dev/claims/sys': {
            is_admin: true,
            roles: ['admin'],
            perms: ['*'],
          },
        },
      } as any,
    })

    const { result } = renderHook(() => useRole())

    expect(result.current.isAdmin).toBe(true)
  })

  it('returns isAdmin=false when no admin flag is set', () => {
    mockAuthReturn({
      user: {
        sub: 'user-1',
        email: 'user@example.com',
        name: 'Regular User',
        custom: {
          'https://hellojohn.dev/claims/sys': {
            roles: ['viewer'],
            perms: ['read:own'],
          },
        },
      } as any,
    })

    const { result } = renderHook(() => useRole())

    expect(result.current.isAdmin).toBe(false)
  })

  it('returns isAdmin=false when is_admin is explicitly false', () => {
    mockAuthReturn({
      user: {
        sub: 'user-1',
        email: 'user@example.com',
        name: 'Regular User',
        custom: {
          'https://hellojohn.dev/claims/sys': {
            is_admin: false,
            roles: ['editor'],
            perms: [],
          },
        },
      } as any,
    })

    const { result } = renderHook(() => useRole())

    expect(result.current.isAdmin).toBe(false)
  })

  it('works with multiple claim namespaces and merges them', () => {
    mockAuthReturn({
      user: {
        sub: 'user-1',
        email: 'user@example.com',
        name: 'Multi-tenant User',
        custom: {
          'https://tenant-a.example.com/claims/sys': {
            roles: ['admin'],
            perms: ['tenant-a:manage'],
            is_admin: true,
          },
          'https://tenant-b.example.com/claims/sys': {
            roles: ['viewer'],
            perms: ['tenant-b:read'],
          },
        },
      } as any,
    })

    const { result } = renderHook(() => useRole())

    expect(result.current.roles).toEqual(['admin', 'viewer'])
    expect(result.current.permissions).toEqual(['tenant-a:manage', 'tenant-b:read'])
    expect(result.current.isAdmin).toBe(true)
  })

  it('ignores custom claims that do not end with /claims/sys', () => {
    mockAuthReturn({
      user: {
        sub: 'user-1',
        email: 'user@example.com',
        name: 'User',
        custom: {
          'https://hellojohn.dev/claims/app': {
            roles: ['should-be-ignored'],
            perms: ['also-ignored'],
          },
          'https://hellojohn.dev/claims/sys': {
            roles: ['actual-role'],
            perms: ['actual-perm'],
          },
        },
      } as any,
    })

    const { result } = renderHook(() => useRole())

    expect(result.current.roles).toEqual(['actual-role'])
    expect(result.current.permissions).toEqual(['actual-perm'])
  })

  it('exposes hasRole and hasPermission from useAuth', () => {
    const hasRoleMock = vi.fn().mockReturnValue(true)
    const hasPermissionMock = vi.fn().mockReturnValue(false)

    mockAuthReturn({
      user: {
        sub: 'user-1',
        email: 'user@example.com',
        name: 'User',
        custom: {},
      } as any,
      hasRole: hasRoleMock,
      hasPermission: hasPermissionMock,
    })

    const { result } = renderHook(() => useRole())

    expect(result.current.hasRole).toBe(hasRoleMock)
    expect(result.current.hasPermission).toBe(hasPermissionMock)
    expect(result.current.hasRole('admin')).toBe(true)
    expect(result.current.hasPermission('users:write')).toBe(false)
  })

  it('handles sys namespace with missing roles and perms arrays gracefully', () => {
    mockAuthReturn({
      user: {
        sub: 'user-1',
        email: 'user@example.com',
        name: 'User',
        custom: {
          'https://hellojohn.dev/claims/sys': {
            is_admin: false,
            // roles and perms are absent
          },
        },
      } as any,
    })

    const { result } = renderHook(() => useRole())

    expect(result.current.roles).toEqual([])
    expect(result.current.permissions).toEqual([])
    expect(result.current.isAdmin).toBe(false)
  })
})

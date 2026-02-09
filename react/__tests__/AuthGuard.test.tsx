import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { AuthGuard } from '../src/components/AuthGuard'
import { useAuth } from '../src/context'
import { useRole } from '../src/hooks/useRole'

vi.mock('../src/context', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../src/hooks/useRole', () => ({
  useRole: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedUseRole = vi.mocked(useRole)

function mockState(overrides: {
  isAuthenticated?: boolean
  isLoading?: boolean
  hasRole?: (role: string) => boolean
  hasPermission?: (perm: string) => boolean
} = {}) {
  mockedUseAuth.mockReturnValue({
    isAuthenticated: overrides.isAuthenticated ?? false,
    isLoading: overrides.isLoading ?? false,
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
    hasRole: overrides.hasRole ?? vi.fn().mockReturnValue(false),
    hasPermission: overrides.hasPermission ?? vi.fn().mockReturnValue(false),
  })

  mockedUseRole.mockReturnValue({
    roles: [],
    permissions: [],
    isAdmin: false,
    user: null,
    hasRole: overrides.hasRole ?? vi.fn().mockReturnValue(false),
    hasPermission: overrides.hasPermission ?? vi.fn().mockReturnValue(false),
  })
}

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading content while isLoading is true', () => {
    mockState({ isLoading: true })

    render(
      <AuthGuard loading={<div>Loading spinner...</div>} fallback={<div>Not allowed</div>}>
        <div>Protected content</div>
      </AuthGuard>
    )

    expect(screen.getByText('Loading spinner...')).toBeInTheDocument()
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
    expect(screen.queryByText('Not allowed')).not.toBeInTheDocument()
  })

  it('shows children when authenticated and no role/permission required', () => {
    mockState({ isAuthenticated: true })

    render(
      <AuthGuard fallback={<div>Not allowed</div>}>
        <div>Protected content</div>
      </AuthGuard>
    )

    expect(screen.getByText('Protected content')).toBeInTheDocument()
    expect(screen.queryByText('Not allowed')).not.toBeInTheDocument()
  })

  it('shows fallback when not authenticated', () => {
    mockState({ isAuthenticated: false })

    render(
      <AuthGuard fallback={<div>Please log in</div>}>
        <div>Protected content</div>
      </AuthGuard>
    )

    expect(screen.getByText('Please log in')).toBeInTheDocument()
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
  })

  it('shows fallback when role does not match', () => {
    mockState({
      isAuthenticated: true,
      hasRole: vi.fn().mockReturnValue(false),
    })

    render(
      <AuthGuard role="admin" fallback={<div>Access denied</div>}>
        <div>Admin panel</div>
      </AuthGuard>
    )

    expect(screen.getByText('Access denied')).toBeInTheDocument()
    expect(screen.queryByText('Admin panel')).not.toBeInTheDocument()
  })

  it('shows fallback when permission does not match', () => {
    mockState({
      isAuthenticated: true,
      hasPermission: vi.fn().mockReturnValue(false),
    })

    render(
      <AuthGuard permission="users:write" fallback={<div>No permission</div>}>
        <div>User editor</div>
      </AuthGuard>
    )

    expect(screen.getByText('No permission')).toBeInTheDocument()
    expect(screen.queryByText('User editor')).not.toBeInTheDocument()
  })

  it('shows children when role matches', () => {
    mockState({
      isAuthenticated: true,
      hasRole: vi.fn((role: string) => role === 'admin'),
    })

    render(
      <AuthGuard role="admin" fallback={<div>Access denied</div>}>
        <div>Admin panel</div>
      </AuthGuard>
    )

    expect(screen.getByText('Admin panel')).toBeInTheDocument()
    expect(screen.queryByText('Access denied')).not.toBeInTheDocument()
  })

  it('shows children when permission matches', () => {
    mockState({
      isAuthenticated: true,
      hasPermission: vi.fn((perm: string) => perm === 'reports:read'),
    })

    render(
      <AuthGuard permission="reports:read" fallback={<div>No permission</div>}>
        <div>Reports</div>
      </AuthGuard>
    )

    expect(screen.getByText('Reports')).toBeInTheDocument()
    expect(screen.queryByText('No permission')).not.toBeInTheDocument()
  })

  it('shows children when one of multiple roles matches (array)', () => {
    mockState({
      isAuthenticated: true,
      hasRole: vi.fn((role: string) => role === 'editor'),
    })

    render(
      <AuthGuard role={['admin', 'editor']} fallback={<div>Access denied</div>}>
        <div>Editor panel</div>
      </AuthGuard>
    )

    expect(screen.getByText('Editor panel')).toBeInTheDocument()
    expect(screen.queryByText('Access denied')).not.toBeInTheDocument()
  })

  it('shows fallback when none of the array roles match', () => {
    mockState({
      isAuthenticated: true,
      hasRole: vi.fn().mockReturnValue(false),
    })

    render(
      <AuthGuard role={['admin', 'superadmin']} fallback={<div>Access denied</div>}>
        <div>Admin panel</div>
      </AuthGuard>
    )

    expect(screen.getByText('Access denied')).toBeInTheDocument()
    expect(screen.queryByText('Admin panel')).not.toBeInTheDocument()
  })

  it('renders null by default when no loading or fallback provided', () => {
    mockState({ isLoading: true })

    const { container } = render(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>
    )

    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
    expect(container.innerHTML).toBe('')
  })

  it('renders null fallback by default when not authenticated and no fallback prop', () => {
    mockState({ isAuthenticated: false })

    const { container } = render(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>
    )

    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
    expect(container.innerHTML).toBe('')
  })
})

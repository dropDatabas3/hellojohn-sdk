# @hellojohn/react

> ⚛️ React SDK for HelloJohn Identity Platform

Pre-built authentication components and hooks for React applications. Drop-in SignIn, SignUp, MFA, and user management components with full theming support.

## Installation

```bash
npm install @hellojohn/react @hellojohn/js
# or
yarn add @hellojohn/react @hellojohn/js
# or
pnpm add @hellojohn/react @hellojohn/js
```

## Quick Start

```tsx
import { HelloJohnProvider, SignIn, useAuth } from '@hellojohn/react'

function App() {
  return (
    <HelloJohnProvider
      domain="https://auth.example.com"
      clientId="your-client-id"
      tenantId="your-tenant"
    >
      <Router />
    </HelloJohnProvider>
  )
}

function LoginPage() {
  return <SignIn onSuccess={() => navigate('/dashboard')} />
}

function Dashboard() {
  const { user, logout } = useAuth()
  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      <button onClick={logout}>Sign Out</button>
    </div>
  )
}
```

## Features

| Feature | Description |
|---------|-------------|
| **Pre-built Components** | SignIn, SignUp, UserButton, UserProfile, MFA |
| **Hooks** | useAuth, useRole for custom UI |
| **6 Themes** | midnight, ocean, sunrise, forest, honey, minimal |
| **i18n** | English and Spanish built-in, custom locales supported |
| **SSR Support** | Next.js App Router compatible |
| **RBAC** | Role and permission-based access control |

## Components

### SignIn

Full-featured login form with social providers and MFA support.

```tsx
import { SignIn } from '@hellojohn/react'

<SignIn
  onSuccess={(user) => console.log('Logged in:', user)}
  onError={(error) => console.log('Error:', error)}
  theme="midnight"          // Optional theme
  showSocialProviders       // Show social login buttons
  redirectUrl="/dashboard"  // Redirect after success
/>
```

### SignUp

Registration form with custom fields support.

```tsx
import { SignUp } from '@hellojohn/react'

<SignUp
  onSuccess={(result) => console.log('Registered:', result)}
  theme="ocean"
  requirePhone             // Require phone number
  customFields={[          // Additional fields
    { name: 'company', label: 'Company', required: true }
  ]}
/>
```

### UserButton

Avatar dropdown with sign out (like Clerk's UserButton).

```tsx
import { UserButton } from '@hellojohn/react'

// In your header/navbar
<UserButton 
  afterSignOutUrl="/"
  showName              // Show user name next to avatar
/>
```

### UserProfile

Full profile management panel.

```tsx
import { UserProfile } from '@hellojohn/react'

<UserProfile
  onClose={() => setShowProfile(false)}
/>
// Includes: avatar, name editing, password change, MFA setup
```

### MFASetup

TOTP enrollment wizard with QR code.

```tsx
import { MFASetup } from '@hellojohn/react'

<MFASetup
  onComplete={() => console.log('MFA enabled!')}
  onCancel={() => setShowMFA(false)}
/>
```

### MFAChallenge

6-digit code input for MFA login.

```tsx
import { MFAChallenge } from '@hellojohn/react'

<MFAChallenge
  challengeId={challengeId}
  onSuccess={(tokens) => handleLogin(tokens)}
  onCancel={() => setShowChallenge(false)}
/>
```

### AuthGuard

Route protection with role/permission checks.

```tsx
import { AuthGuard } from '@hellojohn/react'

// Require authentication
<AuthGuard fallback={<Navigate to="/login" />}>
  <ProtectedPage />
</AuthGuard>

// Require specific role
<AuthGuard role="admin" fallback={<AccessDenied />}>
  <AdminPanel />
</AuthGuard>

// Require permission
<AuthGuard permission="users:write" fallback={<AccessDenied />}>
  <UserEditor />
</AuthGuard>
```

### Other Components

```tsx
import {
  ForgotPassword,           // Password reset request form
  ResetPassword,            // New password form (with token)
  EmailVerificationPending, // "Check your email" screen
  CompleteProfile,          // Profile completion form
  PhoneInput,               // Phone number with country selector
  CountrySelect,            // Country dropdown with flags
} from '@hellojohn/react'
```

## Hooks

### useAuth

Full authentication context.

```tsx
import { useAuth } from '@hellojohn/react'

function MyComponent() {
  const {
    user,                 // Current user or null
    isAuthenticated,      // boolean
    isLoading,            // true during initial load
    login,                // (email, password) => Promise
    loginWithRedirect,    // () => Promise (OAuth2 PKCE)
    loginWithSocial,      // (provider) => Promise
    logout,               // () => void
    register,             // (options) => Promise
    getAccessToken,       // () => Promise<string>
  } = useAuth()

  if (isLoading) return <Spinner />
  if (!isAuthenticated) return <SignIn />
  return <Dashboard user={user} />
}
```

### useRole

RBAC hook for role/permission checks.

```tsx
import { useRole } from '@hellojohn/react'

function AdminSection() {
  const { 
    roles,            // string[] - user's roles
    permissions,      // string[] - user's permissions
    isAdmin,          // boolean - has 'admin' role
    hasRole,          // (role: string) => boolean
    hasPermission,    // (permission: string) => boolean
  } = useRole()

  if (!hasRole('admin')) {
    return <p>Access denied</p>
  }

  return <AdminPanel />
}
```

## Theming

### Built-in Themes

```tsx
import { HelloJohnProvider } from '@hellojohn/react'

<HelloJohnProvider theme="midnight">  {/* Dark theme */}
<HelloJohnProvider theme="ocean">     {/* Blue theme */}
<HelloJohnProvider theme="sunrise">   {/* Warm theme */}
<HelloJohnProvider theme="forest">    {/* Green theme */}
<HelloJohnProvider theme="honey">     {/* Yellow theme */}
<HelloJohnProvider theme="minimal">   {/* Light/minimal */}
```

### CSS Variables

```tsx
import { getThemeCSSVariables, getTheme } from '@hellojohn/react'

// Get CSS custom properties for a theme
const cssVars = getThemeCSSVariables(getTheme('midnight'))
// { '--hj-bg-primary': '#1a1a2e', '--hj-text-primary': '#fff', ... }
```

### Per-Component Theme

```tsx
<SignIn theme="ocean" />
<SignUp theme="forest" />
```

## Internationalization (i18n)

### Built-in Locales

```tsx
import { HelloJohnProvider, es } from '@hellojohn/react'

// Use Spanish
<HelloJohnProvider locale="es">

// Or pass locale object directly
<HelloJohnProvider locale={es}>
```

### Custom Overrides

```tsx
<HelloJohnProvider
  locale="en"
  localeOverrides={{
    signIn: {
      title: 'Welcome Back!',
      submitButton: 'Enter',
    },
    errors: {
      invalidCredentials: 'Wrong email or password',
    },
  }}
>
```

### Full Custom Locale

```tsx
import type { Locale } from '@hellojohn/react'

const myLocale: Locale = {
  signIn: { title: '...', emailLabel: '...', /* ... */ },
  signUp: { /* ... */ },
  mfa: { /* ... */ },
  userButton: { /* ... */ },
  errors: { /* ... */ },
}

<HelloJohnProvider locale={myLocale}>
```

## SSR Support (Next.js)

### App Router

```tsx
// lib/auth.ts
import { createServerClient } from '@hellojohn/react/server'
import { cookies } from 'next/headers'

export async function getSession() {
  const cookieStore = cookies()
  const client = createServerClient({
    domain: process.env.HELLOJOHN_DOMAIN!,
    cookies: cookieStore.toString(),
  })
  return client.getSession()
}

// app/dashboard/page.tsx
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return <Dashboard user={session.user} />
}
```

### Providers Setup

```tsx
// app/providers.tsx
'use client'
import { HelloJohnProvider } from '@hellojohn/react'

export function Providers({ children }) {
  return (
    <HelloJohnProvider
      domain={process.env.NEXT_PUBLIC_HELLOJOHN_DOMAIN!}
      clientId={process.env.NEXT_PUBLIC_HELLOJOHN_CLIENT_ID!}
    >
      {children}
    </HelloJohnProvider>
  )
}

// app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

## Simple Logout Helper

```tsx
import { byeJohn } from '@hellojohn/react'

// Quick logout anywhere
<button onClick={() => byeJohn()}>Sign Out</button>

// With redirect
<button onClick={() => byeJohn('/goodbye')}>Sign Out</button>
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  Theme,
  ThemeName,
  ThemeColors,
  Locale,
  DeepPartial,
} from '@hellojohn/react'
```

## License

MIT

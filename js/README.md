# @hellojohn/js

> 🔐 Browser SDK for HelloJohn Identity Platform

Zero-dependency authentication client for SPAs and web applications. Handles OAuth2 PKCE, automatic token refresh, MFA, and secure storage.

## Installation

```bash
npm install @hellojohn/js
# or
yarn add @hellojohn/js
# or
pnpm add @hellojohn/js
```

## Quick Start

```typescript
import { createHelloJohn } from '@hellojohn/js'

const auth = createHelloJohn({
  domain: 'https://auth.example.com',
  clientId: 'your-client-id',
  tenantId: 'your-tenant',
})

// Subscribe to auth changes
auth.onAuthStateChange((event, session) => {
  console.log(event, session?.user)
})

// Login
await auth.loginWithCredentials('user@example.com', 'password')

// Check auth status
if (auth.isAuthenticated()) {
  const user = await auth.getUser()
  console.log('Hello', user.name)
}
```

## Features

| Feature | Description |
|---------|-------------|
| **OAuth2 PKCE** | Secure authorization code flow for SPAs |
| **Auto Token Refresh** | Tokens refresh automatically at 75% lifetime |
| **Event System** | Subscribe to `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, etc. |
| **MFA/TOTP** | Full 2FA support with enrollment and challenges |
| **Storage Adapters** | localStorage, sessionStorage, memory, or cookies |
| **Fetch Wrapper** | Auto-inject Bearer tokens in API calls |
| **Zero Dependencies** | Minimal bundle size |

## API Reference

### Initialization

```typescript
import { createHelloJohn } from '@hellojohn/js'

const auth = createHelloJohn({
  domain: string,           // Required: Your HelloJohn domain
  clientId: string,         // Required: OAuth2 client ID
  tenantId?: string,        // Optional: Tenant identifier
  redirectUri?: string,     // Default: window.location.origin + '/callback'
  scope?: string,           // Default: 'openid profile email'
  storage?: StorageAdapter, // Default: localStorage
  autoRefresh?: boolean,    // Default: true
})
```

### Authentication Methods

#### Login with Credentials

```typescript
const user = await auth.loginWithCredentials(email, password)
```

#### Login with OAuth2 Redirect (PKCE)

```typescript
// Start login - redirects to auth server
await auth.loginWithRedirect()

// Handle callback (on redirect URI page)
await auth.handleRedirectCallback()
```

#### Login with Social Provider

```typescript
await auth.loginWithSocialProvider('google')

// On callback page
if (auth.isSocialCallback()) {
  await auth.handleSocialCallback()
}
```

#### Register

```typescript
const result = await auth.register({
  email: 'user@example.com',
  password: 'securePassword123',
  name: 'John Doe',
  // Additional fields...
})
```

#### Logout

```typescript
// Single session
auth.logout()

// All sessions (all devices)
await auth.logoutAll()
```

### Token Management

```typescript
// Get a valid access token (auto-refreshes if needed)
const token = await auth.getAccessToken()

// Force refresh
await auth.refreshSession()

// Check if authenticated (validates expiration)
const isLoggedIn = auth.isAuthenticated()

// Revoke token
await auth.revokeToken()
```

### Event System

```typescript
const unsubscribe = auth.onAuthStateChange((event, session) => {
  switch (event) {
    case 'SIGNED_IN':
      console.log('User signed in:', session.user)
      break
    case 'SIGNED_OUT':
      console.log('User signed out')
      break
    case 'TOKEN_REFRESHED':
      console.log('Token refreshed')
      break
    case 'SESSION_EXPIRED':
      console.log('Session expired, redirect to login')
      break
    case 'MFA_REQUIRED':
      console.log('MFA challenge required')
      break
  }
})

// Later: stop listening
unsubscribe()
```

### MFA (Multi-Factor Authentication)

```typescript
// Enroll TOTP
const { secret, qr_uri, recovery_codes } = await auth.mfa.enrollTOTP()

// Verify enrollment
await auth.mfa.verifyTOTP('123456')

// During login (when MFARequiredError is thrown)
try {
  await auth.loginWithCredentials(email, password)
} catch (err) {
  if (err instanceof MFARequiredError) {
    const { challenge_id } = await auth.mfa.challengeTOTP()
    const tokens = await auth.mfa.solveTOTP(challenge_id, userCode)
  }
}

// Disable MFA
await auth.mfa.disableTOTP('123456')

// Rotate recovery codes
const { codes } = await auth.mfa.rotateRecoveryCodes()
```

### HTTP Fetch Wrapper

```typescript
// Create an auto-authenticated fetch function
const authedFetch = auth.createFetchWrapper()

// Use it like regular fetch - Bearer token auto-injected
const response = await authedFetch('/api/users')
const data = await response.json()
```

### Password Recovery

```typescript
// Request reset email
await auth.forgotPassword('user@example.com')

// Reset with token (from email link)
await auth.resetPassword(token, 'newSecurePassword')
```

### Storage Adapters

```typescript
import { 
  createHelloJohn,
  localStorageAdapter,      // Default
  sessionStorageAdapter,    // Clears on tab close
  createMemoryStorageAdapter,  // For SSR/testing
  createCookieStorageAdapter,  // For SSR-safe storage
} from '@hellojohn/js'

// Use session storage
const auth = createHelloJohn({
  domain: '...',
  clientId: '...',
  storage: sessionStorageAdapter,
})

// Use memory storage (SSR-safe)
const auth = createHelloJohn({
  domain: '...',
  clientId: '...',
  storage: createMemoryStorageAdapter(),
})
```

## Error Handling

```typescript
import { 
  HelloJohnError,
  AuthenticationError,
  TokenError,
  MFARequiredError,
  NetworkError,
} from '@hellojohn/js'

try {
  await auth.loginWithCredentials(email, password)
} catch (err) {
  if (err instanceof MFARequiredError) {
    // Handle MFA challenge
    console.log('MFA required, challenge:', err.challengeId)
  } else if (err instanceof AuthenticationError) {
    // Bad credentials
    console.log('Auth failed:', err.message, err.code)
  } else if (err instanceof NetworkError) {
    // Network issues
    console.log('Network error')
  }
}
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type { 
  AuthClientOptions,
  TokenResponse,
  User,
  AuthEvent,
  AuthSession,
  StorageAdapter,
} from '@hellojohn/js'
```

## Cleanup

```typescript
// When unmounting your app
auth.destroy()
```

## License

MIT

# @hellojohn/js

> Browser SDK for HelloJohn Identity Platform.
> Zero dependencies. Framework-agnostic. TypeScript-first.

Handles OAuth2 PKCE, social login, credential-based auth, automatic token refresh, MFA/TOTP, and secure token storage.

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Authentication Methods](#authentication-methods)
  - [Direct Login (Credentials)](#direct-login-credentials)
  - [OAuth2 PKCE Flow](#oauth2-pkce-flow)
  - [Social Login](#social-login)
  - [Registration](#registration)
- [User & Session Management](#user--session-management)
- [Token Management](#token-management)
- [MFA (Multi-Factor Authentication)](#mfa-multi-factor-authentication)
- [Password Recovery](#password-recovery)
- [Profile Completion](#profile-completion)
- [Tenant Configuration](#tenant-configuration)
- [Event System](#event-system)
- [Storage Adapters](#storage-adapters)
- [Authenticated Fetch Wrapper](#authenticated-fetch-wrapper)
- [JWT Utilities](#jwt-utilities)
- [Error Handling](#error-handling)
- [API Endpoints Reference](#api-endpoints-reference)
- [TypeScript Types](#typescript-types)

---

## Installation

```bash
npm install @hellojohn/js
```

No runtime dependencies. Works with any bundler (Vite, webpack, esbuild, Turbopack).

---

## Quick Start

```typescript
import { createHelloJohn } from '@hellojohn/js';

const auth = createHelloJohn({
  domain: 'https://auth.example.com',
  clientID: 'my-app-client-id',
  tenantID: 'my-tenant',
});

// Direct login
const user = await auth.loginWithCredentials('user@example.com', 'password123');
console.log('Logged in:', user.email);

// Check session
if (auth.isAuthenticated()) {
  const user = await auth.getUser();
  console.log('Current user:', user);
}

// Logout
auth.logout('/login');
```

---

## Configuration

```typescript
const auth = createHelloJohn({
  // --- Required ---
  domain: 'https://auth.example.com',   // HelloJohn server URL (include protocol)
  clientID: 'my-app-client-id',         // Client ID from admin panel

  // --- Optional ---
  tenantID: 'my-tenant',                // Tenant slug or UUID
  redirectURI: 'https://myapp.com/callback',
                                         // Default: window.location.origin + '/callback'
  scope: 'openid profile email',        // Default value shown
  autoRefresh: true,                    // Refresh tokens at 75% lifetime (default: true)
  storage: localStorageAdapter,         // Storage backend (default: localStorage)
});
```

### Options Reference

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `domain` | `string` | **Yes** | — | HelloJohn server URL. Trailing slash is stripped automatically. |
| `clientID` | `string` | **Yes** | — | OAuth2 client ID registered in the admin panel. |
| `tenantID` | `string` | No | — | Tenant slug or UUID. Required for multi-tenant setups. |
| `redirectURI` | `string` | No | `origin + '/callback'` | Must match the URI registered in your OAuth client config. |
| `scope` | `string` | No | `'openid profile email'` | Space-separated OAuth2 scopes. |
| `autoRefresh` | `boolean` | No | `true` | Schedules token refresh at 75% of token lifetime (min 5s). |
| `storage` | `StorageAdapter` | No | `localStorageAdapter` | Where tokens are persisted. See [Storage Adapters](#storage-adapters). |
| `audience` | `string` | No | — | API identifier. Reserved for future use. |

---

## Authentication Methods

### Direct Login (Credentials)

Login with email and password. Returns the user profile immediately. Tokens are stored automatically.

```typescript
try {
  const user = await auth.loginWithCredentials('user@example.com', 'password123');
  console.log('Welcome', user.name);
} catch (err) {
  if (err.code === 'invalid_credentials') {
    console.error('Wrong email or password');
  }
  if (err.code === 'mfa_required') {
    // User has MFA enabled — see MFA section
    handleMFA(err.challengeId);
  }
}
```

### OAuth2 PKCE Flow

Full OAuth2 Authorization Code flow with PKCE (Proof Key for Code Exchange). Recommended for SPAs where you want the user to authenticate through HelloJohn's hosted login.

```typescript
// Step 1: Redirect user to the authorization server
await auth.loginWithRedirect();
// Browser navigates to: /oauth2/authorize?response_type=code&code_challenge=...

// Step 2: Handle the callback on your /callback page
await auth.handleRedirectCallback();
// SDK exchanges the authorization code for tokens using the stored code_verifier

// Step 3: Get the authenticated user
const user = await auth.getUser();
```

**With custom options:**

```typescript
await auth.loginWithRedirect({
  scope: 'openid profile email custom:read',
  appState: { returnTo: '/dashboard' },  // Preserved across the redirect
});
```

**Security:** The SDK generates a random `code_verifier`, `code_challenge`, `state`, and `nonce` per login attempt. These are stored in `sessionStorage` and validated during the callback to prevent CSRF and code injection attacks.

### Social Login

Redirect the user to a social identity provider (Google, GitHub, etc.).

```typescript
// Step 1: Start social login — redirects to provider
await auth.loginWithSocialProvider('google');
// Flow: Browser → HelloJohn → Google → HelloJohn → your /callback

// Step 2: On your callback page, detect and handle
if (auth.isSocialCallback()) {
  await auth.handleSocialCallback();
  const user = await auth.getUser();
  console.log('Social login success:', user.email);
}
```

**Check available providers** for your tenant:

```typescript
const providers = await auth.getProviders();
// e.g. ['google', 'github', 'microsoft']
```

### Registration

```typescript
try {
  const result = await auth.register({
    email: 'newuser@example.com',
    password: 'securePassword123',
    name: 'John Doe',                    // Optional
    customFields: {                      // Optional — tenant-specific fields
      company: 'ACME Corp',
      phone: '+1234567890',
    },
  });

  console.log('User created:', result.user_id);

  // If auto-login is enabled on the tenant:
  if (result.access_token) {
    console.log('Auto-logged in!');
  }
} catch (err) {
  if (err.code === 'email_taken') {
    console.error('Email already registered');
  }
}
```

#### RegisterOptions

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `email` | `string` | **Yes** | User's email address |
| `password` | `string` | **Yes** | Password (min length depends on tenant config) |
| `name` | `string` | No | Display name |
| `username` | `string` | No | Unique username |
| `customFields` | `Record<string, any>` | No | Tenant-defined custom fields |

#### RegisterResponse

| Property | Type | Description |
|----------|------|-------------|
| `user_id` | `string` | The created user's UUID |
| `access_token` | `string?` | Present if auto-login is enabled |
| `expires_in` | `number?` | Token lifetime in seconds |

---

## User & Session Management

```typescript
// Get current user profile (calls /userinfo endpoint)
const user = await auth.getUser();

// Check authentication state (synchronous — checks stored token expiry)
const loggedIn = auth.isAuthenticated();

// Logout — clears tokens locally and redirects
auth.logout('/login');

// Logout from all devices (server-side session invalidation)
await auth.logoutAll();

// Revoke the current access token
await auth.revokeToken();
```

### User Object

```typescript
interface User {
  sub: string;                          // Unique user ID (UUID)
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  custom_fields?: Record<string, any>;  // Tenant-specific profile fields
  custom?: Record<string, any>;         // JWT custom claims (RBAC, etc.)
}
```

**Accessing RBAC claims:**

```typescript
const sys = user.custom?.['https://auth.example.com/claims/sys'];
if (sys) {
  console.log('Is admin:', sys.is_admin);    // boolean
  console.log('Roles:', sys.roles);          // ['editor', 'moderator']
  console.log('Permissions:', sys.perms);    // ['users:read', 'posts:write']
}
```

---

## Token Management

```typescript
// Get current access token (auto-refreshes if close to expiry)
const token = await auth.getAccessToken();

// Get stored token data (synchronous, no refresh)
const tokens = auth.getStoredTokens();
// Returns: { access_token, id_token?, refresh_token?, expires_in, token_type, scope }

// Manually trigger a token refresh
await auth.refreshSession();

// Cleanup timers and event listeners (call on app unmount)
auth.destroy();
```

### Auto-Refresh Behavior

When `autoRefresh: true` (default):

1. After login, the SDK calculates 75% of the token's lifetime.
2. A timer is scheduled to refresh the token at that point (minimum 5 seconds).
3. If the refresh succeeds, a `TOKEN_REFRESHED` event is emitted.
4. If the refresh fails, tokens are cleared and `SESSION_EXPIRED` is emitted.
5. Concurrent refresh calls are deduplicated — only one network request is made.

---

## MFA (Multi-Factor Authentication)

All MFA operations are accessed through `auth.mfa`:

### Enroll TOTP

```typescript
// Step 1: Start enrollment — get QR code and recovery codes
const enrollment = await auth.mfa.enrollTOTP();
console.log('Secret:', enrollment.secret);
console.log('QR URI:', enrollment.qr_uri);              // otpauth:// URI
console.log('Recovery codes:', enrollment.recovery_codes); // string[]

// Step 2: Verify with a code from the authenticator app
const result = await auth.mfa.verifyTOTP('123456');
if (result.success) {
  console.log('MFA is now enabled!');
}
```

### Solve MFA Challenge (during login)

When a user with MFA enabled tries to log in, the SDK throws `MFARequiredError`:

```typescript
try {
  await auth.loginWithCredentials(email, password);
} catch (err) {
  if (err.code === 'mfa_required') {
    // Step 1: Create a TOTP challenge
    const challenge = await auth.mfa.challengeTOTP();

    // Step 2: Ask the user for their code, then solve
    const tokens = await auth.mfa.solveTOTP(challenge.challenge_id, userCode);
    // Login complete — tokens are stored
  }
}
```

### Manage MFA

```typescript
// Disable TOTP (requires a valid code to confirm)
await auth.mfa.disableTOTP('123456');

// Rotate recovery codes (invalidates old ones)
const { codes } = await auth.mfa.rotateRecoveryCodes();
console.log('New recovery codes:', codes);
```

---

## Password Recovery

```typescript
// Step 1: Request a password reset email
await auth.forgotPassword('user@example.com');
// User receives an email with a reset link containing a token

// Step 2: Reset password using the token from the email link
await auth.resetPassword(token, 'newSecurePassword');
```

### Email Verification

```typescript
// Resend verification email (for unverified accounts)
await auth.resendVerificationEmail('user@example.com');
```

---

## Profile Completion

Some tenants define required custom fields. After registration or social login, users may need to fill in missing fields:

```typescript
// Check if the tenant has required custom fields
const config = await auth.getTenantConfig();
console.log('Required fields:', config.custom_fields?.filter(f => f.required));

// Submit missing fields
await auth.completeProfile({
  company: 'ACME Corp',
  phone: '+1234567890',
});
```

---

## Tenant Configuration

Fetch your tenant's public configuration (no auth required):

```typescript
const config = await auth.getTenantConfig();
```

### AuthConfig

| Property | Type | Description |
|----------|------|-------------|
| `tenant_name` | `string` | Tenant display name |
| `tenant_slug` | `string` | Tenant URL identifier |
| `client_name` | `string` | Client app display name |
| `logo_url` | `string?` | Tenant logo URL |
| `primary_color` | `string?` | Brand color hex |
| `social_providers` | `string[]` | Enabled social providers (e.g. `["google"]`) |
| `password_enabled` | `boolean` | Whether email/password login is enabled |
| `features` | `Record<string, boolean>?` | Feature flags |
| `custom_fields` | `CustomFieldSchema[]?` | Tenant-defined user fields |

### CustomFieldSchema

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Field identifier (e.g. `"company"`) |
| `type` | `string` | Field type (`"text"`, `"select"`, etc.) |
| `label` | `string` | Display label |
| `required` | `boolean` | Whether the field must be filled |

---

## Event System

Subscribe to authentication state changes in real-time:

```typescript
const unsubscribe = auth.onAuthStateChange((event, session) => {
  switch (event) {
    case 'SIGNED_IN':
      console.log('User signed in:', session?.user);
      break;
    case 'SIGNED_OUT':
      console.log('User signed out');
      break;
    case 'TOKEN_REFRESHED':
      console.log('Token refreshed silently');
      break;
    case 'SESSION_EXPIRED':
      console.log('Session expired — redirect to login');
      break;
    case 'USER_UPDATED':
      console.log('User profile was updated');
      break;
    case 'MFA_REQUIRED':
      console.log('MFA challenge required');
      break;
  }
});

// Stop listening
unsubscribe();
```

### Events

| Event | Fired When | Session Data |
|-------|------------|--------------|
| `SIGNED_IN` | Successful login (any method) | `AuthSession` |
| `SIGNED_OUT` | Logout or token cleared | `null` |
| `TOKEN_REFRESHED` | Auto or manual token refresh | `AuthSession` |
| `SESSION_EXPIRED` | Refresh failed, tokens cleared | `null` |
| `USER_UPDATED` | Profile update completed | `AuthSession` |
| `MFA_REQUIRED` | Login blocked by MFA | `null` |

---

## Storage Adapters

Control where tokens are persisted:

```typescript
import {
  localStorageAdapter,           // Default — survives page reload and browser restart
  sessionStorageAdapter,         // Cleared when the browser tab closes
  createMemoryStorageAdapter,    // In-memory only — for SSR or testing
  createCookieStorageAdapter,    // Cookie-based — SSR-friendly
} from '@hellojohn/js';
```

### Examples

```typescript
// Session storage (cleared on tab close)
const auth = createHelloJohn({
  domain: '...',
  clientID: '...',
  storage: sessionStorageAdapter,
});

// Cookie storage with custom options
const auth = createHelloJohn({
  domain: '...',
  clientID: '...',
  storage: createCookieStorageAdapter({
    path: '/',
    domain: '.example.com',
    secure: true,             // Default: true
    sameSite: 'Lax',          // Default: 'Lax'
    maxAge: 60 * 60 * 24 * 7, // 7 days
  }),
});

// Memory storage (no persistence — useful for SSR/testing)
const auth = createHelloJohn({
  domain: '...',
  clientID: '...',
  storage: createMemoryStorageAdapter(),
});
```

### Custom Storage

Implement `StorageAdapter` for custom backends (React Native AsyncStorage, encrypted storage, etc.):

```typescript
interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}
```

---

## Authenticated Fetch Wrapper

Create a `fetch` wrapper that auto-injects the `Authorization: Bearer` header on every request:

```typescript
const fetchWithAuth = auth.createFetchWrapper();

// All requests include the access token automatically
const response = await fetchWithAuth('https://api.example.com/data');
const data = await response.json();
```

**Standalone version** (bring your own token getter):

```typescript
import { createFetchWrapper } from '@hellojohn/js';

const fetchWithAuth = createFetchWrapper(async () => {
  return myTokenStore.getAccessToken();
});
```

---

## JWT Utilities

Low-level JWT decode helpers. These **decode** tokens but do **NOT verify signatures**.

```typescript
import { decodeJWTPayload, isTokenExpired, getTokenExpiresIn } from '@hellojohn/js';

// Decode token payload
const payload = decodeJWTPayload(accessToken);
// { sub: "user-id", exp: 1234567890, email: "user@example.com", ... }

// Check if token is expired (with 30s clock skew tolerance)
const expired = isTokenExpired(accessToken, 30);

// Get milliseconds until token expires (0 if already expired)
const msRemaining = getTokenExpiresIn(accessToken);
```

> For **server-side token verification** with signature validation, use `@hellojohn/node`.

---

## Error Handling

All SDK errors extend `HelloJohnError` with `code` and optional `statusCode`:

```typescript
import {
  HelloJohnError,
  AuthenticationError,
  TokenError,
  MFARequiredError,
  NetworkError,
} from '@hellojohn/js';

try {
  await auth.loginWithCredentials(email, password);
} catch (err) {
  if (err instanceof MFARequiredError) {
    // Login requires MFA — err.challengeId is available
    handleMFA(err.challengeId);
  } else if (err instanceof AuthenticationError) {
    // 401 — wrong credentials, disabled user, unverified email
    showError(err.message);
  } else if (err instanceof NetworkError) {
    // Network failure — server unreachable
    showError('Connection failed. Please try again.');
  } else if (err instanceof HelloJohnError) {
    // Other server error
    console.error(`[${err.code}] ${err.message} (HTTP ${err.statusCode})`);
  }
}
```

### Error Classes

| Class | Default Code | HTTP Status | When |
|-------|-------------|-------------|------|
| `HelloJohnError` | varies | varies | Base class for all SDK errors |
| `AuthenticationError` | `authentication_error` | 401 | Invalid credentials, disabled user, email not verified |
| `TokenError` | `token_error` | varies | Token exchange or refresh failure |
| `MFARequiredError` | `mfa_required` | 403 | Login requires MFA. Has `challengeId` property. |
| `NetworkError` | `network_error` | — | Network request failed (no response) |

---

## API Endpoints Reference

Endpoints called by the SDK against the HelloJohn server:

| Method | Endpoint | SDK Method |
|--------|----------|------------|
| `GET` | `/v2/auth/config?client_id=...` | `getTenantConfig()` |
| `POST` | `/v2/auth/login` | `loginWithCredentials()` |
| `POST` | `/v2/auth/register` | `register()` |
| `GET` | `/oauth2/authorize` | `loginWithRedirect()` |
| `POST` | `/oauth2/token` | `handleRedirectCallback()` |
| `POST` | `/oauth2/revoke` | `revokeToken()` |
| `GET` | `/v2/auth/social/{provider}/start` | `loginWithSocialProvider()` |
| `POST` | `/v2/auth/social/exchange` | `handleSocialCallback()` |
| `GET` | `/userinfo` | `getUser()` |
| `POST` | `/v2/session/logout` | `logout()` |
| `POST` | `/v2/auth/logout-all` | `logoutAll()` |
| `GET` | `/v2/auth/providers` | `getProviders()` |
| `POST` | `/v2/auth/forgot` | `forgotPassword()` |
| `POST` | `/v2/auth/reset` | `resetPassword()` |
| `POST` | `/v2/auth/verify-email/start` | `resendVerificationEmail()` |
| `POST` | `/v2/auth/complete-profile` | `completeProfile()` |
| `POST` | `/v2/mfa/totp/enroll` | `mfa.enrollTOTP()` |
| `POST` | `/v2/mfa/totp/verify` | `mfa.verifyTOTP()` |
| `POST` | `/v2/mfa/totp/challenge` | `mfa.challengeTOTP()`, `mfa.solveTOTP()` |
| `POST` | `/v2/mfa/totp/disable` | `mfa.disableTOTP()` |
| `POST` | `/v2/mfa/recovery/rotate` | `mfa.rotateRecoveryCodes()` |

---

## TypeScript Types

All types are exported from the package:

```typescript
import type {
  // Client
  AuthClientOptions,
  AuthClient,

  // User & Session
  User,
  TokenResponse,
  AuthSession,

  // Auth operations
  LoginOptions,
  RegisterOptions,
  RegisterResponse,
  AuthConfig,
  CustomFieldSchema,

  // Events
  AuthEvent,
  AuthEventCallback,

  // MFA
  MFAEnrollResult,
  MFAChallengeResult,
  MFARecoveryResult,
  MFAClient,

  // Storage
  StorageAdapter,

  // JWT
  JWTPayload,

  // Errors
  HelloJohnError,
  AuthenticationError,
  TokenError,
  MFARequiredError,
  NetworkError,
} from '@hellojohn/js';
```

---

## License

MIT

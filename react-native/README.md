# @hellojohn/react-native

React Native and Expo authentication SDK for [HelloJohn](https://github.com/dropDatabas3/hellojohn). Provides secure token storage (iOS Keychain / Android Keystore), OAuth2 PKCE browser flow, reactive hooks, and pre-built UI components.

## Installation

```bash
npx expo install @hellojohn/react-native \
  expo-secure-store \
  expo-auth-session \
  expo-crypto \
  expo-web-browser
```

**Requires:** React Native 0.73+, Expo 50+, React 18+.

---

## Quick Start

### 1. Configure `app.json` — deep link scheme

```json
{
  "expo": {
    "scheme": "myapp"
  }
}
```

### 2. Wrap your app with `HelloJohnProvider`

```tsx
// app/_layout.tsx (Expo Router)
import { HelloJohnProvider } from "@hellojohn/react-native"
import { Stack } from "expo-router"

export default function Root() {
  return (
    <HelloJohnProvider
      domain="https://auth.example.com"
      clientId="your-client-id"
      tenantId="acme"
      redirectScheme="myapp"
    >
      <Stack />
    </HelloJohnProvider>
  )
}
```

### 3. Use in screens

```tsx
// app/index.tsx
import { useAuth, SignIn, UserButton } from "@hellojohn/react-native"

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return null

  return isAuthenticated ? <UserButton /> : <SignIn />
}
```

---

## `HelloJohnProvider`

Root context provider. Must wrap the entire app.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | `string` | ✅ | HelloJohn server URL |
| `clientId` | `string` | ✅ | OAuth client ID |
| `tenantId` | `string` | — | Tenant slug |
| `redirectScheme` | `string` | — | App URI scheme (e.g. `"myapp"`) |
| `redirectUri` | `string` | — | Full redirect URI (overrides scheme) |

---

## `useAuth()` Hook

Full authentication state and actions.

```tsx
const {
  // State
  isAuthenticated, // boolean
  user,            // HelloJohnUser | null
  isLoading,       // boolean
  error,           // string | null

  // Actions
  login,             // (email, password) => Promise<void | MFARequiredResult>
  loginWithRedirect, // (scopes?: string[]) => Promise<void> — PKCE browser flow
  logout,            // () => Promise<void>

  // Direct SDK access
  auth,              // HelloJohnJS instance (advanced use)
} = useAuth()
```

### Password login

```tsx
const { login, error, isLoading } = useAuth()

async function handleLogin() {
  try {
    await login("user@example.com", "password")
    // User is now authenticated — state updates automatically
  } catch (e) {
    console.error(e)
  }
}
```

### OAuth/PKCE browser flow

Opens the system browser for OAuth, handles the deep link callback automatically.

```tsx
const { loginWithRedirect } = useAuth()

<Button
  title="Sign in with OAuth"
  onPress={() => loginWithRedirect(["openid", "profile", "email"])}
/>
```

### MFA flow

```tsx
import { MFARequiredResult } from "@hellojohn/react-native"

const result = await login(email, password)
if (result && "challengeToken" in result) {
  // Navigate to MFA screen
  router.push("/mfa")
  // challengeToken is stored securely and retrieved automatically by the MFA endpoint
}
```

---

## `useUser()` Hook

Read-only user profile data.

```tsx
const { user, isAuthenticated } = useUser()

// user shape
user?.id        // string
user?.email     // string
user?.name      // string | undefined
user?.picture   // string | undefined
user?.roles     // string[]
```

---

## Pre-built Components

### `<SignIn />`

Drop-in sign-in screen with email/password form.

```tsx
import { SignIn } from "@hellojohn/react-native"

export default function LoginScreen() {
  return <SignIn />
}
```

### `<UserButton />`

User avatar with tap-to-open profile/logout menu.

```tsx
import { UserButton } from "@hellojohn/react-native"

// Place in your app's header or home screen
<UserButton />
```

---

## Secure Storage

Tokens are stored using `expo-secure-store`:
- **iOS** — Keychain Services
- **Android** — Android Keystore / EncryptedSharedPreferences

The following are stored automatically:

| Key | Contents |
|-----|----------|
| Access token | Short-lived JWT |
| Refresh token | Long-lived refresh token |
| User profile | Cached user object |
| MFA challenge token | Temporary per-MFA-attempt |

On app startup, the SDK hydrates state from secure storage automatically. Tokens are refreshed in the background before they expire (at 75% of their lifetime, with a minimum 5-second interval).

---

## Token Refresh

The SDK automatically refreshes access tokens before they expire:

- Refresh runs at **75% of the access token lifetime**
- Minimum interval: **5 seconds** between refresh attempts
- On refresh failure: user state is cleared and `SIGNED_OUT` event fires
- Works while the app is in the foreground

---

## Auth State Events

| Event | Description |
|-------|-------------|
| `SIGNED_IN` | Login completed |
| `SIGNED_OUT` | Logout or session cleared |
| `TOKEN_REFRESHED` | Access token refreshed silently |
| `SESSION_EXPIRED` | Token could not be refreshed |
| `USER_UPDATED` | User profile changed |

---

## Expo Router — Auth Middleware

Protect routes declaratively with Expo Router's layout groups:

```tsx
// app/(auth)/_layout.tsx
import { useAuth } from "@hellojohn/react-native"
import { Redirect, Stack } from "expo-router"

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return null
  if (!isAuthenticated) return <Redirect href="/login" />

  return <Stack />
}
```

---

## License

MIT — see [LICENSE](../../LICENSE).

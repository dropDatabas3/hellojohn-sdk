# @hellojohn/react

React SDK for **HelloJohn** — the self-hosted, multi-tenant identity platform.

Everything you need to add authentication to a React application: provider, hooks, prebuilt UI components, page wrappers, theme system, i18n, server utilities, and RBAC — all in one package.

---

## Table of Contents

- [Installation](#installation)
- [Entry Points](#entry-points)
- [Architecture Overview](#architecture-overview)
- [Integration Modes](#integration-modes)
- [Quick Start — Quick Mode (Recommended)](#quick-start--quick-mode-recommended)
- [Quick Start — Advanced Mode](#quick-start--advanced-mode)
- [AuthProvider Reference](#authprovider-reference)
- [Hooks](#hooks)
- [Prebuilt UI Components](#prebuilt-ui-components)
- [Page Components (`@hellojohn/react/pages`)](#page-components-hellojohnreactpages)
- [Navigation Components](#navigation-components)
- [Auth Guards & Protected Routes](#auth-guards--protected-routes)
- [Theme System](#theme-system)
- [Internationalization (i18n)](#internationalization-i18n)
- [Server Utilities (`@hellojohn/react/server`)](#server-utilities-hellojohnreactserver)
- [Routing Utilities](#routing-utilities)
- [byeJohn — Emergency Logout](#byejohn--emergency-logout)
- [TypeScript Reference](#typescript-reference)
- [Examples](#examples)
- [License](#license)

---

## Installation

```bash
npm install @hellojohn/react @hellojohn/js
```

`@hellojohn/js` is a peer dependency — the React SDK wraps it internally.

**Requirements:** React 18+ and React DOM 18+.

---

## Entry Points

The SDK provides three entry points via package exports:

| Import Path | Purpose |
|---|---|
| `@hellojohn/react` | Provider, hooks, UI components, navigation, themes, i18n, routing utilities |
| `@hellojohn/react/pages` | Prebuilt page wrappers (`LoginPage`, `RegisterPage`, `AuthFlowPage`, etc.) |
| `@hellojohn/react/server` | Server-side helper for Next.js App Router (`createServerClient`) |

```tsx
// Core
import { AuthProvider, useAuth, SignIn, SignUp, UserButton } from "@hellojohn/react"

// Pages
import { LoginPage, AuthFlowPage, CallbackPage, ProtectedPage } from "@hellojohn/react/pages"

// Server
import { createServerClient } from "@hellojohn/react/server"
```

---

## Architecture Overview

```
AuthProvider (root)
├── Initializes @hellojohn/js client
├── Manages auth state (user, tokens, loading)
├── RoutingProvider (routes + navigate function)
│   └── I18nProvider (locale + overrides)
│       └── Your App
│           ├── useAuth()         → state + actions
│           ├── useRoutes()       → route config
│           ├── useHJNavigate()   → SPA navigation
│           ├── <SignIn />        → login form
│           ├── <UserButton />    → avatar dropdown
│           └── <AuthGuard />     → access control
```

`AuthProvider` is the only provider you need. It internally wires:
- The JS SDK client (`@hellojohn/js`)
- Route resolution with sensible defaults per mode
- Redirect URI auto-detection
- Redirect allowlist auto-computation
- Theme propagation to all child components
- i18n context for all labels

---

## Integration Modes

The SDK offers two modes, set via the `mode` prop on `AuthProvider`:

| Mode | Value | Description | Routing |
|---|---|---|---|
| **Quick** | `"quick"` | Minimal setup, one catch-all route | `/auth/login`, `/auth/register`, etc. |
| **Advanced** | `"advanced"` | Full control, explicit routes | `/login`, `/register`, etc. |

### Quick Mode

All auth routes are automatically prefixed under a base path (default: `/auth`). You only need:
1. One `AuthProvider` with `mode="quick"`
2. One catch-all route file (`app/auth/[[...flow]]/page.tsx`)

Routes, redirect allowlists, and redirect URIs are computed internally. The catch-all handles login, register, forgot-password, reset-password, and OAuth callback — all under `/auth/*`. Zero configuration required beyond `domain`, `clientID`, and `mode`.

### Advanced Mode

Routes use root-level paths (`/login`, `/register`, etc.). You create one file per auth page. This gives you complete control over each page's layout, props, and behavior.

---

## Quick Start — Quick Mode (Recommended)

The fastest way to integrate HelloJohn. Two files, under 15 lines of code total.

### Step 1: Provider

```tsx
// components/providers.tsx
"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { AuthProvider, es } from "@hellojohn/react"

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  return (
    <AuthProvider
      domain={process.env.NEXT_PUBLIC_HELLOJOHN_DOMAIN!}
      clientID={process.env.NEXT_PUBLIC_HELLOJOHN_CLIENT_ID!}
      tenantID={process.env.NEXT_PUBLIC_HELLOJOHN_TENANT_ID}
      locale={es}
      theme="midnight"
      mode="quick"
      routes={{ afterLogin: "/dashboard" }}
      navigate={(path: string) => router.push(path)}
    >
      {children}
    </AuthProvider>
  )
}
```

Wrap your root layout:

```tsx
// app/layout.tsx
import { Providers } from "@/components/providers"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### Step 2: Auth Flow (one catch-all route)

```tsx
// app/auth/[[...flow]]/page.tsx
"use client"

import { AuthFlowPage } from "@hellojohn/react/pages"

export default function Page() {
  return <AuthFlowPage />
}
```

That's it. This single component handles `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, and `/auth/callback` (OAuth + email verification) automatically. You can customize per-flow appearance:

```tsx
export default function Page() {
  return (
    <AuthFlowPage
      loginProps={{
        theme: "ocean",
        backgroundImage: "/hero.jpg",
        backgroundBlur: 0,
        formPosition: "center",
      }}
      registerProps={{
        theme: "ocean",
        backgroundImage: "/hero.jpg",
      }}
    />
  )
}
```

### Step 3: Protect routes (optional)

```tsx
// app/dashboard/layout.tsx
import { ProtectedPage } from "@hellojohn/react/pages"

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ProtectedPage>{children}</ProtectedPage>
}
```

### That's it.

With quick mode, `AuthProvider` auto-computes:
- **Routes**: `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/callback`
- **After login**: `/` (override with `routes={{ afterLogin: "/dashboard" }}`)
- **After logout**: `/auth/login`
- **Redirect URI**: `window.location.origin + /auth/callback`
- **Allowed redirects**: all of the above, deduplicated and sanitized

Everything lives under your catch-all route — no separate callback file needed. You only need `routes` if you want to override a default (like `afterLogin` above). You never need `allowedRedirects` or `redirectURI` — they are computed automatically.

---

## Quick Start — Advanced Mode

For full control over each auth page.

### Step 1: Provider

```tsx
// components/providers.tsx
"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { AuthProvider } from "@hellojohn/react"

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  return (
    <AuthProvider
      domain={process.env.NEXT_PUBLIC_HELLOJOHN_DOMAIN!}
      clientID={process.env.NEXT_PUBLIC_HELLOJOHN_CLIENT_ID!}
      tenantID={process.env.NEXT_PUBLIC_HELLOJOHN_TENANT_ID}
      mode="advanced"
      theme="midnight"
      routes={{ afterLogin: "/dashboard" }}
      navigate={(path: string) => router.push(path)}
    >
      {children}
    </AuthProvider>
  )
}
```

### Step 2: One-line auth pages

```tsx
// app/login/page.tsx
export { LoginPage as default } from "@hellojohn/react/pages"

// app/register/page.tsx
export { RegisterPage as default } from "@hellojohn/react/pages"

// app/forgot-password/page.tsx
export { ForgotPasswordPage as default } from "@hellojohn/react/pages"

// app/reset-password/page.tsx
export { ResetPasswordPage as default } from "@hellojohn/react/pages"

// app/callback/page.tsx
export { CallbackPage as default } from "@hellojohn/react/pages"
```

### Step 3: Protect routes

```tsx
// app/dashboard/layout.tsx
import { ProtectedPage } from "@hellojohn/react/pages"

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ProtectedPage>{children}</ProtectedPage>
}
```

### Custom page styling

Page wrappers accept all the visual props (`theme`, `backgroundImage`, `formPosition`, etc.) so you can customize directly:

```tsx
// app/login/page.tsx
"use client"

import { LoginPage } from "@hellojohn/react/pages"

export default function Page() {
  return (
    <LoginPage
      theme="ocean"
      backgroundImage="/hero.jpg"
      backgroundBlur={0}
      formPosition="right"
      glassmorphism
    />
  )
}
```

If you need to embed the form inside your own custom layout (not full-page), use the raw `<SignIn>` component directly. Note that you'll need to wire routes and callbacks manually:

```tsx
// app/login/page.tsx
"use client"

import { SignIn } from "@hellojohn/react"
import { MyCustomLayout } from "@/components/layout"

export default function Page() {
  return (
    <MyCustomLayout>
      <SignIn
        theme="ocean"
        signUpUrl="/register"
        forgotPasswordUrl="/forgot-password"
        redirectTo="/dashboard"
      />
    </MyCustomLayout>
  )
}
```

**When to use which:**
- `<LoginPage>` — auto-wires routes from `AuthProvider` context, handles redirects. Use props for visual customization.
- `<SignIn>` — same form, but you provide `signUpUrl`, `forgotPasswordUrl`, `redirectTo`, and `onSuccess` yourself. Use when embedding inside a custom layout.

---

## AuthProvider Reference

`AuthProvider` is the root of the SDK. There is no `HelloJohnProvider` alias — this is the only provider.

```tsx
<AuthProvider
  domain="https://auth.example.com"
  clientID="my-app"
  tenantID="acme"
  mode="quick"
  theme="midnight"
  locale={es}
  navigate={(path: string) => router.push(path)}
>
  {children}
</AuthProvider>
```

### Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `domain` | `string` | **Yes** | — | HelloJohn server URL |
| `clientID` | `string` | **Yes** | — | OAuth client ID from your tenant config |
| `tenantID` | `string` | No | — | Tenant slug or ID. Required for multi-tenant setups |
| `mode` | `"quick" \| "advanced"` | No | `"advanced"` | Integration mode |
| `theme` | `ThemeName` | No | `"minimal"` | Global theme for all SDK components |
| `locale` | `string \| Locale` | No | `"en"` | Built-in: `"en"`, `"es"`, or a custom `Locale` object |
| `localeOverrides` | `DeepPartial<Locale>` | No | — | Partial translation overrides merged on top of base locale |
| `navigate` | `(path: string) => void` | No | `window.location.href` | SPA navigation function. Pass `router.push` for client-side nav |
| `routes` | `Partial<AuthRoutes>` | No | mode defaults | Override any route path. Your values always win over defaults |
| `authBasePath` | `string` | No | `"/auth"` | Base path prefix for quick mode routes. Ignored in advanced mode |
| `redirectURI` | `string` | No | auto-detected | OAuth redirect URI. Auto-resolved from `origin + callback route` |
| `allowedRedirects` | `string[]` | No | auto-computed | Internal redirect allowlist. Merged with auto-computed paths |
| `onAuthError` | `(error: string) => void` | No | — | Custom error handler. If omitted, SDK renders `AuthError` component |

### Route Defaults

| Route | Quick Mode | Advanced Mode |
|---|---|---|
| `login` | `/auth/login` | `/login` |
| `register` | `/auth/register` | `/register` |
| `forgotPassword` | `/auth/forgot-password` | `/forgot-password` |
| `resetPassword` | `/auth/reset-password` | `/reset-password` |
| `callback` | `/auth/callback` | `/callback` |
| `afterLogin` | `/` | `/` |
| `afterLogout` | `/auth/login` | `/login` |

To override any route, pass it in the `routes` prop:

```tsx
<AuthProvider
  mode="quick"
  routes={{ afterLogin: "/dashboard", afterLogout: "/" }}
>
```

### Custom Auth Base Path

In quick mode, you can change the prefix for all auth routes:

```tsx
<AuthProvider
  mode="quick"
  authBasePath="/cuenta"  // Spanish prefix
>
```

This auto-generates routes like `/cuenta/login`, `/cuenta/register`, `/cuenta/callback`, etc. Your catch-all route must match:

```
app/cuenta/[[...flow]]/page.tsx
```

---

## Hooks

### `useAuth()`

The primary hook. Returns auth state and actions.

```tsx
import { useAuth } from "@hellojohn/react"

function MyComponent() {
  const {
    // State
    isAuthenticated,     // boolean — true when user has valid session
    isLoading,           // boolean — true during initialization
    user,                // User | null — current user profile
    config,              // AuthConfig | null — tenant configuration
    client,              // AuthClient | null — raw JS SDK client
    error,               // string | null — auth error message

    // Auth Actions
    login,               // (opts?) => Promise<void> — PKCE redirect flow
    loginWithCredentials,// (email, pass) => Promise<void> — direct login
    loginWithSocialProvider, // (provider) => Promise<void> — social OAuth
    register,            // (opts) => Promise<any> — user registration
    logout,              // (returnTo?) => void — sign out

    // Profile
    completeProfile,     // (fields) => Promise<void> — complete missing fields
    needsProfileCompletion, // boolean — true if required fields are missing

    // RBAC
    hasRole,             // (role) => boolean — check user role
    hasPermission,       // (perm) => boolean — check user permission

    // Provider Config
    theme,               // ThemeName — active theme
    integrationMode,     // "quick" | "advanced"
    authBasePath,        // string — resolved base path
    allowedRedirects,    // string[] — computed redirect allowlist
  } = useAuth()
}
```

#### Login Methods

```tsx
// PKCE redirect flow (recommended for most cases)
await login()
await login({ scope: "openid profile email" })

// Direct credentials (email + password)
await loginWithCredentials("user@example.com", "password123")

// Social provider (currently Google)
await loginWithSocialProvider("google")
```

#### Registration

```tsx
await register({
  email: "user@example.com",
  password: "securePassword",
  name: "John Doe",
  custom_fields: {
    company: "Acme Corp",
    phone: "+1234567890",
  },
})
```

#### Logout

```tsx
logout()                    // Uses routes.afterLogout
logout("/goodbye")          // Custom return URL
```

#### RBAC

```tsx
if (hasRole("admin")) {
  // Show admin panel
}

if (hasPermission("products:write")) {
  // Show edit button
}
```

### `useRoutes()`

Returns the resolved route configuration.

```tsx
import { useRoutes } from "@hellojohn/react"

const routes = useRoutes()
// routes.login       → "/auth/login" (quick mode)
// routes.afterLogin  → "/"
// routes.callback    → "/auth/callback" (quick mode)
```

### `useHJNavigate()`

Returns the navigation function passed to `AuthProvider`. Falls back to `window.location.href` if none was provided.

```tsx
import { useHJNavigate } from "@hellojohn/react"

const navigate = useHJNavigate()
navigate("/dashboard")  // Uses router.push if provided
```

### `useSearchParam(key)`

Framework-agnostic URL query parameter extraction.

```tsx
import { useSearchParam } from "@hellojohn/react"

const token = useSearchParam("token")     // ?token=abc → "abc"
const verified = useSearchParam("verified") // ?verified=true → "true"
```

### `useI18n()`

Returns the active locale object with all translation strings.

```tsx
import { useI18n } from "@hellojohn/react"

const i18n = useI18n()
// i18n.signIn.title → "Sign In" (en) or "Iniciar sesión" (es)
```

---

## Prebuilt UI Components

All components respect the provider theme, tenant config (logo, social providers, SMTP), and i18n automatically.

### `<SignIn />`

Full sign-in form with email/password, social login (Google), email verification handling, and password visibility toggle.

```tsx
import { SignIn } from "@hellojohn/react"

<SignIn />

<SignIn
  theme="ocean"
  backgroundImage="/hero.jpg"
  backgroundBlur={0}
  formPosition="right"
  glassmorphism
  onSuccess={() => console.log("Logged in!")}
  signUpUrl="/register"
  forgotPasswordUrl="/forgot-password"
  hideSignUpLink={false}
  customStyles={{
    primaryColor: "#6366f1",
    borderRadius: "12px",
  }}
/>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `onSuccess` | `() => void` | — | Called after successful login |
| `redirectTo` | `string` | `"/"` | Redirect target after login |
| `signUpUrl` | `string` | `"/register"` | Sign up link URL |
| `forgotPasswordUrl` | `string` | `"/forgot-password"` | Forgot password link URL |
| `hideSignUpLink` | `boolean` | `false` | Hide the sign-up link |
| `theme` | `ThemeName` | `"minimal"` | Component theme |
| `backgroundImage` | `string` | — | Full-page background image URL |
| `backgroundBlur` | `number` | `4` | Background blur intensity (0–20) |
| `formPosition` | `"left" \| "center" \| "right"` | `"center"` | Form alignment |
| `glassmorphism` | `boolean` | `false` | Enable glass effect on form card |
| `customStyles` | `object` | — | Override `primaryColor` and `borderRadius` |

### `<SignUp />`

Multi-step registration form. Automatically renders custom fields from tenant config (phone, country, etc.), password strength validation, and social registration.

```tsx
import { SignUp } from "@hellojohn/react"

<SignUp />

<SignUp
  theme="midnight"
  backgroundImage="/register_bg.jpg"
  formPosition="center"
  signInUrl="/login"
/>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `onSuccess` | `() => void` | — | Called after successful registration |
| `redirectTo` | `string` | `"/login"` | Redirect after registration |
| `signInUrl` | `string` | `"/login"` | Sign in link URL |
| `hideSignInLink` | `boolean` | `false` | Hide the sign-in link |
| `theme` | `ThemeName` | `"minimal"` | Component theme |
| `backgroundImage` | `string` | — | Background image URL |
| `backgroundBlur` | `number` | `4` | Blur intensity |
| `formPosition` | `"left" \| "center" \| "right"` | `"center"` | Form alignment |
| `glassmorphism` | `boolean` | `false` | Glass effect |
| `customStyles` | `object` | — | Style overrides |

### `<ForgotPassword />`

Password reset request form. Sends a reset email via SMTP.

```tsx
import { ForgotPassword } from "@hellojohn/react"

<ForgotPassword theme="midnight" signInUrl="/login" />
```

### `<ResetPassword />`

Password reset form. Reads the `?token=` parameter from URL automatically.

```tsx
import { ResetPassword } from "@hellojohn/react"

<ResetPassword theme="midnight" signInUrl="/login" />
```

### `<UserButton />`

Avatar circle that opens a dropdown with user info and sign-out action.

```tsx
import { UserButton } from "@hellojohn/react"

<UserButton />
<UserButton afterSignOutUrl="/goodbye" size={40} />
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `afterSignOutUrl` | `string` | `routes.afterLogout` | Redirect after sign out |
| `theme` | `ThemeName` | provider theme | Override theme |
| `size` | `number` | `36` | Avatar diameter in pixels |
| `customStyles` | `object` | — | Style overrides |

Shows user avatar or initials. Dropdown includes name, email, and sign-out button. Invisible when not authenticated.

### `<UserProfile />`

User profile display with optional MFA setup trigger.

```tsx
import { UserProfile } from "@hellojohn/react"

<UserProfile />
<UserProfile onMFASetup={() => setShowMFA(true)} />
```

### `<MFASetup />`

TOTP enrollment flow: QR code display → code verification → recovery codes.

```tsx
import { MFASetup } from "@hellojohn/react"

<MFASetup
  onComplete={() => alert("MFA enabled!")}
  onCancel={() => setShowMFA(false)}
  theme="midnight"
/>
```

### `<MFAChallenge />`

TOTP code input for MFA-enabled logins.

```tsx
import { MFAChallenge } from "@hellojohn/react"

<MFAChallenge
  onSuccess={() => navigate("/dashboard")}
  onCancel={() => navigate("/login")}
/>
```

### `<CompleteProfile />`

Form for completing required custom fields after social login. Rendered automatically by `CallbackPage` when `needsProfileCompletion` is true.

```tsx
import { CompleteProfile } from "@hellojohn/react"

<CompleteProfile
  onComplete={() => navigate("/dashboard")}
  allowSkip
/>
```

### `<AuthError />`

Full-page error display for auth failures (social login errors, server errors). Rendered automatically by `AuthProvider` when an error occurs and no `onAuthError` handler is provided.

```tsx
import { AuthError } from "@hellojohn/react"

<AuthError
  error="Social login failed"
  errorCode="social_callback_error"
  errorFlow="social"
  theme="midnight"
  onRetry={() => window.location.href = "/"}
/>
```

### `<EmailVerificationPending />`

Displayed after registration when email verification is required.

### `<FormWrapper />`

Utility wrapper providing consistent themed card layout for custom auth forms.

---

## Page Components (`@hellojohn/react/pages`)

Page components are thin wrappers around UI components. They auto-wire routes from the provider context, handle URL parameters, and manage redirects. Designed for one-line exports.

### `LoginPage`

Wraps `SignIn`. Auto-wires `signUpUrl` and `forgotPasswordUrl` from routes.

```tsx
// One-line usage
export { LoginPage as default } from "@hellojohn/react/pages"

// With props
import { LoginPage } from "@hellojohn/react/pages"
export default function Page() {
  return <LoginPage backgroundImage="/hero.jpg" theme="ocean" />
}
```

### `RegisterPage`

Wraps `SignUp`. Auto-wires `signInUrl` from routes.

```tsx
export { RegisterPage as default } from "@hellojohn/react/pages"
```

### `ForgotPasswordPage`

Wraps `ForgotPassword`. Auto-wires `signInUrl` from routes.

```tsx
export { ForgotPasswordPage as default } from "@hellojohn/react/pages"
```

### `ResetPasswordPage`

Wraps `ResetPassword`. Auto-reads `?token=` from URL.

```tsx
export { ResetPasswordPage as default } from "@hellojohn/react/pages"
```

### `CallbackPage`

Handles three post-auth scenarios:
1. **OAuth callback**: redirects to `afterLogin`
2. **Email verification**: redirects to login with `?verified=true`
3. **Profile completion**: renders `CompleteProfile` form

```tsx
export { CallbackPage as default } from "@hellojohn/react/pages"

// With custom redirect
import { CallbackPage } from "@hellojohn/react/pages"
export default function Page() {
  return <CallbackPage afterLogin="/dashboard" allowSkipProfile={false} />
}
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `afterLogin` | `string` | `routes.afterLogin` | Where to redirect after auth completes |
| `allowSkipProfile` | `boolean` | `true` | Whether profile completion can be skipped |

### `ProtectedPage`

Wraps `AuthGuard` with `redirect` mode and themed loading spinner.

```tsx
// Basic — redirects to login if not authenticated
<ProtectedPage>{children}</ProtectedPage>

// Require admin role
<ProtectedPage role="admin">{children}</ProtectedPage>

// Require specific permission
<ProtectedPage permission="products:write">{children}</ProtectedPage>

// Enforce profile completion
<ProtectedPage requireCompleteProfile>{children}</ProtectedPage>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `role` | `string \| string[]` | — | Required role(s) |
| `permission` | `string` | — | Required permission |
| `requireCompleteProfile` | `boolean` | `true` | Redirect if profile incomplete |
| `redirectTo` | `string` | `routes.login` | Custom redirect path |
| `loading` | `ReactNode` | themed spinner | Custom loading component |

### `AuthFlowPage`

Single-page branching component for quick mode. Resolves which auth flow to render based on URL.

```tsx
<AuthFlowPage />

<AuthFlowPage
  loginProps={{ theme: "ocean", backgroundImage: "/bg.jpg" }}
  registerProps={{ theme: "ocean" }}
  forgotPasswordProps={{ theme: "ocean" }}
  resetPasswordProps={{ theme: "ocean" }}
/>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `flow` | `AuthFlow` | — | Force a specific flow (overrides URL) |
| `fallbackFlow` | `AuthFlow` | `"login"` | Flow when URL doesn't match any known flow |
| `basePath` | `string` | `authBasePath` from context | Override the auth base path |
| `loading` | `ReactNode` | `null` | Loading placeholder during SSR hydration |
| `loginProps` | `Partial<LoginPageProps>` | — | Props forwarded to `LoginPage` |
| `registerProps` | `Partial<RegisterPageProps>` | — | Props forwarded to `RegisterPage` |
| `forgotPasswordProps` | `Partial<ForgotPasswordPageProps>` | — | Props forwarded to `ForgotPasswordPage` |
| `resetPasswordProps` | `Partial<ResetPasswordPageProps>` | — | Props forwarded to `ResetPasswordPage` |
| `callbackProps` | `Partial<CallbackPageProps>` | — | Props forwarded to `CallbackPage` |

#### Flow Resolution Order

1. `flow` prop (explicit override)
2. URL path segment under `basePath` (e.g., `/auth/register` → `register`)
3. Query parameter `?flow=register`
4. `fallbackFlow` (default: `"login"`)

#### Supported Flows and Aliases

| Flow | Aliases |
|---|---|
| `login` | `signin`, `sign-in` |
| `register` | `signup`, `sign-up` |
| `forgot-password` | `forgot`, `forgotpassword` |
| `reset-password` | `reset`, `resetpassword` |
| `callback` | `auth-callback` |

---

## Navigation Components

Dynamic links and buttons that read route paths from the provider context. They follow the active mode automatically — no hardcoded URLs.

### `<SignInLink />`

```tsx
import { SignInLink } from "@hellojohn/react"

<SignInLink />                        // Label from i18n, href from routes.login
<SignInLink href="/custom-login" />   // Custom override
<SignInLink spa={false} />            // Full page navigation
<SignInLink className="my-class">
  Custom Label
</SignInLink>
```

### `<SignUpLink />`

```tsx
import { SignUpLink } from "@hellojohn/react"

<SignUpLink />
```

### `<SignInButton />`

```tsx
import { SignInButton } from "@hellojohn/react"

<SignInButton />
<SignInButton className="btn btn-primary" />
```

### `<SignUpButton />`

```tsx
import { SignUpButton } from "@hellojohn/react"

<SignUpButton />
```

**Common props for all navigation components:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `href` | `string` | route from context | Override target URL |
| `spa` | `boolean` | `true` | Use provider `navigate` function for client-side nav |
| `children` | `ReactNode` | i18n label | Custom label content |

Plus standard `<a>` attributes (for links) or `<button>` attributes (for buttons).

**Example with shadcn/ui:**

```tsx
import { SignInButton, SignUpButton } from "@hellojohn/react"
import { buttonVariants } from "@/components/ui/button"

<SignInButton className={buttonVariants({ variant: "ghost", size: "sm" })} />
<SignUpButton className={buttonVariants({ size: "sm" })} />
```

---

## Auth Guards & Protected Routes

### `<AuthGuard />`

Fine-grained access control component. Supports authentication checks, role-based access, permission-based access, and profile completion enforcement.

```tsx
import { AuthGuard } from "@hellojohn/react"

// Basic auth check with fallback
<AuthGuard fallback={<p>Please sign in</p>}>
  <Dashboard />
</AuthGuard>

// Auto-redirect to login
<AuthGuard redirect>
  <Dashboard />
</AuthGuard>

// Require admin role
<AuthGuard role="admin" redirect>
  <AdminPanel />
</AuthGuard>

// Require multiple roles (any match)
<AuthGuard role={["admin", "moderator"]} redirect>
  <ModPanel />
</AuthGuard>

// Require specific permission
<AuthGuard permission="products:write" fallback={<p>Forbidden</p>}>
  <ProductsEditor />
</AuthGuard>

// Require profile completion
<AuthGuard redirect requireCompleteProfile>
  <Dashboard />
</AuthGuard>

// Custom redirect target
<AuthGuard redirect redirectTo="/unauthorized">
  <SecretPage />
</AuthGuard>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `authenticated` | `boolean` | `true` | Require authentication |
| `role` | `string \| string[]` | — | Required role(s). Array = any match |
| `permission` | `string` | — | Required permission string |
| `loading` | `ReactNode` | `null` | Loading state content |
| `fallback` | `ReactNode` | `null` | Content when unauthorized (non-redirect mode) |
| `redirect` | `boolean` | `false` | Redirect to login instead of showing fallback |
| `redirectTo` | `string` | `routes.login` | Custom redirect path |
| `requireCompleteProfile` | `boolean` | `false` | Redirect if profile is incomplete |

### `<Protect />`

Alias for conditional rendering based on auth state. Useful for inline UI gating.

```tsx
import { Protect } from "@hellojohn/react"

<Protect>
  <p>Only visible when authenticated</p>
</Protect>
```

---

## Theme System

Seven built-in themes with dark/light mode support.

| Theme | Mode | Description |
|---|---|---|
| `midnight` | Dark | Deep navy with indigo accents |
| `ocean` | Dark | Ocean blue tones |
| `sunrise` | Light | Warm orange and coral |
| `forest` | Dark | Deep green |
| `honey` | Light | Golden amber |
| `minimal` | Light | Clean, neutral defaults |
| `auto` | System | Uses `midnight` for dark, `minimal` for light |

### Provider-level theme

```tsx
<AuthProvider theme="midnight">
  {/* All SDK components inherit this theme */}
</AuthProvider>
```

### Per-component override

```tsx
<SignIn theme="ocean" />
<UserButton theme="minimal" />
```

### Visual customization

```tsx
<SignIn
  theme="midnight"
  backgroundImage="/hero.jpg"
  backgroundBlur={0}
  formPosition="right"
  glassmorphism
  customStyles={{
    primaryColor: "#6366f1",
    borderRadius: "16px",
  }}
/>
```

### Programmatic theme access

```tsx
import { getTheme, THEMES, type Theme, type ThemeName } from "@hellojohn/react"

const theme = getTheme("midnight")
// theme.colors.background → "#0f0f1a"
// theme.colors.accent → "#6366f1"
// theme.isDark → true
```

---

## Internationalization (i18n)

### Built-in locales

- `en` — English
- `es` — Spanish

```tsx
import { AuthProvider, es } from "@hellojohn/react"

<AuthProvider locale={es}>
  {children}
</AuthProvider>

// Or by string key
<AuthProvider locale="en">
  {children}
</AuthProvider>
```

### Partial overrides

Override specific keys without replacing the entire locale:

```tsx
<AuthProvider
  locale="en"
  localeOverrides={{
    signIn: {
      submitButton: "Continue",
      title: "Welcome Back",
    },
    userButton: {
      signOut: "Log out",
    },
  }}
>
  {children}
</AuthProvider>
```

### Custom locale

Pass a full `Locale` object for complete translation control:

```tsx
import type { Locale } from "@hellojohn/react"

const pt: Locale = {
  signIn: {
    title: "Entrar",
    subtitle: "Bem-vindo de volta",
    emailLabel: "Email",
    // ... all keys
  },
  signUp: { /* ... */ },
  userButton: { /* ... */ },
  common: { /* ... */ },
  // ...
}

<AuthProvider locale={pt}>
  {children}
</AuthProvider>
```

### Template interpolation

```tsx
import { t } from "@hellojohn/react"

t("Hello, {{name}}!", { name: "John" })  // → "Hello, John!"
```

---

## Server Utilities (`@hellojohn/react/server`)

Server-side session reading for Next.js App Router.

```tsx
import { createServerClient } from "@hellojohn/react/server"
import { cookies } from "next/headers"

// In a server component or route handler
const hj = createServerClient({
  domain: process.env.HELLOJOHN_DOMAIN!,
  cookies: await cookies(),
})

const session = hj.getSession()
if (session) {
  console.log("User sub:", session.user.sub)
  console.log("Access token:", session.accessToken)
}

// Or just get the token
const token = hj.getAccessToken()
```

### `createServerClient(config)`

| Param | Type | Description |
|---|---|---|
| `config.domain` | `string` | HelloJohn server URL |
| `config.cookies` | `CookieStore` | Next.js `cookies()` or compatible object with `.get(name)` |

### `ServerClient` methods

| Method | Returns | Description |
|---|---|---|
| `getSession()` | `ServerSession \| null` | Decoded JWT payload + token from `hj:token` cookie |
| `getAccessToken()` | `string \| null` | Raw access token string |

> **Note:** `createServerClient` decodes the JWT payload without verifying the signature. For strict server-side token verification, use `@hellojohn/node`.

---

## Routing Utilities

Path sanitization and redirect safety helpers. Exported from `@hellojohn/react`.

### `normalizeInternalPath(path)`

Validates and normalizes an internal app path. Rejects absolute URLs, protocol-relative URLs, and malformed values.

```tsx
normalizeInternalPath("/dashboard")     // → "/dashboard"
normalizeInternalPath("//evil.com")     // → null
normalizeInternalPath("https://x.com")  // → null
normalizeInternalPath(null)             // → null
```

### `normalizeAuthBasePath(path)`

Normalizes auth base path with secure defaults. Returns `/auth` if the input is invalid or `/`.

```tsx
normalizeAuthBasePath("/cuenta")   // → "/cuenta"
normalizeAuthBasePath("/")         // → "/auth"
normalizeAuthBasePath(undefined)   // → "/auth"
```

### `resolveAllowedRedirects(paths)`

Deduplicates, sanitizes, and returns an allowlist of internal paths.

```tsx
resolveAllowedRedirects(["/", "/dashboard", "/auth/login", null])
// → ["/", "/dashboard", "/auth/login"]
```

### `isAllowedRedirectPath(path, allowlist)`

Checks if a redirect target is in the allowlist after normalization.

```tsx
isAllowedRedirectPath("/dashboard", ["/", "/dashboard"])  // → true
isAllowedRedirectPath("//evil.com", ["/", "/dashboard"])  // → false
```

---

## byeJohn — Emergency Logout

A standalone logout function that works without the React context. Clears all local tokens and calls the server logout endpoint.

```tsx
import { byeJohn } from "@hellojohn/react"

byeJohn()                  // Clear tokens, POST /v2/session/logout, reload
byeJohn("/goodbye")        // Same, but redirect to /goodbye after
```

Useful for:
- Logout buttons outside the provider tree
- Error boundaries
- Emergency session cleanup
- Non-React contexts (vanilla JS event handlers)

---

## TypeScript Reference

### Exported Types

```tsx
// Auth context
import type { AuthProviderProps } from "@hellojohn/react"

// Routing
import type {
  AuthRoutes,
  NavigateFn,
  IntegrationMode,
} from "@hellojohn/react"

// Themes
import type {
  ThemeName,
  Theme,
  ThemeColors,
} from "@hellojohn/react"

// i18n
import type {
  Locale,
  DeepPartial,
} from "@hellojohn/react"

// Components
import type {
  SignInProps,
  SignUpProps,
  ForgotPasswordProps,
  ResetPasswordProps,
  UserButtonProps,
  UserProfileProps,
  MFASetupProps,
  MFAChallengeProps,
  AuthGuardProps,
} from "@hellojohn/react"

// Pages
import type {
  LoginPageProps,
  RegisterPageProps,
  ForgotPasswordPageProps,
  ResetPasswordPageProps,
  CallbackPageProps,
  ProtectedPageProps,
  AuthFlowPageProps,
  AuthFlow,
} from "@hellojohn/react/pages"

// Server
import type {
  ServerClientConfig,
  ServerClient,
  ServerSession,
} from "@hellojohn/react/server"
```

---

## Examples

### Minimal Next.js App (Quick Mode)

```
app/
├── layout.tsx              ← Providers wrapper
├── page.tsx                ← Home page
├── auth/
│   └── [[...flow]]/
│       └── page.tsx        ← AuthFlowPage (all auth flows)
├── callback/
│   └── page.tsx            ← CallbackPage (one line)
└── dashboard/
    ├── layout.tsx          ← ProtectedPage wrapper
    └── page.tsx            ← Dashboard content
```

Total auth-related code: ~15 lines across 4 files.

### Navbar with Auth

```tsx
"use client"

import { useAuth, SignInButton, SignUpButton, UserButton } from "@hellojohn/react"

export function Navbar() {
  const { isAuthenticated, isLoading } = useAuth()

  return (
    <nav>
      <a href="/">Home</a>
      {!isLoading && (
        isAuthenticated ? (
          <UserButton />
        ) : (
          <>
            <SignInButton />
            <SignUpButton />
          </>
        )
      )}
    </nav>
  )
}
```

### Role-Based UI

```tsx
"use client"

import { useAuth, AuthGuard } from "@hellojohn/react"

export function AdminSection() {
  const { hasRole, hasPermission } = useAuth()

  return (
    <div>
      {hasRole("admin") && <a href="/admin">Admin Panel</a>}

      <AuthGuard permission="products:write" fallback={<p>Read only</p>}>
        <button>Edit Product</button>
      </AuthGuard>
    </div>
  )
}
```

### Server-Side Session Check (Next.js)

```tsx
// app/api/me/route.ts
import { createServerClient } from "@hellojohn/react/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  const hj = createServerClient({
    domain: process.env.HELLOJOHN_DOMAIN!,
    cookies: await cookies(),
  })

  const session = hj.getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({ user: session.user })
}
```

### Migration from Advanced to Quick Mode

1. Change `mode="advanced"` to `mode="quick"` in `AuthProvider`
2. Remove explicit `routes`, `allowedRedirects`, and `redirectURI` props (unless customizing)
3. Create `app/auth/[[...flow]]/page.tsx` with `<AuthFlowPage />`
4. Remove individual auth page files (`app/login/page.tsx`, etc.)
5. Keep `app/callback/page.tsx` — it stays the same

Both modes can coexist during migration. Routes from both systems will work simultaneously.

---

## License

MIT

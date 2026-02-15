# HelloJohn SDKs

Official SDKs for integrating HelloJohn authentication across frontend and backend apps.

## Available SDKs

| SDK | Package | Purpose | Status |
|---|---|---|---|
| JavaScript | `@hellojohn/js` | Browser auth client, OAuth flows, token/session management, MFA APIs | Stable |
| React | `@hellojohn/react` | Provider, auth UI components, hooks, page system, themes, i18n | Stable |
| Node.js | `@hellojohn/node` | Server auth utilities, JWT verification, middleware | Stable |
| Go | `hellojohn-go` | Server auth utilities and middleware for Go services | Stable |

## Dependency Graph

```text
@hellojohn/react ---> @hellojohn/js
@hellojohn/node  ---> standalone
hellojohn-go     ---> standalone
```

## Quick Selection Guide

| Need | Use |
|---|---|
| Vanilla JS app | `@hellojohn/js` |
| React app with own UI | `@hellojohn/react` components/hooks |
| React app with minimal auth routing code | `@hellojohn/react/pages` |
| Next.js server side cookie/session read | `@hellojohn/react/server` |
| API/service level JWT enforcement in Node | `@hellojohn/node` |
| API/service level JWT enforcement in Go | `hellojohn-go` |

## React SDK Summary

The React SDK now supports two integration modes plus a hybrid migration strategy.

### 1) Advanced mode

Best when routes are explicit and controlled by app structure.

Typical setup:
- `app/login/page.tsx` -> `LoginPage`
- `app/register/page.tsx` -> `RegisterPage`
- `app/forgot-password/page.tsx` -> `ForgotPasswordPage`
- `app/reset-password/page.tsx` -> `ResetPasswordPage`
- `app/callback/page.tsx` -> `CallbackPage`

Each page can be a one-line re-export from `@hellojohn/react/pages`.

### 2) Quick mode

Best for fastest onboarding.

Typical setup:
- One catch-all route: `app/auth/[[...flow]]/page.tsx`
- Render `AuthFlowPage`
- Configure provider with `mode="quick"` and `authBasePath="/auth"`

`AuthFlowPage` resolves:
- `login`
- `register`
- `forgot-password`
- `reset-password`
- `callback`

### 3) Hybrid mode

Use both at once during migration/testing:
- Keep legacy pages alive
- Add catch-all quick route
- Switch behavior via `routes` + `mode` (often env based)

## React SDK: Dynamic Auth Navigation

The React SDK includes route-aware auth navigation components:

- `SignInLink`
- `SignUpLink`
- `SignInButton`
- `SignUpButton`

These read provider routes (`routes.login`, `routes.register`) and can use SPA navigation through provider `navigate`.

This eliminates hardcoded `/login` or `/register` values in consumer UIs.

## React SDK: Session Components

- `UserButton` uses provider routes for logout destination by default (`routes.afterLogout`).
- Logout updates local auth state immediately before remote logout navigation, so UI does not require manual refresh to reflect sign out.

## React SDK: Security primitives

Routing exports include:
- `normalizeInternalPath`
- `normalizeAuthBasePath`
- `resolveAllowedRedirects`
- `isAllowedRedirectPath`
- `DEFAULT_AUTH_BASE_PATH`
- `DEFAULT_ALLOWED_REDIRECTS`

Use them to enforce internal-only redirects and reduce open-redirect risk.

## React SDK Entry Points

| Entry | Import | Use |
|---|---|---|
| Main | `@hellojohn/react` | Provider, components, hooks, routing, i18n, themes |
| Pages | `@hellojohn/react/pages` | Prebuilt page wrappers and `AuthFlowPage` |
| Server | `@hellojohn/react/server` | Server cookie/session utility |

For full React docs, see `sdks/react/README.md`.

## Build and Test

```bash
# JavaScript SDK
cd sdks/js
npm run build
npm test

# React SDK
cd sdks/react
npm run build
npm test

# Node SDK
cd sdks/node
npm run build
npm test
```

## License

MIT

# @hellojohn/vue

Vue 3 and Nuxt 3 authentication SDK for [HelloJohn](https://github.com/dropDatabas3/hellojohn). Includes a plugin, reactive composables (`useAuth`, `useUser`), drop-in UI components, and full Nuxt 3 module support.

## Installation

```bash
npm install @hellojohn/vue @hellojohn/js
# or
pnpm add @hellojohn/vue @hellojohn/js
```

**Requires:** Vue 3.4+, or Nuxt 3.0+.

---

## Vue 3 — Quick Start

### 1. Register the plugin

```ts
// main.ts
import { createApp } from "vue"
import { createHelloJohn } from "@hellojohn/vue"
import App from "./App.vue"

const app = createApp(App)

app.use(
  createHelloJohn({
    domain: "https://auth.example.com",
    clientId: "your-client-id",
    tenantId: "acme",            // optional
    redirectUri: window.location.origin + "/callback", // optional
  })
)

app.mount("#app")
```

### 2. Use in components

```vue
<script setup lang="ts">
import { useAuth, HjSignIn, HjUserButton } from "@hellojohn/vue"

const { isAuthenticated, user, isLoading, loginWithPassword, logout } = useAuth()
</script>

<template>
  <div v-if="isLoading">Loading...</div>

  <template v-else>
    <!-- Drop-in user button when logged in -->
    <HjUserButton v-if="isAuthenticated" />

    <!-- Drop-in sign-in form when logged out -->
    <HjSignIn v-else />
  </template>
</template>
```

---

## Nuxt 3 — Quick Start

### 1. Configure the module

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@hellojohn/vue/nuxt"],
  hellojohn: {
    domain: "https://auth.example.com",
    clientId: "your-client-id",
    tenantId: "acme",
  },
})
```

### 2. Use composables anywhere

```vue
<!-- pages/profile.vue -->
<script setup lang="ts">
const { user, isAuthenticated } = useAuth()

// Protect the page server-side
definePageMeta({ middleware: "auth" }) // if you add an auth middleware
</script>

<template>
  <div v-if="isAuthenticated">
    <p>Welcome, {{ user?.name }}</p>
  </div>
</template>
```

---

## `useAuth()` Composable

The primary hook for authentication state and actions.

```ts
const {
  // State (reactive refs)
  isAuthenticated, // Ref<boolean>
  user,            // Ref<HelloJohnUser | null>
  isLoading,       // Ref<boolean>
  error,           // Ref<string | null>

  // Actions
  loginWithPassword,      // (email, password) => Promise<void | MFARequiredResult>
  loginWithRedirect,      // () => Promise<void> — OAuth redirect
  signUp,                 // (email, password, name?) => Promise<void>
  logout,                 // (returnTo?: string) => void
  handleRedirectCallback, // (url?: string) => Promise<void>
  refreshUser,            // () => Promise<void>
} = useAuth()
```

### Login with password

```vue
<script setup lang="ts">
import { ref } from "vue"
import { useAuth } from "@hellojohn/vue"

const { loginWithPassword, error, isLoading } = useAuth()
const email = ref("")
const password = ref("")

async function handleSubmit() {
  await loginWithPassword(email.value, password.value)
}
</script>
```

### OAuth redirect flow

```vue
<script setup lang="ts">
import { useAuth } from "@hellojohn/vue"

const { loginWithRedirect } = useAuth()
</script>

<template>
  <button @click="loginWithRedirect()">Sign in with OAuth</button>
</template>
```

### MFA flow

`loginWithPassword` returns an `MFARequiredResult` when MFA is needed:

```ts
import { isMFARequiredResult } from "@hellojohn/vue"

const result = await loginWithPassword(email, password)
if (isMFARequiredResult(result)) {
  // Redirect to MFA challenge screen
  // result.challengeToken is stored automatically
}
```

---

## `useUser()` Composable

Read-only user profile state. Auto-updates when auth changes.

```ts
const { user, isAuthenticated } = useUser()

// user is Ref<HelloJohnUser | null>
user.value?.id
user.value?.email
user.value?.name
user.value?.picture
```

---

## Pre-built Components

### `<HjSignIn />`

Complete sign-in form with email/password and OAuth options.

```vue
<HjSignIn />
```

### `<HjSignUp />`

Complete registration form.

```vue
<HjSignUp />
```

### `<HjUserButton />`

User avatar button with dropdown menu (profile, logout).

```vue
<HjUserButton />
```

---

## Types

```ts
interface HelloJohnOptions {
  domain: string       // Required: HelloJohn server URL
  clientId: string     // Required: OAuth client ID
  tenantId?: string    // Optional: tenant slug
  redirectUri?: string // Optional: OAuth callback URL
}

interface HelloJohnUser {
  id: string
  email: string
  name?: string
  picture?: string
  roles?: string[]
  scopes?: string[]
  // ... additional profile fields
}
```

---

## Auth State Events

The plugin reacts to the following events from the underlying JS SDK:

| Event | Description |
|-------|-------------|
| `SIGNED_IN` | User successfully authenticated |
| `SIGNED_OUT` | User logged out |
| `TOKEN_REFRESHED` | Access token refreshed silently |
| `SESSION_EXPIRED` | Session expired, user must re-login |
| `USER_UPDATED` | User profile updated |

---

## Global Plugin Access

The auth instance is also available globally:

```ts
// Via inject
import { HELLOJOHN_INJECTION_KEY } from "@hellojohn/vue"
const hj = inject(HELLOJOHN_INJECTION_KEY)

// Via global properties
const hj = getCurrentInstance()?.appContext.config.globalProperties.$hj
```

---

## Local Development

```bash
npm install
npm run build       # Build the library
npm run type-check  # TypeScript check
```

---

## License

MIT — see [LICENSE](../../LICENSE).

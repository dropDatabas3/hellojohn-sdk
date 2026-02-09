# @hellojohn/node

> 🖥️ Node.js Server SDK for HelloJohn Identity Platform

JWT verification, Express middleware, and M2M (machine-to-machine) authentication for Node.js backends.

## Installation

```bash
npm install @hellojohn/node
# or
yarn add @hellojohn/node
# or
pnpm add @hellojohn/node
```

## Quick Start

### Protect API Routes (Express)

```typescript
import express from 'express'
import { createHelloJohnServer } from '@hellojohn/node'
import { hjMiddleware, requireAuth, requireRole } from '@hellojohn/node/express'

const app = express()

// Create server client
const hj = createHelloJohnServer({
  domain: 'https://auth.example.com',
})

// Attach auth to all requests (non-blocking)
app.use(hjMiddleware(hj))

// Public route
app.get('/api/public', (req, res) => {
  res.json({ message: 'Hello!' })
})

// Protected route
app.get('/api/me', requireAuth(), (req, res) => {
  res.json({ user: req.auth.userId })
})

// Admin only
app.get('/api/admin', requireAuth(), requireRole('admin'), (req, res) => {
  res.json({ secret: 'admin data' })
})

app.listen(3000)
```

### M2M (Machine-to-Machine)

```typescript
import { createM2MClient } from '@hellojohn/node'

const m2m = createM2MClient({
  domain: 'https://auth.example.com',
  tenantId: 'my-tenant',
  clientId: 'my-service',
  clientSecret: process.env.CLIENT_SECRET!,
})

// Get token (auto-cached until expiry)
const { accessToken } = await m2m.getToken({
  scopes: ['users:read', 'orders:write'],
})

// Or use the built-in fetch wrapper
const response = await m2m.fetch('https://api.example.com/users')
```

## Features

| Feature | Description |
|---------|-------------|
| **JWT Verification** | Verify tokens with JWKS auto-fetching |
| **Express Middleware** | requireAuth, requireScope, requireRole |
| **M2M Client** | Client credentials flow with token caching |
| **EdDSA Support** | Full Ed25519 signature verification |
| **Zero Config** | Auto-discovers JWKS from domain |

## API Reference

### Server Client

```typescript
import { createHelloJohnServer } from '@hellojohn/node'

const hj = createHelloJohnServer({
  domain: string,             // Required: HelloJohn domain
  audience?: string,          // Expected audience claim
  clockTolerance?: number,    // Seconds of clock skew tolerance (default: 30)
  algorithms?: string[],      // Allowed algorithms (default: ['EdDSA'])
})

// Verify a token manually
const claims = await hj.verifyToken(bearerToken)
console.log(claims.userId, claims.tenantId, claims.scopes)
```

### Auth Claims

```typescript
interface AuthClaims {
  userId: string           // User ID (from 'sub' claim)
  tenantId?: string        // Tenant ID (from 'tid' claim)
  scopes: string[]         // OAuth2 scopes
  roles: string[]          // User roles
  permissions: string[]    // User permissions
  isM2M: boolean          // True if machine-to-machine token
  issuedAt: number        // Token issued at (Unix timestamp)
  expiresAt: number       // Token expires at (Unix timestamp)
  issuer: string          // Token issuer
  raw: object             // Full JWT payload
  token: string           // Original token string
}
```

### Express Middleware

```typescript
import { hjMiddleware, requireAuth, requireScope, requireRole } from '@hellojohn/node/express'

// Attach auth context (non-blocking, sets req.auth if valid token)
app.use(hjMiddleware(hj))

// Require valid authentication
app.get('/protected', requireAuth(), handler)

// Require specific scope
app.delete('/users/:id', requireAuth(), requireScope('users:delete'), handler)

// Require specific role
app.get('/admin', requireAuth(), requireRole('admin'), handler)

// Access claims in handler
function handler(req, res) {
  const { userId, tenantId, roles, permissions, scopes, isM2M } = req.auth
  res.json({ userId })
}
```

#### TypeScript: Extend Express Request

```typescript
// types/express.d.ts
import { AuthClaims } from '@hellojohn/node'

declare global {
  namespace Express {
    interface Request {
      auth?: AuthClaims
    }
  }
}
```

### M2M Client

For server-to-server authentication using client credentials.

```typescript
import { createM2MClient } from '@hellojohn/node'

const m2m = createM2MClient({
  domain: string,           // Required: HelloJohn domain
  tenantId?: string,        // Tenant identifier
  clientId: string,         // OAuth2 client ID
  clientSecret: string,     // OAuth2 client secret
})

// Get access token (cached until expiry)
const { accessToken, expiresAt } = await m2m.getToken({
  scopes: ['users:read', 'orders:write'],
})

// Token is automatically cached per scope combination
// Subsequent calls return cached token until near expiry

// Convenience: fetch with auto-injected token
const response = await m2m.fetch('https://api.example.com/users', {
  method: 'GET',
})
```

#### M2M Token Response

```typescript
interface M2MTokenResult {
  accessToken: string    // The access token
  expiresAt: number     // Unix timestamp when token expires
  tokenType: string     // Always "Bearer"
  scope: string         // Granted scopes (space-separated)
}
```

## Error Handling

```typescript
import { HelloJohnError, TokenVerificationError, M2MAuthError } from '@hellojohn/node'

try {
  const claims = await hj.verifyToken(token)
} catch (err) {
  if (err instanceof TokenVerificationError) {
    // Token invalid, expired, or signature mismatch
    console.log('Token error:', err.message, err.code)
  }
}

try {
  await m2m.getToken({ scopes: ['admin:all'] })
} catch (err) {
  if (err instanceof M2MAuthError) {
    // Client credentials rejected
    console.log('M2M error:', err.message)
  }
}
```

## Without Express

You can use the core verification without Express:

```typescript
import { createHelloJohnServer } from '@hellojohn/node'

const hj = createHelloJohnServer({ domain: 'https://auth.example.com' })

// In any HTTP handler (Fastify, Hono, etc.)
async function handleRequest(req) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized')
  }

  const token = authHeader.slice(7)
  const claims = await hj.verifyToken(token)
  
  return { userId: claims.userId }
}
```

## Environment Variables

Recommended setup:

```env
HELLOJOHN_DOMAIN=https://auth.example.com
HELLOJOHN_CLIENT_ID=my-backend-service
HELLOJOHN_CLIENT_SECRET=secret-for-m2m
```

```typescript
const hj = createHelloJohnServer({
  domain: process.env.HELLOJOHN_DOMAIN!,
})

const m2m = createM2MClient({
  domain: process.env.HELLOJOHN_DOMAIN!,
  clientId: process.env.HELLOJOHN_CLIENT_ID!,
  clientSecret: process.env.HELLOJOHN_CLIENT_SECRET!,
})
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  AuthClaims,
  ServerClientOptions,
  M2MClientOptions,
  M2MTokenResult,
} from '@hellojohn/node'
```

## License

MIT

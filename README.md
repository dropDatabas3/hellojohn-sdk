# HelloJohn SDKs

<p align="center">
  <strong>Official SDKs for integrating HelloJohn authentication across frontend and backend applications</strong>
</p>

<p align="center">
  <a href="#-available-sdks">SDKs</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-examples">Examples</a> •
  <a href="#-development">Development</a> •
  <a href="#-architecture">Architecture</a>
</p>

---

## 📦 Available SDKs

### Frontend SDKs

| SDK | Package | Description | Platform |
|-----|---------|-------------|----------|
| **JavaScript** | [`@hellojohn/js`](./js/) | Core browser authentication client with OAuth 2.0/OIDC flows, PKCE, token management, MFA, and passwordless support | Browser (Vanilla JS) |
| **React** | [`@hellojohn/react`](./react/) | Complete React integration with provider, pre-built auth components, hooks, routing system, themes, and i18n | React 18+, Next.js |
| **Vue** | [`@hellojohn/vue`](./vue/) | Vue 3 composables, components, and Nuxt 3 module for seamless authentication | Vue 3, Nuxt 3 |
| **React Native** | [`@hellojohn/react-native`](./react-native/) | Native mobile authentication with secure storage, OAuth flows, and biometric support | React Native, Expo |

### Backend SDKs

| SDK | Package | Description | Platform |
|-----|---------|-------------|----------|
| **Node.js** | [`@hellojohn/node`](./node/) | Server-side JWT verification, middleware for Express, M2M authentication | Node.js 18+ |
| **Python** | [`hellojohn`](./python/) | JWT verification with FastAPI/Flask middleware and M2M client | Python 3.10+ |
| **Go** | [`hellojohn-go`](./go/) | Zero-dependency JWT verification, HTTP middleware, and M2M authentication | Go 1.21+ |

---

## 🚀 Quick Start

### Frontend (React)

```bash
npm install @hellojohn/react
```

```tsx
import { HelloJohnProvider, SignIn, UserButton } from '@hellojohn/react';

function App() {
  return (
    <HelloJohnProvider
      domain="https://auth.example.com"
      clientId="your-client-id"
      tenantId="your-tenant"
    >
      <UserButton />
      <SignIn />
    </HelloJohnProvider>
  );
}
```

### Backend (Node.js)

```bash
npm install @hellojohn/node
```

```typescript
import express from 'express';
import { requireAuth, HelloJohnClient } from '@hellojohn/node';

const app = express();
const hj = new HelloJohnClient({
  domain: 'https://auth.example.com',
  tenantId: 'your-tenant'
});

app.get('/api/protected', requireAuth(hj), (req, res) => {
  res.json({ userId: req.claims.sub });
});
```

### Backend (Python)

```bash
pip install hellojohn[fastapi]
```

```python
from fastapi import FastAPI, Depends
from hellojohn import HelloJohnVerifier, TokenClaims
from hellojohn.fastapi import require_auth

app = FastAPI()
verifier = HelloJohnVerifier(domain="https://auth.example.com", tenant="acme")

@app.get("/profile")
def profile(claims: TokenClaims = Depends(require_auth(verifier))):
    return {"user_id": claims.sub, "email": claims.email}
```

### Backend (Go)

```bash
go get github.com/dropDatabas3/hellojohn-go
```

```go
package main

import (
    "net/http"
    hj "github.com/dropDatabas3/hellojohn-go"
)

func main() {
    client, _ := hj.New(hj.Config{Domain: "https://auth.example.com"})
    
    mux := http.NewServeMux()
    mux.Handle("/api/me", client.RequireAuth(http.HandlerFunc(meHandler)))
    http.ListenAndServe(":8080", mux)
}

func meHandler(w http.ResponseWriter, r *http.Request) {
    claims := hj.ClaimsFromContext(r.Context())
    w.Write([]byte("Hello, " + claims.Subject))
}
```

---

## 💡 SDK Selection Guide

| Use Case | Recommended SDK |
|----------|-----------------|
| Vanilla JavaScript app | `@hellojohn/js` |
| React app (custom UI) | `@hellojohn/react` components + hooks |
| React app (pre-built UI) | `@hellojohn/react/pages` |
| Next.js with SSR | `@hellojohn/react` + `@hellojohn/react/server` |
| Vue 3 / Nuxt 3 app | `@hellojohn/vue` |
| Mobile app (React Native / Expo) | `@hellojohn/react-native` |
| Node.js API | `@hellojohn/node` |
| Python API (FastAPI/Flask) | `hellojohn` |
| Go microservice | `hellojohn-go` |

---

## 📖 Examples

Full working examples are available in [`examples/`](./examples/):

- **[`express-api/`](./examples/express-api/)** — Node.js + Express API with JWT protection
- **[`go-api/`](./examples/go-api/)** — Go HTTP server with middleware authentication
- **[`python-api/`](./examples/python-api/)** — FastAPI server with HelloJohn integration
- **[`react-quickstart/`](./examples/react-quickstart/)** — Next.js app with React SDK (5-minute setup)
- **[`react-spa/`](./examples/react-spa/)** — Vite + React SPA example
- **[`vue-quickstart/`](./examples/vue-quickstart/)** — Vue 3 quickstart with Vite
- **[`nextjs-app/`](./examples/nextjs-app/)** — Advanced Next.js integration

---

## 🏗️ Architecture

### Dependency Graph

```
Frontend SDKs:
  @hellojohn/react        ──→  @hellojohn/js
  @hellojohn/vue          ──→  @hellojohn/js
  @hellojohn/react-native ──→  @hellojohn/js

Backend SDKs (Zero Dependencies):
  @hellojohn/node         ──→  jose (JWT only)
  hellojohn (Python)      ──→  PyJWT, httpx
  hellojohn-go            ──→  stdlib only (zero deps)
```

### Feature Matrix

| Feature | JS | React | Vue | React Native | Node | Python | Go |
|---------|:--:|:-----:|:---:|:------------:|:----:|:------:|:--:|
| OAuth 2.0 / OIDC | ✅ | ✅ | ✅ | ✅ | — | — | — |
| PKCE Flow | ✅ | ✅ | ✅ | ✅ | — | — | — |
| Token Management | ✅ | ✅ | ✅ | ✅ | — | — | — |
| MFA (TOTP/SMS) | ✅ | ✅ | ✅ | 🚧 | — | — | — |
| Passwordless | ✅ | ✅ | ✅ | 🚧 | — | — | — |
| Social Login | ✅ | ✅ | ✅ | ✅ | — | — | — |
| JWT Verification | — | — | — | — | ✅ | ✅ | ✅ |
| HTTP Middleware | — | — | — | — | ✅ | ✅ | ✅ |
| M2M Authentication | — | — | — | — | ✅ | ✅ | ✅ |
| SSR Support | — | ✅ | ✅ | — | ✅ | — | — |
| Pre-built UI | — | ✅ | ✅ | ✅ | — | — | — |
| i18n | — | ✅ | — | — | — | — | — |

---

## 🛠️ Development

### Prerequisites

- **Node.js** 18+
- **Go** 1.21+
- **Python** 3.10+
- **Git**

### Workspace Setup

This is a monorepo using npm workspaces:

```bash
# Install all dependencies
npm install

# Build all SDKs
make build-all

# Run tests
make test-all

# Type-check all TypeScript SDKs
make type-check-all
```

### Individual SDK Development

```bash
# JavaScript SDK
cd js && npm run build && npm test

# React SDK
cd react && npm run build && npm test

# Node.js SDK
cd node && npm run build && npm test

# Vue SDK
cd vue && npm run build

# Python SDK
cd python && pip install -e ".[dev]" && pytest

# Go SDK
cd go && go test ./...
```

### Makefile Commands

| Command | Description |
|---------|-------------|
| `make build-all` | Build all Node/TypeScript SDKs |
| `make type-check-all` | Type-check all TypeScript SDKs |
| `make test-all` | Run all tests (Node, Go, Python) |
| `make test-node` | Run Node.js/TypeScript tests only |
| `make test-go` | Run Go tests |
| `make test-python` | Run Python tests |
| `make clean` | Remove all build artifacts |
| `make go-zero-deps` | Verify Go SDK has zero dependencies |
| `make publish-dry-run` | Test package publication |

---

## 📚 Documentation

Each SDK has comprehensive documentation in its own directory:

- [JavaScript SDK Documentation](./js/README.md)
- [React SDK Documentation](./react/README.md)
- [Node.js SDK Documentation](./node/README.md)
- [Vue SDK Documentation](./vue/README.md)
- [React Native SDK Documentation](./react-native/README.md)
- [Python SDK Documentation](./python/README.md)
- [Go SDK Documentation](./go/README.md)

---

## 🔒 Security

### JWT Verification

All backend SDKs perform secure JWT verification with:

- **Signature validation** using JWKS (auto-fetched and cached)
- **Issuer (`iss`) validation**
- **Audience (`aud`) validation**
- **Expiration (`exp`) validation**
- **Not Before (`nbf`) validation**
- **Tenant (`tid`) validation**

### Token Storage

- **Browser**: Secure HTTP-only cookies (recommended) or localStorage
- **React Native**: Expo SecureStore with device encryption
- **Node/Python/Go**: Stateless JWT verification (no storage)

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License — see individual SDK directories for full license text.

---

## 🔗 Links

- **Website**: [hellojohn.dev](https://hellojohn.dev)
- **Documentation**: [docs.hellojohn.dev](https://docs.hellojohn.dev)
- **GitHub**: [github.com/dropDatabas3/hellojohn](https://github.com/dropDatabas3/hellojohn)

---

<p align="center">Made with ❤️ by the HelloJohn team</p>

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

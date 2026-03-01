# hellojohn — Python SDK

Python authentication SDK for [HelloJohn](https://github.com/dropDatabas3/hellojohn). Provides JWT verification, FastAPI/Flask middleware, and a machine-to-machine (M2M) client.

## Installation

```bash
# Core (JWT verification only)
pip install hellojohn

# With FastAPI helpers
pip install hellojohn[fastapi]

# With Flask helpers
pip install hellojohn[flask]
```

**Requires:** Python 3.10+.

---

## Quick Start

### FastAPI

```python
from fastapi import Depends, FastAPI
from hellojohn import HelloJohnVerifier, TokenClaims
from hellojohn.fastapi import require_auth

app = FastAPI()
verifier = HelloJohnVerifier(domain="https://auth.example.com", tenant="acme")

@app.get("/profile")
def profile(claims: TokenClaims = Depends(require_auth(verifier))):
    return {
        "user_id": claims.sub,
        "email": claims.email,
        "tenant": claims.tid,
    }
```

### Flask

```python
from flask import Flask, g, jsonify
from hellojohn import HelloJohnVerifier
from hellojohn.flask import require_auth

app = Flask(__name__)
verifier = HelloJohnVerifier(domain="https://auth.example.com", tenant="acme")

@app.get("/profile")
@require_auth(verifier)
def profile():
    return jsonify({
        "user_id": g.hj_claims.sub,
        "email":   g.hj_claims.email,
    })
```

---

## `HelloJohnVerifier`

JWT verifier with automatic JWKS fetching and caching.

```python
from hellojohn import HelloJohnVerifier

verifier = HelloJohnVerifier(
    domain="https://auth.example.com",  # Required
    tenant="acme",                       # Required: tenant slug
    cache_ttl_seconds=900,               # Optional: JWKS cache TTL (default: 900s)
    http_timeout_seconds=10.0,           # Optional: HTTP timeout (default: 10s)
)

# Manually verify a token
claims = verifier.verify(token_string)
```

The verifier auto-fetches JWKS from `{domain}/t/{tenant}/.well-known/jwks.json` and caches keys. A background thread refreshes the cache when stale without blocking requests.

---

## `TokenClaims`

Verified claims returned by the verifier.

```python
from hellojohn import TokenClaims

claims: TokenClaims  # returned by verifier.verify() or injected by middleware

# Standard JWT claims
claims.sub          # str  — Subject (user ID or client ID for M2M)
claims.iss          # str  — Issuer URL
claims.aud          # list[str] — Audiences
claims.exp          # int  — Expiration (Unix timestamp)
claims.iat          # int  — Issued at (Unix timestamp)
claims.tid          # str  — Tenant identifier

# User profile claims
claims.email        # str
claims.name         # str

# Authorization claims
claims.roles        # list[str]
claims.scopes       # list[str]

# Additional claims
claims.extra        # dict[str, Any] — Any extra claims

# Helper methods
claims.has_scope("reports:read")  # bool
claims.has_role("admin")          # bool
```

---

## FastAPI Integration

### Basic authentication

```python
from hellojohn.fastapi import require_auth

@app.get("/me")
def me(claims: TokenClaims = Depends(require_auth(verifier))):
    return {"id": claims.sub, "email": claims.email}
```

### Scope checking

```python
from hellojohn.fastapi import require_scope

@app.get("/reports")
def reports(claims: TokenClaims = Depends(require_scope(verifier, "reports:read"))):
    return {"data": [...]}
```

Returns HTTP `403 Forbidden` if the required scope is missing.

### Optional authentication

For endpoints that behave differently for authenticated vs. anonymous users:

```python
from hellojohn.fastapi import require_auth

@app.get("/public")
def public(claims: TokenClaims | None = Depends(require_auth(verifier, optional=True))):
    if claims:
        return {"user": claims.sub, "data": "personalized"}
    return {"data": "generic"}
```

---

## Flask Integration

### Basic authentication

```python
from hellojohn.flask import require_auth

@app.get("/me")
@require_auth(verifier)
def me():
    return jsonify({"id": g.hj_claims.sub, "email": g.hj_claims.email})
```

Verified claims are stored in `flask.g.hj_claims` for the duration of the request.

### Scope checking

```python
from hellojohn.flask import require_scope

@app.get("/reports")
@require_scope(verifier, "reports:read")
def reports():
    return jsonify({"data": [...]})
```

---

## M2M Client (Machine-to-Machine)

For service-to-service authentication using the client credentials grant.

```python
from hellojohn import HelloJohnClient

client = HelloJohnClient(
    domain="https://auth.example.com",  # Required
    tenant="acme",                       # Required: tenant slug
    client_id="my-service-id",          # Required: OAuth client ID
    client_secret="my-client-secret",   # Required: OAuth client secret
    http_timeout_seconds=10.0,          # Optional
)

# Acquire a token (thread-safe, tokens cached until near expiry)
token = client.get_access_token(scopes=["users:read", "orders:write"])

# Use in outgoing requests
headers = {"Authorization": f"Bearer {token}"}
```

Tokens are cached per scope combination and automatically refreshed ~60 seconds before expiry.

---

## Error Handling

```python
from hellojohn import (
    HelloJohnError,         # Base exception
    TokenVerificationError, # JWT verification failed (invalid signature, claims, etc.)
    TokenExpiredError,      # Token has expired (subclass of TokenVerificationError)
    InsufficientScopeError, # Required scope missing
    JWKSFetchError,         # JWKS endpoint unreachable
)

try:
    claims = verifier.verify(token)
except TokenExpiredError:
    print("Token expired")
except TokenVerificationError as e:
    print(f"Invalid token: {e}")
except JWKSFetchError:
    print("Auth server unreachable")
```

---

## Supported Algorithms

- **EdDSA** (Ed25519) — primary, used by HelloJohn by default
- **RS256**, **RS384**, **RS512** — RSA variants (if configured on the tenant)

The verifier tries all available public keys until one succeeds.

---

## JWKS Caching

- Keys are cached in memory with a configurable TTL (default 900 seconds)
- A background daemon thread refreshes the cache when stale
- **Stale cache is served during refresh** — no blocking
- Thread-safe via `threading.RLock()`

---

## License

MIT — see [LICENSE](../../LICENSE).

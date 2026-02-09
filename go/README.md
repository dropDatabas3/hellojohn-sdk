# hellojohn-go

> 🐹 Go SDK for HelloJohn Identity Platform

JWT verification, HTTP middleware, and M2M authentication for Go backends. Zero external dependencies.

## Installation

```bash
go get github.com/dropDatabas3/hellojohn-go
```

## Quick Start

### Protect HTTP Routes

```go
package main

import (
    "net/http"
    hj "github.com/dropDatabas3/hellojohn-go"
)

func main() {
    // Create client (auto-fetches JWKS)
    client, err := hj.New(hj.Config{
        Domain: "https://auth.example.com",
    })
    if err != nil {
        panic(err)
    }

    mux := http.NewServeMux()

    // Public route
    mux.HandleFunc("/api/public", publicHandler)

    // Protected route
    mux.Handle("/api/me", client.RequireAuth(http.HandlerFunc(meHandler)))

    // Admin only
    mux.Handle("/api/admin", client.RequireAuth(
        client.RequireRole("admin")(http.HandlerFunc(adminHandler)),
    ))

    http.ListenAndServe(":8080", mux)
}

func meHandler(w http.ResponseWriter, r *http.Request) {
    claims := hj.ClaimsFromContext(r.Context())
    w.Write([]byte("Hello, " + claims.Subject))
}

func adminHandler(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte("Admin secrets"))
}
```

### M2M (Machine-to-Machine)

```go
m2m, err := hj.NewM2MClient(hj.M2MConfig{
    Domain:       "https://auth.example.com",
    TenantID:     "my-tenant",
    ClientID:     "my-service",
    ClientSecret: os.Getenv("CLIENT_SECRET"),
})

// Get token (cached until expiry)
result, err := m2m.GetToken(ctx, hj.TokenRequest{
    Scopes: []string{"users:read", "orders:write"},
})
fmt.Println(result.AccessToken)
```

## Features

| Feature | Description |
|---------|-------------|
| **JWT Verification** | Ed25519 (EdDSA) signature verification |
| **JWKS Caching** | Auto-fetch and cache public keys |
| **HTTP Middleware** | RequireAuth, RequireScope, RequireRole |
| **M2M Client** | Client credentials with token caching |
| **Zero Dependencies** | Only Go stdlib (crypto, net/http, encoding) |

## API Reference

### Client Initialization

```go
import hj "github.com/dropDatabas3/hellojohn-go"

client, err := hj.New(hj.Config{
    Domain:   "https://auth.example.com", // Required
    Audience: "https://api.example.com",  // Optional: expected audience
})
```

### Token Verification

```go
// Verify a token manually
claims, err := client.VerifyToken(ctx, bearerToken)
if err != nil {
    switch {
    case errors.Is(err, hj.ErrTokenExpired):
        // Token is expired
    case errors.Is(err, hj.ErrInvalidSignature):
        // Signature mismatch
    case errors.Is(err, hj.ErrInvalidAudience):
        // Wrong audience
    default:
        // Other error
    }
}

fmt.Println(claims.Subject)   // User ID
fmt.Println(claims.TenantID)  // Tenant
fmt.Println(claims.Scopes)    // []string
fmt.Println(claims.Roles)     // []string
```

### Claims Structure

```go
type Claims struct {
    Subject     string            // User ID or client ID (for M2M)
    TenantID    string            // Tenant identifier
    Scopes      []string          // OAuth2 scopes
    Roles       []string          // User roles
    Permissions []string          // User permissions
    IssuedAt    time.Time         // Token issued at
    ExpiresAt   time.Time         // Token expires at
    Issuer      string            // Token issuer
    Audience    []string          // Token audiences
    Raw         map[string]any    // Full JWT payload
}

// Helper methods
claims.HasScope("users:read")      // bool
claims.HasRole("admin")            // bool
claims.HasPermission("users:write") // bool
```

### HTTP Middleware

```go
// Require valid authentication
mux.Handle("/api/protected", client.RequireAuth(handler))

// Require specific scope
mux.Handle("/api/users", client.RequireAuth(
    client.RequireScope("users:read")(handler),
))

// Require specific role
mux.Handle("/api/admin", client.RequireAuth(
    client.RequireRole("admin")(handler),
))

// Require specific permission
mux.Handle("/api/delete", client.RequireAuth(
    client.RequirePermission("users:delete")(handler),
))

// Access claims in handler
func myHandler(w http.ResponseWriter, r *http.Request) {
    claims := hj.ClaimsFromContext(r.Context())
    if claims == nil {
        http.Error(w, "Unauthorized", 401)
        return
    }
    
    fmt.Fprintf(w, "User: %s, Tenant: %s", claims.Subject, claims.TenantID)
}
```

### M2M Client

For server-to-server authentication using client credentials.

```go
m2m, err := hj.NewM2MClient(hj.M2MConfig{
    Domain:       "https://auth.example.com",
    TenantID:     "my-tenant",       // Optional
    ClientID:     "my-service",
    ClientSecret: "secret",
})

// Get access token (cached until expiry)
result, err := m2m.GetToken(ctx, hj.TokenRequest{
    Scopes: []string{"users:read", "orders:write"},
})

fmt.Println(result.AccessToken)
fmt.Println(result.ExpiresAt)

// Token is automatically cached per scope combination
// Subsequent calls return cached token until near expiry
```

### Token Request/Response

```go
type TokenRequest struct {
    Scopes []string  // Requested scopes (optional)
}

type TokenResult struct {
    AccessToken string    // The access token
    TokenType   string    // Always "Bearer"
    ExpiresAt   time.Time // When token expires
    Scope       string    // Granted scopes (space-separated)
}
```

## Error Handling

Sentinel errors for type checking:

```go
import "errors"

claims, err := client.VerifyToken(ctx, token)
if err != nil {
    switch {
    case errors.Is(err, hj.ErrTokenExpired):
        log.Println("Token expired")
    case errors.Is(err, hj.ErrInvalidSignature):
        log.Println("Invalid signature")
    case errors.Is(err, hj.ErrInvalidAudience):
        log.Println("Wrong audience")
    case errors.Is(err, hj.ErrMissingToken):
        log.Println("No token provided")
    case errors.Is(err, hj.ErrJWKSFetch):
        log.Println("Failed to fetch JWKS")
    default:
        log.Println("Unknown error:", err)
    }
}
```

## Complete Example

```go
package main

import (
    "encoding/json"
    "log"
    "net/http"
    "os"

    hj "github.com/dropDatabas3/hellojohn-go"
)

func main() {
    client, err := hj.New(hj.Config{
        Domain: os.Getenv("HELLOJOHN_DOMAIN"),
    })
    if err != nil {
        log.Fatal(err)
    }

    mux := http.NewServeMux()

    // Public endpoint
    mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("OK"))
    })

    // Protected endpoint
    mux.Handle("GET /api/me", client.RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        claims := hj.ClaimsFromContext(r.Context())
        json.NewEncoder(w).Encode(map[string]any{
            "user_id":   claims.Subject,
            "tenant_id": claims.TenantID,
            "roles":     claims.Roles,
        })
    })))

    // Admin endpoint
    mux.Handle("GET /api/admin", client.RequireAuth(
        client.RequireRole("admin")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            w.Write([]byte("Admin data"))
        })),
    ))

    log.Println("Server running on :8080")
    http.ListenAndServe(":8080", mux)
}
```

## Environment Variables

```bash
export HELLOJOHN_DOMAIN=https://auth.example.com
export HELLOJOHN_CLIENT_ID=my-service
export HELLOJOHN_CLIENT_SECRET=secret
```

## Go Version

Requires Go 1.21 or later.

## License

MIT

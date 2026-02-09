package hellojohn

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// claimsInjector is a helper middleware that injects pre-built claims into the
// request context. This allows testing RequireScope/RequireRole/RequirePermission
// without needing a real JWT verification step.
func claimsInjector(claims *Claims) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if claims != nil {
				ctx := contextWithClaims(r.Context(), claims)
				r = r.WithContext(ctx)
			}
			next.ServeHTTP(w, r)
		})
	}
}

// okHandler is a simple handler that writes a 200 OK response.
var okHandler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"ok":true}`)) //nolint:errcheck
})

// newTestClient creates a Client for testing middleware.
// It uses a dummy domain since we will not call VerifyToken in these tests.
func newTestClient(t *testing.T) *Client {
	t.Helper()
	c, err := New(Config{Domain: "https://test.example.com"})
	if err != nil {
		t.Fatalf("failed to create test client: %v", err)
	}
	return c
}

// --- RequireScope tests ---

func TestRequireScope_NoClaims(t *testing.T) {
	c := newTestClient(t)
	handler := c.RequireScope("read")(okHandler)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("status = %d; want %d", rec.Code, http.StatusForbidden)
	}
}

func TestRequireScope_MissingScope(t *testing.T) {
	c := newTestClient(t)
	claims := &Claims{Scopes: []string{"write", "admin"}}
	handler := claimsInjector(claims)(c.RequireScope("read")(okHandler))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("status = %d; want %d", rec.Code, http.StatusForbidden)
	}
}

func TestRequireScope_HasScope(t *testing.T) {
	c := newTestClient(t)
	claims := &Claims{Scopes: []string{"read", "write"}}
	handler := claimsInjector(claims)(c.RequireScope("read")(okHandler))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d; want %d", rec.Code, http.StatusOK)
	}
}

func TestRequireScope_EmptyScopes(t *testing.T) {
	c := newTestClient(t)
	claims := &Claims{Scopes: []string{}}
	handler := claimsInjector(claims)(c.RequireScope("read")(okHandler))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("status = %d; want %d", rec.Code, http.StatusForbidden)
	}
}

// --- RequireRole tests ---

func TestRequireRole_NoClaims(t *testing.T) {
	c := newTestClient(t)
	handler := c.RequireRole("admin")(okHandler)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("status = %d; want %d", rec.Code, http.StatusForbidden)
	}
}

func TestRequireRole_MissingRole(t *testing.T) {
	c := newTestClient(t)
	claims := &Claims{Roles: []string{"editor", "viewer"}}
	handler := claimsInjector(claims)(c.RequireRole("admin")(okHandler))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("status = %d; want %d", rec.Code, http.StatusForbidden)
	}
}

func TestRequireRole_HasRole(t *testing.T) {
	c := newTestClient(t)
	claims := &Claims{Roles: []string{"admin", "editor"}}
	handler := claimsInjector(claims)(c.RequireRole("admin")(okHandler))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d; want %d", rec.Code, http.StatusOK)
	}
}

func TestRequireRole_EmptyRoles(t *testing.T) {
	c := newTestClient(t)
	claims := &Claims{Roles: []string{}}
	handler := claimsInjector(claims)(c.RequireRole("admin")(okHandler))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("status = %d; want %d", rec.Code, http.StatusForbidden)
	}
}

// --- RequirePermission tests ---

func TestRequirePermission_NoClaims(t *testing.T) {
	c := newTestClient(t)
	handler := c.RequirePermission("users:read")(okHandler)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("status = %d; want %d", rec.Code, http.StatusForbidden)
	}
}

func TestRequirePermission_MissingPermission(t *testing.T) {
	c := newTestClient(t)
	claims := &Claims{Permissions: []string{"users:read", "users:write"}}
	handler := claimsInjector(claims)(c.RequirePermission("users:delete")(okHandler))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("status = %d; want %d", rec.Code, http.StatusForbidden)
	}
}

func TestRequirePermission_HasPermission(t *testing.T) {
	c := newTestClient(t)
	claims := &Claims{Permissions: []string{"users:read", "users:write"}}
	handler := claimsInjector(claims)(c.RequirePermission("users:write")(okHandler))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d; want %d", rec.Code, http.StatusOK)
	}
}

func TestRequirePermission_EmptyPermissions(t *testing.T) {
	c := newTestClient(t)
	claims := &Claims{Permissions: []string{}}
	handler := claimsInjector(claims)(c.RequirePermission("users:read")(okHandler))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("status = %d; want %d", rec.Code, http.StatusForbidden)
	}
}

// --- extractBearerToken tests ---

func TestExtractBearerToken_Valid(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer my-jwt-token-here")

	token := extractBearerToken(req)
	if token != "my-jwt-token-here" {
		t.Errorf("extractBearerToken = %q; want %q", token, "my-jwt-token-here")
	}
}

func TestExtractBearerToken_MissingHeader(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)

	token := extractBearerToken(req)
	if token != "" {
		t.Errorf("extractBearerToken = %q; want empty string", token)
	}
}

func TestExtractBearerToken_NonBearerAuth(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Basic dXNlcjpwYXNz")

	token := extractBearerToken(req)
	if token != "" {
		t.Errorf("extractBearerToken with Basic auth = %q; want empty string", token)
	}
}

func TestExtractBearerToken_EmptyHeader(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "")

	token := extractBearerToken(req)
	if token != "" {
		t.Errorf("extractBearerToken with empty header = %q; want empty string", token)
	}
}

func TestExtractBearerToken_BearerWithoutSpace(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearertoken")

	token := extractBearerToken(req)
	if token != "" {
		t.Errorf("extractBearerToken with 'Bearertoken' = %q; want empty string", token)
	}
}

func TestExtractBearerToken_LowercaseBearer(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "bearer my-token")

	token := extractBearerToken(req)
	// The implementation uses HasPrefix("Bearer ") which is case-sensitive
	if token != "" {
		t.Errorf("extractBearerToken with lowercase 'bearer' = %q; want empty string", token)
	}
}

func TestExtractBearerToken_BearerOnly(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer ")

	token := extractBearerToken(req)
	if token != "" {
		t.Errorf("extractBearerToken with 'Bearer ' (trailing space) = %q; want empty string", token)
	}
}

// --- RequireAuth tests (limited - tests 401 for missing token) ---

func TestRequireAuth_MissingToken(t *testing.T) {
	c := newTestClient(t)
	handler := c.RequireAuth(okHandler)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d; want %d", rec.Code, http.StatusUnauthorized)
	}
}

func TestRequireAuth_EmptyBearerToken(t *testing.T) {
	c := newTestClient(t)
	handler := c.RequireAuth(okHandler)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer ")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	// "Bearer " with nothing after should result in empty token -> 401
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d; want %d", rec.Code, http.StatusUnauthorized)
	}
}

// --- Response content type tests ---

func TestRequireScope_ResponseContentType(t *testing.T) {
	c := newTestClient(t)
	handler := c.RequireScope("read")(okHandler)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	ct := rec.Header().Get("Content-Type")
	if ct != "application/json" {
		t.Errorf("Content-Type = %q; want %q", ct, "application/json")
	}
}

func TestRequireRole_ResponseContentType(t *testing.T) {
	c := newTestClient(t)
	handler := c.RequireRole("admin")(okHandler)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	ct := rec.Header().Get("Content-Type")
	if ct != "application/json" {
		t.Errorf("Content-Type = %q; want %q", ct, "application/json")
	}
}

func TestRequirePermission_ResponseContentType(t *testing.T) {
	c := newTestClient(t)
	handler := c.RequirePermission("users:read")(okHandler)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	ct := rec.Header().Get("Content-Type")
	if ct != "application/json" {
		t.Errorf("Content-Type = %q; want %q", ct, "application/json")
	}
}

// --- Chaining multiple middleware ---

func TestMiddleware_ChainScopeAndRole(t *testing.T) {
	c := newTestClient(t)
	claims := &Claims{
		Scopes: []string{"read"},
		Roles:  []string{"admin"},
	}

	// Chain: inject claims -> require scope -> require role -> ok
	handler := claimsInjector(claims)(
		c.RequireScope("read")(
			c.RequireRole("admin")(okHandler),
		),
	)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d; want %d", rec.Code, http.StatusOK)
	}
}

func TestMiddleware_ChainScopeFailsFirst(t *testing.T) {
	c := newTestClient(t)
	claims := &Claims{
		Scopes: []string{"write"}, // missing "read"
		Roles:  []string{"admin"},
	}

	handler := claimsInjector(claims)(
		c.RequireScope("read")(
			c.RequireRole("admin")(okHandler),
		),
	)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("status = %d; want %d", rec.Code, http.StatusForbidden)
	}
}

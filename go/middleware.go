package hellojohn

import (
	"net/http"
	"strings"
)

// RequireAuth returns middleware that verifies the JWT Bearer token
// and injects claims into the request context.
// Returns 401 if no valid token is present.
func (c *Client) RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := extractBearerToken(r)
		if token == "" {
			writeJSON(w, http.StatusUnauthorized, `{"error":"Unauthorized","message":"missing bearer token"}`)
			return
		}

		claims, err := c.VerifyToken(r.Context(), token)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, `{"error":"Unauthorized","message":"invalid token"}`)
			return
		}

		ctx := contextWithClaims(r.Context(), claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireScope returns middleware that checks for a specific scope in the JWT claims.
// Must be used after RequireAuth. Returns 403 if the scope is missing.
func (c *Client) RequireScope(scope string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := ClaimsFromContext(r.Context())
			if claims == nil || !claims.HasScope(scope) {
				writeJSON(w, http.StatusForbidden, `{"error":"Forbidden","message":"insufficient scope"}`)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// RequireRole returns middleware that checks for a specific role in the JWT claims.
// Must be used after RequireAuth. Returns 403 if the role is missing.
func (c *Client) RequireRole(role string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := ClaimsFromContext(r.Context())
			if claims == nil || !claims.HasRole(role) {
				writeJSON(w, http.StatusForbidden, `{"error":"Forbidden","message":"insufficient role"}`)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// RequirePermission returns middleware that checks for a specific permission in the JWT claims.
// Must be used after RequireAuth. Returns 403 if the permission is missing.
func (c *Client) RequirePermission(perm string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := ClaimsFromContext(r.Context())
			if claims == nil || !claims.HasPermission(perm) {
				writeJSON(w, http.StatusForbidden, `{"error":"Forbidden","message":"insufficient permission"}`)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func extractBearerToken(r *http.Request) string {
	header := r.Header.Get("Authorization")
	if !strings.HasPrefix(header, "Bearer ") {
		return ""
	}
	return header[7:]
}

func writeJSON(w http.ResponseWriter, status int, body string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write([]byte(body)) //nolint:errcheck
}

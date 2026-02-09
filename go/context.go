package hellojohn

import "context"

type contextKey struct{}

var claimsKey = contextKey{}

// ClaimsFromContext extracts the authenticated claims from the request context.
// Returns nil if no claims are present (unauthenticated request).
func ClaimsFromContext(ctx context.Context) *Claims {
	claims, _ := ctx.Value(claimsKey).(*Claims)
	return claims
}

// contextWithClaims returns a new context with the claims attached.
func contextWithClaims(ctx context.Context, claims *Claims) context.Context {
	return context.WithValue(ctx, claimsKey, claims)
}

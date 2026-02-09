package hellojohn

import "errors"

var (
	// ErrInvalidToken is returned when a JWT token is malformed or cannot be verified.
	ErrInvalidToken = errors.New("hellojohn: invalid token")

	// ErrTokenExpired is returned when a JWT token has expired.
	ErrTokenExpired = errors.New("hellojohn: token expired")

	// ErrUnauthorized is returned when no valid authentication is present.
	ErrUnauthorized = errors.New("hellojohn: unauthorized")

	// ErrForbidden is returned when the authenticated user lacks required permissions.
	ErrForbidden = errors.New("hellojohn: forbidden")

	// ErrM2MAuthFailed is returned when M2M token acquisition fails.
	ErrM2MAuthFailed = errors.New("hellojohn: m2m auth failed")

	// ErrJWKSFetchFailed is returned when JWKS endpoint cannot be reached.
	ErrJWKSFetchFailed = errors.New("hellojohn: jwks fetch failed")
)

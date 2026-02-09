package hellojohn

import (
	"context"
	"fmt"
	"strings"
	"time"
)

// Config configures the HelloJohn client.
type Config struct {
	// Domain is the HelloJohn server URL (e.g. "https://auth.example.com"). Required.
	Domain string

	// Audience is the expected JWT audience claim. Optional.
	Audience string

	// JWKSCacheTTL is how long to cache JWKS keys. Default: 1 hour.
	JWKSCacheTTL time.Duration
}

// Client is the main HelloJohn SDK client for Go backends.
// It verifies JWTs and provides HTTP middleware.
type Client struct {
	config   Config
	verifier *JWTVerifier
}

// New creates a new HelloJohn client. It initializes the JWKS cache
// but does not fetch keys until the first token verification.
func New(cfg Config) (*Client, error) {
	if cfg.Domain == "" {
		return nil, fmt.Errorf("hellojohn: domain is required")
	}
	cfg.Domain = strings.TrimRight(cfg.Domain, "/")

	if cfg.JWKSCacheTTL == 0 {
		cfg.JWKSCacheTTL = time.Hour
	}

	verifier := newJWTVerifier(cfg.Domain, cfg.Audience, cfg.JWKSCacheTTL)

	return &Client{
		config:   cfg,
		verifier: verifier,
	}, nil
}

// VerifyToken verifies a JWT token and returns the parsed claims.
func (c *Client) VerifyToken(ctx context.Context, token string) (*Claims, error) {
	return c.verifier.Verify(ctx, token)
}

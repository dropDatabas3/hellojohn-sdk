package hellojohn

import (
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

type jwksCache struct {
	mu          sync.RWMutex
	keys        map[string]ed25519.PublicKey
	domain      string
	lastFetch   time.Time
	ttl         time.Duration
	minInterval time.Duration
}

func newJWKSCache(domain string, ttl time.Duration) *jwksCache {
	return &jwksCache{
		keys:        make(map[string]ed25519.PublicKey),
		domain:      domain,
		ttl:         ttl,
		minInterval: 5 * time.Minute,
	}
}

// GetKey returns the Ed25519 public key for the given kid.
// It transparently refreshes the cache when expired or when a kid is not found.
func (c *jwksCache) GetKey(ctx context.Context, kid string) (ed25519.PublicKey, error) {
	c.mu.RLock()
	key, ok := c.keys[kid]
	expired := time.Since(c.lastFetch) > c.ttl
	c.mu.RUnlock()

	if ok && !expired {
		return key, nil
	}

	if err := c.refresh(ctx); err != nil {
		// If we had a cached key and refresh fails, return the cached key
		if ok {
			return key, nil
		}
		return nil, err
	}

	c.mu.RLock()
	defer c.mu.RUnlock()
	key, ok = c.keys[kid]
	if !ok {
		return nil, fmt.Errorf("%w: key %s not found in JWKS", ErrInvalidToken, kid)
	}
	return key, nil
}

func (c *jwksCache) refresh(ctx context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Rate limit: don't fetch more often than minInterval
	if !c.lastFetch.IsZero() && time.Since(c.lastFetch) < c.minInterval {
		return nil
	}

	url := fmt.Sprintf("%s/.well-known/jwks.json", c.domain)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrJWKSFetchFailed, err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrJWKSFetchFailed, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("%w: HTTP %d from JWKS endpoint", ErrJWKSFetchFailed, resp.StatusCode)
	}

	var jwks struct {
		Keys []json.RawMessage `json:"keys"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return fmt.Errorf("%w: failed to decode JWKS: %v", ErrJWKSFetchFailed, err)
	}

	newKeys := make(map[string]ed25519.PublicKey)
	for _, raw := range jwks.Keys {
		var header struct {
			Kid string `json:"kid"`
			Kty string `json:"kty"`
			Crv string `json:"crv"`
			X   string `json:"x"`
		}
		if err := json.Unmarshal(raw, &header); err != nil {
			continue
		}
		if header.Kty == "OKP" && header.Crv == "Ed25519" && header.Kid != "" {
			pubKey, err := decodeEd25519PublicKey(header.X)
			if err == nil {
				newKeys[header.Kid] = pubKey
			}
		}
	}

	c.keys = newKeys
	c.lastFetch = time.Now()
	return nil
}

// decodeEd25519PublicKey decodes a base64url-encoded Ed25519 public key (the "x" parameter from JWK).
func decodeEd25519PublicKey(x string) (ed25519.PublicKey, error) {
	keyBytes, err := base64.RawURLEncoding.DecodeString(x)
	if err != nil {
		return nil, fmt.Errorf("failed to decode public key: %w", err)
	}
	if len(keyBytes) != ed25519.PublicKeySize {
		return nil, fmt.Errorf("invalid Ed25519 key size: got %d, want %d", len(keyBytes), ed25519.PublicKeySize)
	}
	return ed25519.PublicKey(keyBytes), nil
}

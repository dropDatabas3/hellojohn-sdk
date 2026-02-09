package hellojohn

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"
)

// M2MConfig configures the M2M (machine-to-machine) client.
type M2MConfig struct {
	// Domain is the HelloJohn server URL. Required.
	Domain string

	// TenantID is the tenant slug for scoping the token request. Optional.
	TenantID string

	// ClientID is the confidential client ID. Required.
	ClientID string

	// ClientSecret is the client secret. Required.
	ClientSecret string
}

type cachedToken struct {
	accessToken string
	expiresAt   int64 // Unix timestamp
}

// M2MClient handles machine-to-machine authentication via client_credentials grant.
type M2MClient struct {
	config M2MConfig
	mu     sync.RWMutex
	cache  map[string]*cachedToken
}

// TokenRequest specifies the scopes for an M2M token request.
type TokenRequest struct {
	Scopes []string
}

// TokenResult contains the M2M access token and its expiration.
type TokenResult struct {
	AccessToken string
	ExpiresAt   int64
}

// NewM2MClient creates a new M2M client for service-to-service authentication.
func NewM2MClient(cfg M2MConfig) (*M2MClient, error) {
	if cfg.Domain == "" {
		return nil, fmt.Errorf("hellojohn: m2m domain is required")
	}
	if cfg.ClientID == "" {
		return nil, fmt.Errorf("hellojohn: m2m clientId is required")
	}
	if cfg.ClientSecret == "" {
		return nil, fmt.Errorf("hellojohn: m2m clientSecret is required")
	}
	cfg.Domain = strings.TrimRight(cfg.Domain, "/")

	return &M2MClient{
		config: cfg,
		cache:  make(map[string]*cachedToken),
	}, nil
}

// GetToken retrieves an access token via client_credentials grant.
// Tokens are cached until 60 seconds before expiry.
func (c *M2MClient) GetToken(ctx context.Context, req TokenRequest) (*TokenResult, error) {
	scopeKey := buildScopeKey(req.Scopes)

	// Check cache
	c.mu.RLock()
	cached, ok := c.cache[scopeKey]
	c.mu.RUnlock()

	now := time.Now().Unix()
	if ok && cached.expiresAt > now+60 {
		return &TokenResult{
			AccessToken: cached.accessToken,
			ExpiresAt:   cached.expiresAt,
		}, nil
	}

	// Request new token
	form := url.Values{
		"grant_type":    {"client_credentials"},
		"client_id":     {c.config.ClientID},
		"client_secret": {c.config.ClientSecret},
	}
	if len(req.Scopes) > 0 {
		form.Set("scope", strings.Join(req.Scopes, " "))
	}

	tokenURL := fmt.Sprintf("%s/oauth2/token", c.config.Domain)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, tokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrM2MAuthFailed, err)
	}
	httpReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	if c.config.TenantID != "" {
		httpReq.Header.Set("X-Tenant-Slug", c.config.TenantID)
	}

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrM2MAuthFailed, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errBody struct {
			Error string `json:"error"`
		}
		json.NewDecoder(resp.Body).Decode(&errBody) //nolint:errcheck
		msg := errBody.Error
		if msg == "" {
			msg = resp.Status
		}
		return nil, fmt.Errorf("%w: %s", ErrM2MAuthFailed, msg)
	}

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int64  `json:"expires_in"`
		Scope       string `json:"scope"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, fmt.Errorf("%w: failed to decode response: %v", ErrM2MAuthFailed, err)
	}

	expiresIn := tokenResp.ExpiresIn
	if expiresIn == 0 {
		expiresIn = 3600
	}
	expiresAt := now + expiresIn

	// Cache token
	c.mu.Lock()
	c.cache[scopeKey] = &cachedToken{
		accessToken: tokenResp.AccessToken,
		expiresAt:   expiresAt,
	}
	c.mu.Unlock()

	return &TokenResult{
		AccessToken: tokenResp.AccessToken,
		ExpiresAt:   expiresAt,
	}, nil
}

// ClearCache removes all cached tokens.
func (c *M2MClient) ClearCache() {
	c.mu.Lock()
	c.cache = make(map[string]*cachedToken)
	c.mu.Unlock()
}

func buildScopeKey(scopes []string) string {
	if len(scopes) == 0 {
		return ""
	}
	sorted := make([]string, len(scopes))
	copy(sorted, scopes)
	sort.Strings(sorted)
	return strings.Join(sorted, " ")
}

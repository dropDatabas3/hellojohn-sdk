package hellojohn

import (
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// JWTVerifier handles JWT verification using JWKS.
type JWTVerifier struct {
	jwks     *jwksCache
	audience string
}

func newJWTVerifier(domain, audience string, cacheTTL time.Duration) *JWTVerifier {
	return &JWTVerifier{
		jwks:     newJWKSCache(domain, cacheTTL),
		audience: audience,
	}
}

// Verify parses and verifies a JWT token, returning the claims if valid.
func (v *JWTVerifier) Verify(ctx context.Context, tokenStr string) (*Claims, error) {
	parts := strings.Split(tokenStr, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("%w: malformed JWT", ErrInvalidToken)
	}

	// 1. Decode header
	headerBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, fmt.Errorf("%w: invalid header encoding", ErrInvalidToken)
	}

	var header struct {
		Alg string `json:"alg"`
		Kid string `json:"kid"`
		Typ string `json:"typ"`
	}
	if err := json.Unmarshal(headerBytes, &header); err != nil {
		return nil, fmt.Errorf("%w: invalid header JSON", ErrInvalidToken)
	}

	if header.Alg != "EdDSA" {
		return nil, fmt.Errorf("%w: unsupported algorithm %q, expected EdDSA", ErrInvalidToken, header.Alg)
	}

	// 2. Get public key from JWKS cache
	pubKey, err := v.jwks.GetKey(ctx, header.Kid)
	if err != nil {
		return nil, err
	}

	// 3. Verify signature
	signingInput := parts[0] + "." + parts[1]
	signatureBytes, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return nil, fmt.Errorf("%w: invalid signature encoding", ErrInvalidToken)
	}

	if !ed25519.Verify(pubKey, []byte(signingInput), signatureBytes) {
		return nil, fmt.Errorf("%w: signature verification failed", ErrInvalidToken)
	}

	// 4. Decode payload
	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("%w: invalid payload encoding", ErrInvalidToken)
	}

	var payload map[string]interface{}
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		return nil, fmt.Errorf("%w: invalid payload JSON", ErrInvalidToken)
	}

	// 5. Validate standard claims
	now := time.Now().Unix()

	exp, _ := toInt64(payload["exp"])
	if exp > 0 && exp < now {
		return nil, ErrTokenExpired
	}

	nbf, _ := toInt64(payload["nbf"])
	if nbf > 0 && nbf > now+30 { // 30s clock tolerance
		return nil, fmt.Errorf("%w: token not yet valid", ErrInvalidToken)
	}

	if v.audience != "" {
		if !matchesAudience(payload["aud"], v.audience) {
			return nil, fmt.Errorf("%w: audience mismatch", ErrInvalidToken)
		}
	}

	// 6. Build claims
	amr := extractStringSlice(payload["amr"])
	isM2M := containsString(amr, "client")

	claims := &Claims{
		UserID:      toString(payload["sub"]),
		TenantID:    toString(payload["tid"]),
		Scopes:      extractScopes(payload),
		Roles:       extractStringSlice(payload["roles"]),
		Permissions: extractStringSlice(payload["perms"]),
		IsM2M:       isM2M,
		IssuedAt:    toInt64OrZero(payload["iat"]),
		ExpiresAt:   exp,
		Issuer:      toString(payload["iss"]),
		Raw:         payload,
		Token:       tokenStr,
	}

	if isM2M {
		claims.ClientID = claims.UserID
	}

	return claims, nil
}

// extractScopes handles both "scp" (array) and "scope" (space-separated string) formats.
func extractScopes(payload map[string]interface{}) []string {
	if scp, ok := payload["scp"]; ok {
		return extractStringSlice(scp)
	}
	if scope, ok := payload["scope"]; ok {
		if s, ok := scope.(string); ok {
			parts := strings.Fields(s)
			if len(parts) > 0 {
				return parts
			}
		}
		return extractStringSlice(scope)
	}
	return nil
}

func extractStringSlice(v interface{}) []string {
	if v == nil {
		return nil
	}
	switch val := v.(type) {
	case []interface{}:
		result := make([]string, 0, len(val))
		for _, item := range val {
			if s, ok := item.(string); ok {
				result = append(result, s)
			}
		}
		return result
	case string:
		parts := strings.Fields(val)
		if len(parts) > 0 {
			return parts
		}
	}
	return nil
}

func matchesAudience(aud interface{}, expected string) bool {
	switch v := aud.(type) {
	case string:
		return v == expected
	case []interface{}:
		for _, a := range v {
			if s, ok := a.(string); ok && s == expected {
				return true
			}
		}
	}
	return false
}

func toString(v interface{}) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

func toInt64(v interface{}) (int64, bool) {
	switch n := v.(type) {
	case float64:
		return int64(n), true
	case json.Number:
		i, err := n.Int64()
		return i, err == nil
	}
	return 0, false
}

func toInt64OrZero(v interface{}) int64 {
	n, _ := toInt64(v)
	return n
}

func containsString(slice []string, s string) bool {
	for _, item := range slice {
		if item == s {
			return true
		}
	}
	return false
}

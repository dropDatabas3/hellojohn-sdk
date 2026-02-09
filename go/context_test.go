package hellojohn

import (
	"context"
	"testing"
)

func TestClaimsFromContext_EmptyContext(t *testing.T) {
	ctx := context.Background()
	claims := ClaimsFromContext(ctx)
	if claims != nil {
		t.Errorf("ClaimsFromContext on empty context = %v; want nil", claims)
	}
}

func TestClaimsFromContext_TodoContext(t *testing.T) {
	ctx := context.TODO()
	claims := ClaimsFromContext(ctx)
	if claims != nil {
		t.Errorf("ClaimsFromContext on TODO context = %v; want nil", claims)
	}
}

func TestContextWithClaims_RoundTrip(t *testing.T) {
	original := &Claims{
		UserID:   "user-123",
		TenantID: "acme",
		Scopes:   []string{"read", "write"},
		Roles:    []string{"admin"},
	}

	ctx := context.Background()
	ctx = contextWithClaims(ctx, original)

	extracted := ClaimsFromContext(ctx)
	if extracted == nil {
		t.Fatal("ClaimsFromContext returned nil after contextWithClaims")
	}
	if extracted != original {
		t.Errorf("extracted claims pointer %p != original pointer %p", extracted, original)
	}
}

func TestContextWithClaims_FieldsPreserved(t *testing.T) {
	original := &Claims{
		UserID:      "user-456",
		TenantID:    "tenant-abc",
		Scopes:      []string{"openid", "profile"},
		Roles:       []string{"editor", "viewer"},
		Permissions: []string{"docs:read", "docs:write"},
		IsM2M:       true,
		ClientID:    "client-xyz",
		IssuedAt:    1700000000,
		ExpiresAt:   1700003600,
		Issuer:      "https://auth.example.com",
		Token:       "eyJhbGciOiJFZERTQSJ9.payload.signature",
	}

	ctx := contextWithClaims(context.Background(), original)
	extracted := ClaimsFromContext(ctx)
	if extracted == nil {
		t.Fatal("ClaimsFromContext returned nil")
	}

	if extracted.UserID != "user-456" {
		t.Errorf("UserID = %q; want %q", extracted.UserID, "user-456")
	}
	if extracted.TenantID != "tenant-abc" {
		t.Errorf("TenantID = %q; want %q", extracted.TenantID, "tenant-abc")
	}
	if len(extracted.Scopes) != 2 || extracted.Scopes[0] != "openid" || extracted.Scopes[1] != "profile" {
		t.Errorf("Scopes = %v; want [openid profile]", extracted.Scopes)
	}
	if len(extracted.Roles) != 2 || extracted.Roles[0] != "editor" || extracted.Roles[1] != "viewer" {
		t.Errorf("Roles = %v; want [editor viewer]", extracted.Roles)
	}
	if len(extracted.Permissions) != 2 || extracted.Permissions[0] != "docs:read" || extracted.Permissions[1] != "docs:write" {
		t.Errorf("Permissions = %v; want [docs:read docs:write]", extracted.Permissions)
	}
	if !extracted.IsM2M {
		t.Errorf("IsM2M = false; want true")
	}
	if extracted.ClientID != "client-xyz" {
		t.Errorf("ClientID = %q; want %q", extracted.ClientID, "client-xyz")
	}
	if extracted.IssuedAt != 1700000000 {
		t.Errorf("IssuedAt = %d; want 1700000000", extracted.IssuedAt)
	}
	if extracted.ExpiresAt != 1700003600 {
		t.Errorf("ExpiresAt = %d; want 1700003600", extracted.ExpiresAt)
	}
	if extracted.Issuer != "https://auth.example.com" {
		t.Errorf("Issuer = %q; want %q", extracted.Issuer, "https://auth.example.com")
	}
	if extracted.Token != "eyJhbGciOiJFZERTQSJ9.payload.signature" {
		t.Errorf("Token = %q; want %q", extracted.Token, "eyJhbGciOiJFZERTQSJ9.payload.signature")
	}
}

func TestContextWithClaims_OverwritesPrevious(t *testing.T) {
	first := &Claims{UserID: "user-1"}
	second := &Claims{UserID: "user-2"}

	ctx := context.Background()
	ctx = contextWithClaims(ctx, first)
	ctx = contextWithClaims(ctx, second)

	extracted := ClaimsFromContext(ctx)
	if extracted == nil {
		t.Fatal("ClaimsFromContext returned nil")
	}
	if extracted.UserID != "user-2" {
		t.Errorf("UserID = %q; want %q (second claims should overwrite first)", extracted.UserID, "user-2")
	}
}

func TestContextWithClaims_NilClaims(t *testing.T) {
	ctx := contextWithClaims(context.Background(), nil)
	extracted := ClaimsFromContext(ctx)
	if extracted != nil {
		t.Errorf("ClaimsFromContext after setting nil = %v; want nil", extracted)
	}
}

func TestClaimsFromContext_WrongKeyType(t *testing.T) {
	// Using a plain string key should not interfere with the internal contextKey
	type otherKey string
	ctx := context.WithValue(context.Background(), otherKey("claims"), "not-claims")
	claims := ClaimsFromContext(ctx)
	if claims != nil {
		t.Errorf("ClaimsFromContext with wrong key type = %v; want nil", claims)
	}
}

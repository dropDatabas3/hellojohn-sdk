package hellojohn

import (
	"testing"
	"time"
)

func TestNew_ValidConfig(t *testing.T) {
	client, err := New(Config{
		Domain: "https://auth.example.com",
	})
	if err != nil {
		t.Fatalf("New() returned error: %v", err)
	}
	if client == nil {
		t.Fatal("New() returned nil client")
	}
}

func TestNew_EmptyDomain(t *testing.T) {
	_, err := New(Config{
		Domain: "",
	})
	if err == nil {
		t.Fatal("New() with empty domain should return error")
	}
}

func TestNew_TrailingSlashTrimmed(t *testing.T) {
	client, err := New(Config{
		Domain: "https://auth.example.com/",
	})
	if err != nil {
		t.Fatalf("New() returned error: %v", err)
	}
	if client.config.Domain != "https://auth.example.com" {
		t.Errorf("Domain = %q; want %q (trailing slash should be trimmed)",
			client.config.Domain, "https://auth.example.com")
	}
}

func TestNew_MultipleTrailingSlashesTrimmed(t *testing.T) {
	client, err := New(Config{
		Domain: "https://auth.example.com///",
	})
	if err != nil {
		t.Fatalf("New() returned error: %v", err)
	}
	if client.config.Domain != "https://auth.example.com" {
		t.Errorf("Domain = %q; want %q", client.config.Domain, "https://auth.example.com")
	}
}

func TestNew_DefaultJWKSCacheTTL(t *testing.T) {
	client, err := New(Config{
		Domain: "https://auth.example.com",
	})
	if err != nil {
		t.Fatalf("New() returned error: %v", err)
	}
	if client.config.JWKSCacheTTL != time.Hour {
		t.Errorf("JWKSCacheTTL = %v; want %v", client.config.JWKSCacheTTL, time.Hour)
	}
}

func TestNew_CustomJWKSCacheTTL(t *testing.T) {
	customTTL := 30 * time.Minute
	client, err := New(Config{
		Domain:       "https://auth.example.com",
		JWKSCacheTTL: customTTL,
	})
	if err != nil {
		t.Fatalf("New() returned error: %v", err)
	}
	if client.config.JWKSCacheTTL != customTTL {
		t.Errorf("JWKSCacheTTL = %v; want %v", client.config.JWKSCacheTTL, customTTL)
	}
}

func TestNew_AudiencePreserved(t *testing.T) {
	client, err := New(Config{
		Domain:   "https://auth.example.com",
		Audience: "https://api.example.com",
	})
	if err != nil {
		t.Fatalf("New() returned error: %v", err)
	}
	if client.config.Audience != "https://api.example.com" {
		t.Errorf("Audience = %q; want %q",
			client.config.Audience, "https://api.example.com")
	}
}

func TestNew_VerifierInitialized(t *testing.T) {
	client, err := New(Config{
		Domain: "https://auth.example.com",
	})
	if err != nil {
		t.Fatalf("New() returned error: %v", err)
	}
	if client.verifier == nil {
		t.Error("client.verifier is nil; should be initialized")
	}
}

func TestNew_DomainWithoutTrailingSlash(t *testing.T) {
	client, err := New(Config{
		Domain: "https://auth.example.com",
	})
	if err != nil {
		t.Fatalf("New() returned error: %v", err)
	}
	if client.config.Domain != "https://auth.example.com" {
		t.Errorf("Domain = %q; want %q (should remain unchanged)",
			client.config.Domain, "https://auth.example.com")
	}
}

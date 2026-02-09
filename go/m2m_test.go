package hellojohn

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
)

// --- NewM2MClient validation tests ---

func TestNewM2MClient_Valid(t *testing.T) {
	client, err := NewM2MClient(M2MConfig{
		Domain:       "https://auth.example.com",
		ClientID:     "my-client",
		ClientSecret: "my-secret",
	})
	if err != nil {
		t.Fatalf("NewM2MClient() returned error: %v", err)
	}
	if client == nil {
		t.Fatal("NewM2MClient() returned nil client")
	}
}

func TestNewM2MClient_EmptyDomain(t *testing.T) {
	_, err := NewM2MClient(M2MConfig{
		Domain:       "",
		ClientID:     "my-client",
		ClientSecret: "my-secret",
	})
	if err == nil {
		t.Fatal("NewM2MClient() with empty domain should return error")
	}
}

func TestNewM2MClient_EmptyClientID(t *testing.T) {
	_, err := NewM2MClient(M2MConfig{
		Domain:       "https://auth.example.com",
		ClientID:     "",
		ClientSecret: "my-secret",
	})
	if err == nil {
		t.Fatal("NewM2MClient() with empty clientId should return error")
	}
}

func TestNewM2MClient_EmptyClientSecret(t *testing.T) {
	_, err := NewM2MClient(M2MConfig{
		Domain:       "https://auth.example.com",
		ClientID:     "my-client",
		ClientSecret: "",
	})
	if err == nil {
		t.Fatal("NewM2MClient() with empty clientSecret should return error")
	}
}

func TestNewM2MClient_TrailingSlashTrimmed(t *testing.T) {
	client, err := NewM2MClient(M2MConfig{
		Domain:       "https://auth.example.com/",
		ClientID:     "my-client",
		ClientSecret: "my-secret",
	})
	if err != nil {
		t.Fatalf("NewM2MClient() returned error: %v", err)
	}
	if client.config.Domain != "https://auth.example.com" {
		t.Errorf("Domain = %q; want %q", client.config.Domain, "https://auth.example.com")
	}
}

// --- GetToken tests with mock server ---

func newMockTokenServer(t *testing.T) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify method
		if r.Method != http.MethodPost {
			t.Errorf("expected POST, got %s", r.Method)
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		// Verify path
		if r.URL.Path != "/oauth2/token" {
			t.Errorf("expected /oauth2/token, got %s", r.URL.Path)
			w.WriteHeader(http.StatusNotFound)
			return
		}

		// Verify content type
		ct := r.Header.Get("Content-Type")
		if ct != "application/x-www-form-urlencoded" {
			t.Errorf("Content-Type = %q; want %q", ct, "application/x-www-form-urlencoded")
		}

		// Parse form
		if err := r.ParseForm(); err != nil {
			t.Errorf("ParseForm() error: %v", err)
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"access_token": "test-access-token",
			"expires_in":   3600,
			"token_type":   "Bearer",
		})
	}))
}

func TestGetToken_CorrectFormParams(t *testing.T) {
	var receivedForm url.Values

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseForm(); err != nil {
			t.Errorf("ParseForm() error: %v", err)
		}
		receivedForm = r.PostForm

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"access_token": "test-token",
			"expires_in":   3600,
		})
	}))
	defer srv.Close()

	client, err := NewM2MClient(M2MConfig{
		Domain:       srv.URL,
		ClientID:     "my-client-id",
		ClientSecret: "my-client-secret",
	})
	if err != nil {
		t.Fatalf("NewM2MClient() error: %v", err)
	}

	_, err = client.GetToken(context.Background(), TokenRequest{})
	if err != nil {
		t.Fatalf("GetToken() error: %v", err)
	}

	if got := receivedForm.Get("grant_type"); got != "client_credentials" {
		t.Errorf("grant_type = %q; want %q", got, "client_credentials")
	}
	if got := receivedForm.Get("client_id"); got != "my-client-id" {
		t.Errorf("client_id = %q; want %q", got, "my-client-id")
	}
	if got := receivedForm.Get("client_secret"); got != "my-client-secret" {
		t.Errorf("client_secret = %q; want %q", got, "my-client-secret")
	}
}

func TestGetToken_ReturnsAccessToken(t *testing.T) {
	srv := newMockTokenServer(t)
	defer srv.Close()

	client, err := NewM2MClient(M2MConfig{
		Domain:       srv.URL,
		ClientID:     "my-client",
		ClientSecret: "my-secret",
	})
	if err != nil {
		t.Fatalf("NewM2MClient() error: %v", err)
	}

	result, err := client.GetToken(context.Background(), TokenRequest{})
	if err != nil {
		t.Fatalf("GetToken() error: %v", err)
	}
	if result.AccessToken != "test-access-token" {
		t.Errorf("AccessToken = %q; want %q", result.AccessToken, "test-access-token")
	}
	if result.ExpiresAt == 0 {
		t.Error("ExpiresAt should be non-zero")
	}
}

func TestGetToken_CachesToken(t *testing.T) {
	callCount := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"access_token": "cached-token",
			"expires_in":   3600,
		})
	}))
	defer srv.Close()

	client, err := NewM2MClient(M2MConfig{
		Domain:       srv.URL,
		ClientID:     "my-client",
		ClientSecret: "my-secret",
	})
	if err != nil {
		t.Fatalf("NewM2MClient() error: %v", err)
	}

	ctx := context.Background()

	// First call should hit the server
	result1, err := client.GetToken(ctx, TokenRequest{})
	if err != nil {
		t.Fatalf("GetToken() first call error: %v", err)
	}

	// Second call should return cached token
	result2, err := client.GetToken(ctx, TokenRequest{})
	if err != nil {
		t.Fatalf("GetToken() second call error: %v", err)
	}

	if callCount != 1 {
		t.Errorf("server called %d times; want 1 (second call should use cache)", callCount)
	}

	if result1.AccessToken != result2.AccessToken {
		t.Errorf("cached token %q != first token %q", result2.AccessToken, result1.AccessToken)
	}
}

func TestGetToken_SendsTenantSlugHeader(t *testing.T) {
	var receivedTenantSlug string

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedTenantSlug = r.Header.Get("X-Tenant-Slug")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"access_token": "test-token",
			"expires_in":   3600,
		})
	}))
	defer srv.Close()

	client, err := NewM2MClient(M2MConfig{
		Domain:       srv.URL,
		TenantID:     "acme-corp",
		ClientID:     "my-client",
		ClientSecret: "my-secret",
	})
	if err != nil {
		t.Fatalf("NewM2MClient() error: %v", err)
	}

	_, err = client.GetToken(context.Background(), TokenRequest{})
	if err != nil {
		t.Fatalf("GetToken() error: %v", err)
	}

	if receivedTenantSlug != "acme-corp" {
		t.Errorf("X-Tenant-Slug = %q; want %q", receivedTenantSlug, "acme-corp")
	}
}

func TestGetToken_NoTenantSlugHeader_WhenEmpty(t *testing.T) {
	var receivedTenantSlug string
	var hasTenantHeader bool

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedTenantSlug = r.Header.Get("X-Tenant-Slug")
		_, hasTenantHeader = r.Header["X-Tenant-Slug"]
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"access_token": "test-token",
			"expires_in":   3600,
		})
	}))
	defer srv.Close()

	client, err := NewM2MClient(M2MConfig{
		Domain:       srv.URL,
		ClientID:     "my-client",
		ClientSecret: "my-secret",
		// TenantID not set
	})
	if err != nil {
		t.Fatalf("NewM2MClient() error: %v", err)
	}

	_, err = client.GetToken(context.Background(), TokenRequest{})
	if err != nil {
		t.Fatalf("GetToken() error: %v", err)
	}

	if hasTenantHeader {
		t.Errorf("X-Tenant-Slug header should not be present, got %q", receivedTenantSlug)
	}
}

func TestGetToken_SendsScopeParam(t *testing.T) {
	var receivedScope string

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseForm(); err != nil {
			t.Errorf("ParseForm() error: %v", err)
		}
		receivedScope = r.PostForm.Get("scope")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"access_token": "test-token",
			"expires_in":   3600,
		})
	}))
	defer srv.Close()

	client, err := NewM2MClient(M2MConfig{
		Domain:       srv.URL,
		ClientID:     "my-client",
		ClientSecret: "my-secret",
	})
	if err != nil {
		t.Fatalf("NewM2MClient() error: %v", err)
	}

	_, err = client.GetToken(context.Background(), TokenRequest{
		Scopes: []string{"read", "write"},
	})
	if err != nil {
		t.Fatalf("GetToken() error: %v", err)
	}

	if receivedScope != "read write" {
		t.Errorf("scope = %q; want %q", receivedScope, "read write")
	}
}

func TestGetToken_NoScopeParam_WhenEmpty(t *testing.T) {
	var receivedScope string
	var hasScopeParam bool

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseForm(); err != nil {
			t.Errorf("ParseForm() error: %v", err)
		}
		receivedScope = r.PostForm.Get("scope")
		_, hasScopeParam = r.PostForm["scope"]
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"access_token": "test-token",
			"expires_in":   3600,
		})
	}))
	defer srv.Close()

	client, err := NewM2MClient(M2MConfig{
		Domain:       srv.URL,
		ClientID:     "my-client",
		ClientSecret: "my-secret",
	})
	if err != nil {
		t.Fatalf("NewM2MClient() error: %v", err)
	}

	_, err = client.GetToken(context.Background(), TokenRequest{})
	if err != nil {
		t.Fatalf("GetToken() error: %v", err)
	}

	if hasScopeParam {
		t.Errorf("scope param should not be present when no scopes requested, got %q", receivedScope)
	}
}

func TestGetToken_ErrorOnNon200(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": "invalid_client",
		})
	}))
	defer srv.Close()

	client, err := NewM2MClient(M2MConfig{
		Domain:       srv.URL,
		ClientID:     "bad-client",
		ClientSecret: "bad-secret",
	})
	if err != nil {
		t.Fatalf("NewM2MClient() error: %v", err)
	}

	_, err = client.GetToken(context.Background(), TokenRequest{})
	if err == nil {
		t.Fatal("GetToken() should return error on non-200 response")
	}
}

func TestGetToken_ErrorOn500(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	client, err := NewM2MClient(M2MConfig{
		Domain:       srv.URL,
		ClientID:     "my-client",
		ClientSecret: "my-secret",
	})
	if err != nil {
		t.Fatalf("NewM2MClient() error: %v", err)
	}

	_, err = client.GetToken(context.Background(), TokenRequest{})
	if err == nil {
		t.Fatal("GetToken() should return error on 500 response")
	}
}

// --- ClearCache tests ---

func TestClearCache(t *testing.T) {
	callCount := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"access_token": "token-v" + string(rune('0'+callCount)),
			"expires_in":   3600,
		})
	}))
	defer srv.Close()

	client, err := NewM2MClient(M2MConfig{
		Domain:       srv.URL,
		ClientID:     "my-client",
		ClientSecret: "my-secret",
	})
	if err != nil {
		t.Fatalf("NewM2MClient() error: %v", err)
	}

	ctx := context.Background()

	// First call
	_, err = client.GetToken(ctx, TokenRequest{})
	if err != nil {
		t.Fatalf("GetToken() first call error: %v", err)
	}
	if callCount != 1 {
		t.Fatalf("expected 1 server call, got %d", callCount)
	}

	// Clear cache
	client.ClearCache()

	// Second call should hit the server again
	_, err = client.GetToken(ctx, TokenRequest{})
	if err != nil {
		t.Fatalf("GetToken() after ClearCache error: %v", err)
	}
	if callCount != 2 {
		t.Errorf("server called %d times; want 2 (cache should have been cleared)", callCount)
	}
}

// --- buildScopeKey tests ---

func TestBuildScopeKey_Empty(t *testing.T) {
	key := buildScopeKey([]string{})
	if key != "" {
		t.Errorf("buildScopeKey([]) = %q; want empty string", key)
	}
}

func TestBuildScopeKey_Nil(t *testing.T) {
	key := buildScopeKey(nil)
	if key != "" {
		t.Errorf("buildScopeKey(nil) = %q; want empty string", key)
	}
}

func TestBuildScopeKey_Single(t *testing.T) {
	key := buildScopeKey([]string{"read"})
	if key != "read" {
		t.Errorf("buildScopeKey([read]) = %q; want %q", key, "read")
	}
}

func TestBuildScopeKey_SortedOutput(t *testing.T) {
	key1 := buildScopeKey([]string{"write", "read", "admin"})
	key2 := buildScopeKey([]string{"admin", "read", "write"})
	key3 := buildScopeKey([]string{"read", "admin", "write"})

	expected := "admin read write"
	if key1 != expected {
		t.Errorf("buildScopeKey([write read admin]) = %q; want %q", key1, expected)
	}
	if key2 != expected {
		t.Errorf("buildScopeKey([admin read write]) = %q; want %q", key2, expected)
	}
	if key3 != expected {
		t.Errorf("buildScopeKey([read admin write]) = %q; want %q", key3, expected)
	}
}

func TestBuildScopeKey_DoesNotMutateInput(t *testing.T) {
	input := []string{"write", "read", "admin"}
	original := make([]string, len(input))
	copy(original, input)

	buildScopeKey(input)

	for i := range input {
		if input[i] != original[i] {
			t.Errorf("input[%d] = %q; want %q (input was mutated)", i, input[i], original[i])
		}
	}
}

// --- Cache key isolation (different scopes = different cache entries) ---

func TestGetToken_DifferentScopesDifferentCacheEntries(t *testing.T) {
	callCount := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		if err := r.ParseForm(); err != nil {
			t.Errorf("ParseForm() error: %v", err)
		}
		scope := r.PostForm.Get("scope")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"access_token": "token-for-" + scope,
			"expires_in":   3600,
		})
	}))
	defer srv.Close()

	client, err := NewM2MClient(M2MConfig{
		Domain:       srv.URL,
		ClientID:     "my-client",
		ClientSecret: "my-secret",
	})
	if err != nil {
		t.Fatalf("NewM2MClient() error: %v", err)
	}

	ctx := context.Background()

	// Request with scope "read"
	r1, err := client.GetToken(ctx, TokenRequest{Scopes: []string{"read"}})
	if err != nil {
		t.Fatalf("GetToken(read) error: %v", err)
	}

	// Request with scope "write" - should make a new server call
	r2, err := client.GetToken(ctx, TokenRequest{Scopes: []string{"write"}})
	if err != nil {
		t.Fatalf("GetToken(write) error: %v", err)
	}

	if callCount != 2 {
		t.Errorf("server called %d times; want 2 (different scopes = different cache keys)", callCount)
	}

	if r1.AccessToken == r2.AccessToken {
		t.Errorf("tokens for different scopes should differ: both = %q", r1.AccessToken)
	}
}

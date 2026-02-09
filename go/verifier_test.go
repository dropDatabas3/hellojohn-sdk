package hellojohn

import (
	"encoding/json"
	"testing"
)

// --- extractScopes tests ---

func TestExtractScopes_WithScpArray(t *testing.T) {
	payload := map[string]interface{}{
		"scp": []interface{}{"read", "write", "admin"},
	}
	scopes := extractScopes(payload)
	if len(scopes) != 3 {
		t.Fatalf("extractScopes len = %d; want 3", len(scopes))
	}
	if scopes[0] != "read" || scopes[1] != "write" || scopes[2] != "admin" {
		t.Errorf("extractScopes = %v; want [read write admin]", scopes)
	}
}

func TestExtractScopes_WithScopeString(t *testing.T) {
	payload := map[string]interface{}{
		"scope": "openid profile email",
	}
	scopes := extractScopes(payload)
	if len(scopes) != 3 {
		t.Fatalf("extractScopes len = %d; want 3", len(scopes))
	}
	if scopes[0] != "openid" || scopes[1] != "profile" || scopes[2] != "email" {
		t.Errorf("extractScopes = %v; want [openid profile email]", scopes)
	}
}

func TestExtractScopes_WithScopeStringSingle(t *testing.T) {
	payload := map[string]interface{}{
		"scope": "openid",
	}
	scopes := extractScopes(payload)
	if len(scopes) != 1 {
		t.Fatalf("extractScopes len = %d; want 1", len(scopes))
	}
	if scopes[0] != "openid" {
		t.Errorf("extractScopes = %v; want [openid]", scopes)
	}
}

func TestExtractScopes_ScpTakesPrecedence(t *testing.T) {
	// When both scp and scope are present, scp should be used
	payload := map[string]interface{}{
		"scp":   []interface{}{"from-scp"},
		"scope": "from-scope",
	}
	scopes := extractScopes(payload)
	if len(scopes) != 1 || scopes[0] != "from-scp" {
		t.Errorf("extractScopes = %v; want [from-scp] (scp takes precedence)", scopes)
	}
}

func TestExtractScopes_EmptyPayload(t *testing.T) {
	payload := map[string]interface{}{}
	scopes := extractScopes(payload)
	if scopes != nil {
		t.Errorf("extractScopes on empty payload = %v; want nil", scopes)
	}
}

func TestExtractScopes_EmptyScopeString(t *testing.T) {
	payload := map[string]interface{}{
		"scope": "",
	}
	scopes := extractScopes(payload)
	if scopes != nil {
		t.Errorf("extractScopes with empty scope string = %v; want nil", scopes)
	}
}

func TestExtractScopes_ScopeAsArray(t *testing.T) {
	// scope claim as an array (non-standard but handled)
	payload := map[string]interface{}{
		"scope": []interface{}{"read", "write"},
	}
	scopes := extractScopes(payload)
	if len(scopes) != 2 {
		t.Fatalf("extractScopes len = %d; want 2", len(scopes))
	}
	if scopes[0] != "read" || scopes[1] != "write" {
		t.Errorf("extractScopes = %v; want [read write]", scopes)
	}
}

// --- extractStringSlice tests ---

func TestExtractStringSlice_WithStringSlice(t *testing.T) {
	input := []interface{}{"admin", "editor", "viewer"}
	result := extractStringSlice(input)
	if len(result) != 3 {
		t.Fatalf("extractStringSlice len = %d; want 3", len(result))
	}
	if result[0] != "admin" || result[1] != "editor" || result[2] != "viewer" {
		t.Errorf("extractStringSlice = %v; want [admin editor viewer]", result)
	}
}

func TestExtractStringSlice_WithString(t *testing.T) {
	result := extractStringSlice("read write admin")
	if len(result) != 3 {
		t.Fatalf("extractStringSlice len = %d; want 3", len(result))
	}
	if result[0] != "read" || result[1] != "write" || result[2] != "admin" {
		t.Errorf("extractStringSlice = %v; want [read write admin]", result)
	}
}

func TestExtractStringSlice_WithEmptyString(t *testing.T) {
	result := extractStringSlice("")
	if result != nil {
		t.Errorf("extractStringSlice(\"\") = %v; want nil", result)
	}
}

func TestExtractStringSlice_WithNil(t *testing.T) {
	result := extractStringSlice(nil)
	if result != nil {
		t.Errorf("extractStringSlice(nil) = %v; want nil", result)
	}
}

func TestExtractStringSlice_WithEmptyArray(t *testing.T) {
	input := []interface{}{}
	result := extractStringSlice(input)
	if len(result) != 0 {
		t.Errorf("extractStringSlice([]) len = %d; want 0", len(result))
	}
}

func TestExtractStringSlice_WithMixedTypes(t *testing.T) {
	// Non-string values in the array should be skipped
	input := []interface{}{"admin", 42, "editor", true, "viewer"}
	result := extractStringSlice(input)
	if len(result) != 3 {
		t.Fatalf("extractStringSlice len = %d; want 3 (non-strings skipped)", len(result))
	}
	if result[0] != "admin" || result[1] != "editor" || result[2] != "viewer" {
		t.Errorf("extractStringSlice = %v; want [admin editor viewer]", result)
	}
}

func TestExtractStringSlice_WithSingleWordString(t *testing.T) {
	result := extractStringSlice("admin")
	if len(result) != 1 || result[0] != "admin" {
		t.Errorf("extractStringSlice(\"admin\") = %v; want [admin]", result)
	}
}

// --- matchesAudience tests ---

func TestMatchesAudience_StringMatch(t *testing.T) {
	if !matchesAudience("https://api.example.com", "https://api.example.com") {
		t.Error("matchesAudience string match = false; want true")
	}
}

func TestMatchesAudience_StringMismatch(t *testing.T) {
	if matchesAudience("https://api.example.com", "https://other.example.com") {
		t.Error("matchesAudience string mismatch = true; want false")
	}
}

func TestMatchesAudience_ArrayContains(t *testing.T) {
	aud := []interface{}{"https://api1.example.com", "https://api2.example.com"}
	if !matchesAudience(aud, "https://api2.example.com") {
		t.Error("matchesAudience array contains = false; want true")
	}
}

func TestMatchesAudience_ArrayNotContains(t *testing.T) {
	aud := []interface{}{"https://api1.example.com", "https://api2.example.com"}
	if matchesAudience(aud, "https://api3.example.com") {
		t.Error("matchesAudience array not contains = true; want false")
	}
}

func TestMatchesAudience_EmptyArray(t *testing.T) {
	aud := []interface{}{}
	if matchesAudience(aud, "https://api.example.com") {
		t.Error("matchesAudience empty array = true; want false")
	}
}

func TestMatchesAudience_NilAud(t *testing.T) {
	if matchesAudience(nil, "https://api.example.com") {
		t.Error("matchesAudience nil = true; want false")
	}
}

func TestMatchesAudience_NumberType(t *testing.T) {
	// Unsupported type should return false
	if matchesAudience(12345, "12345") {
		t.Error("matchesAudience with number type = true; want false")
	}
}

// --- toString tests ---

func TestToString_WithString(t *testing.T) {
	result := toString("hello")
	if result != "hello" {
		t.Errorf("toString(\"hello\") = %q; want %q", result, "hello")
	}
}

func TestToString_WithEmptyString(t *testing.T) {
	result := toString("")
	if result != "" {
		t.Errorf("toString(\"\") = %q; want empty string", result)
	}
}

func TestToString_WithNonString(t *testing.T) {
	result := toString(42)
	if result != "" {
		t.Errorf("toString(42) = %q; want empty string", result)
	}
}

func TestToString_WithNil(t *testing.T) {
	result := toString(nil)
	if result != "" {
		t.Errorf("toString(nil) = %q; want empty string", result)
	}
}

func TestToString_WithBool(t *testing.T) {
	result := toString(true)
	if result != "" {
		t.Errorf("toString(true) = %q; want empty string", result)
	}
}

// --- toInt64 tests ---

func TestToInt64_WithFloat64(t *testing.T) {
	val, ok := toInt64(float64(1700000000))
	if !ok {
		t.Fatal("toInt64(float64) ok = false; want true")
	}
	if val != 1700000000 {
		t.Errorf("toInt64(float64(1700000000)) = %d; want 1700000000", val)
	}
}

func TestToInt64_WithZeroFloat(t *testing.T) {
	val, ok := toInt64(float64(0))
	if !ok {
		t.Fatal("toInt64(float64(0)) ok = false; want true")
	}
	if val != 0 {
		t.Errorf("toInt64(float64(0)) = %d; want 0", val)
	}
}

func TestToInt64_WithNegativeFloat(t *testing.T) {
	val, ok := toInt64(float64(-100))
	if !ok {
		t.Fatal("toInt64(float64(-100)) ok = false; want true")
	}
	if val != -100 {
		t.Errorf("toInt64(float64(-100)) = %d; want -100", val)
	}
}

func TestToInt64_WithJsonNumber(t *testing.T) {
	val, ok := toInt64(json.Number("1700000000"))
	if !ok {
		t.Fatal("toInt64(json.Number) ok = false; want true")
	}
	if val != 1700000000 {
		t.Errorf("toInt64(json.Number(\"1700000000\")) = %d; want 1700000000", val)
	}
}

func TestToInt64_WithInvalidJsonNumber(t *testing.T) {
	_, ok := toInt64(json.Number("not-a-number"))
	if ok {
		t.Error("toInt64(json.Number(\"not-a-number\")) ok = true; want false")
	}
}

func TestToInt64_WithString(t *testing.T) {
	val, ok := toInt64("12345")
	if ok {
		t.Error("toInt64(string) ok = true; want false")
	}
	if val != 0 {
		t.Errorf("toInt64(string) = %d; want 0", val)
	}
}

func TestToInt64_WithNil(t *testing.T) {
	val, ok := toInt64(nil)
	if ok {
		t.Error("toInt64(nil) ok = true; want false")
	}
	if val != 0 {
		t.Errorf("toInt64(nil) = %d; want 0", val)
	}
}

func TestToInt64_WithBool(t *testing.T) {
	val, ok := toInt64(true)
	if ok {
		t.Error("toInt64(true) ok = true; want false")
	}
	if val != 0 {
		t.Errorf("toInt64(true) = %d; want 0", val)
	}
}

// --- toInt64OrZero tests ---

func TestToInt64OrZero_WithFloat(t *testing.T) {
	val := toInt64OrZero(float64(42))
	if val != 42 {
		t.Errorf("toInt64OrZero(float64(42)) = %d; want 42", val)
	}
}

func TestToInt64OrZero_WithNonNumber(t *testing.T) {
	val := toInt64OrZero("not-a-number")
	if val != 0 {
		t.Errorf("toInt64OrZero(\"not-a-number\") = %d; want 0", val)
	}
}

func TestToInt64OrZero_WithNil(t *testing.T) {
	val := toInt64OrZero(nil)
	if val != 0 {
		t.Errorf("toInt64OrZero(nil) = %d; want 0", val)
	}
}

// --- containsString tests ---

func TestContainsString_Present(t *testing.T) {
	if !containsString([]string{"a", "b", "c"}, "b") {
		t.Error("containsString([a b c], b) = false; want true")
	}
}

func TestContainsString_Missing(t *testing.T) {
	if containsString([]string{"a", "b", "c"}, "d") {
		t.Error("containsString([a b c], d) = true; want false")
	}
}

func TestContainsString_EmptySlice(t *testing.T) {
	if containsString([]string{}, "a") {
		t.Error("containsString([], a) = true; want false")
	}
}

func TestContainsString_NilSlice(t *testing.T) {
	if containsString(nil, "a") {
		t.Error("containsString(nil, a) = true; want false")
	}
}

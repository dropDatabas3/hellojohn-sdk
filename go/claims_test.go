package hellojohn

import "testing"

func TestHasScope_Present(t *testing.T) {
	c := &Claims{Scopes: []string{"read", "write", "admin"}}
	if !c.HasScope("read") {
		t.Errorf("HasScope(\"read\") = false; want true")
	}
	if !c.HasScope("write") {
		t.Errorf("HasScope(\"write\") = false; want true")
	}
	if !c.HasScope("admin") {
		t.Errorf("HasScope(\"admin\") = false; want true")
	}
}

func TestHasScope_Missing(t *testing.T) {
	c := &Claims{Scopes: []string{"read", "write"}}
	if c.HasScope("delete") {
		t.Errorf("HasScope(\"delete\") = true; want false")
	}
}

func TestHasScope_EmptySlice(t *testing.T) {
	c := &Claims{Scopes: []string{}}
	if c.HasScope("read") {
		t.Errorf("HasScope(\"read\") on empty scopes = true; want false")
	}
}

func TestHasScope_NilSlice(t *testing.T) {
	c := &Claims{}
	if c.HasScope("read") {
		t.Errorf("HasScope(\"read\") on nil scopes = true; want false")
	}
}

func TestHasRole_Present(t *testing.T) {
	c := &Claims{Roles: []string{"admin", "editor", "viewer"}}
	if !c.HasRole("admin") {
		t.Errorf("HasRole(\"admin\") = false; want true")
	}
	if !c.HasRole("editor") {
		t.Errorf("HasRole(\"editor\") = false; want true")
	}
	if !c.HasRole("viewer") {
		t.Errorf("HasRole(\"viewer\") = false; want true")
	}
}

func TestHasRole_Missing(t *testing.T) {
	c := &Claims{Roles: []string{"admin"}}
	if c.HasRole("superadmin") {
		t.Errorf("HasRole(\"superadmin\") = true; want false")
	}
}

func TestHasRole_EmptySlice(t *testing.T) {
	c := &Claims{Roles: []string{}}
	if c.HasRole("admin") {
		t.Errorf("HasRole(\"admin\") on empty roles = true; want false")
	}
}

func TestHasRole_NilSlice(t *testing.T) {
	c := &Claims{}
	if c.HasRole("admin") {
		t.Errorf("HasRole(\"admin\") on nil roles = true; want false")
	}
}

func TestHasPermission_Present(t *testing.T) {
	c := &Claims{Permissions: []string{"users:read", "users:write", "billing:manage"}}
	if !c.HasPermission("users:read") {
		t.Errorf("HasPermission(\"users:read\") = false; want true")
	}
	if !c.HasPermission("users:write") {
		t.Errorf("HasPermission(\"users:write\") = false; want true")
	}
	if !c.HasPermission("billing:manage") {
		t.Errorf("HasPermission(\"billing:manage\") = false; want true")
	}
}

func TestHasPermission_Missing(t *testing.T) {
	c := &Claims{Permissions: []string{"users:read"}}
	if c.HasPermission("users:delete") {
		t.Errorf("HasPermission(\"users:delete\") = true; want false")
	}
}

func TestHasPermission_EmptySlice(t *testing.T) {
	c := &Claims{Permissions: []string{}}
	if c.HasPermission("users:read") {
		t.Errorf("HasPermission(\"users:read\") on empty permissions = true; want false")
	}
}

func TestHasPermission_NilSlice(t *testing.T) {
	c := &Claims{}
	if c.HasPermission("users:read") {
		t.Errorf("HasPermission(\"users:read\") on nil permissions = true; want false")
	}
}

func TestHasScope_ExactMatchOnly(t *testing.T) {
	c := &Claims{Scopes: []string{"read:users"}}
	if c.HasScope("read") {
		t.Errorf("HasScope(\"read\") should not match \"read:users\"")
	}
	if c.HasScope("read:users:all") {
		t.Errorf("HasScope(\"read:users:all\") should not match \"read:users\"")
	}
}

func TestHasRole_ExactMatchOnly(t *testing.T) {
	c := &Claims{Roles: []string{"admin"}}
	if c.HasRole("admi") {
		t.Errorf("HasRole(\"admi\") should not match \"admin\"")
	}
	if c.HasRole("admin-super") {
		t.Errorf("HasRole(\"admin-super\") should not match \"admin\"")
	}
}

func TestHasPermission_ExactMatchOnly(t *testing.T) {
	c := &Claims{Permissions: []string{"users:read"}}
	if c.HasPermission("users") {
		t.Errorf("HasPermission(\"users\") should not match \"users:read\"")
	}
	if c.HasPermission("users:read:all") {
		t.Errorf("HasPermission(\"users:read:all\") should not match \"users:read\"")
	}
}

func TestClaims_MultipleValues(t *testing.T) {
	c := &Claims{
		Scopes:      []string{"openid", "profile", "email", "offline_access"},
		Roles:       []string{"admin", "editor"},
		Permissions: []string{"users:read", "users:write", "billing:manage"},
	}

	if !c.HasScope("openid") {
		t.Errorf("HasScope(\"openid\") = false; want true")
	}
	if !c.HasScope("offline_access") {
		t.Errorf("HasScope(\"offline_access\") = false; want true")
	}
	if c.HasScope("admin") {
		t.Errorf("HasScope(\"admin\") = true; want false (scopes, not roles)")
	}

	if !c.HasRole("admin") {
		t.Errorf("HasRole(\"admin\") = false; want true")
	}
	if c.HasRole("openid") {
		t.Errorf("HasRole(\"openid\") = true; want false (roles, not scopes)")
	}

	if !c.HasPermission("billing:manage") {
		t.Errorf("HasPermission(\"billing:manage\") = false; want true")
	}
	if c.HasPermission("admin") {
		t.Errorf("HasPermission(\"admin\") = true; want false")
	}
}

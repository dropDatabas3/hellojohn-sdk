package hellojohn

// Claims represents the verified JWT claims from a HelloJohn token.
type Claims struct {
	// UserID is the subject claim (sub). For M2M tokens, this is the client ID.
	UserID string

	// TenantID is the tenant identifier (tid claim).
	TenantID string

	// Scopes extracted from the scp or scope claim.
	Scopes []string

	// Roles extracted from the roles claim.
	Roles []string

	// Permissions extracted from the perms claim.
	Permissions []string

	// IsM2M indicates this is a machine-to-machine token (amr contains "client").
	IsM2M bool

	// ClientID is set for M2M tokens (same as UserID when IsM2M is true).
	ClientID string

	// IssuedAt is the iat claim (Unix timestamp).
	IssuedAt int64

	// ExpiresAt is the exp claim (Unix timestamp).
	ExpiresAt int64

	// Issuer is the iss claim.
	Issuer string

	// Raw contains all JWT payload claims as a map.
	Raw map[string]interface{}

	// Token is the original JWT string.
	Token string
}

// HasScope returns true if the claims contain the given scope.
func (c *Claims) HasScope(scope string) bool {
	for _, s := range c.Scopes {
		if s == scope {
			return true
		}
	}
	return false
}

// HasRole returns true if the claims contain the given role.
func (c *Claims) HasRole(role string) bool {
	for _, r := range c.Roles {
		if r == role {
			return true
		}
	}
	return false
}

// HasPermission returns true if the claims contain the given permission.
func (c *Claims) HasPermission(perm string) bool {
	for _, p := range c.Permissions {
		if p == perm {
			return true
		}
	}
	return false
}

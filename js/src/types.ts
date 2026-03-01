export interface AuthClientOptions {
    domain: string;           // e.g. "http://localhost:8080"
    clientID: string;
    redirectURI?: string;     // Default: window.location.origin + '/callback'
    tenantID?: string;        // Optional (specific tenant ID/slug)
    audience?: string;        // Optional (API identifier)
    scope?: string;           // Default: "openid profile email"
    storage?: import("./storage").StorageAdapter;  // Default: localStorage
    autoRefresh?: boolean;    // Default: true — auto-refresh tokens before expiry
}

export type MFAMethodType = "totp" | "sms" | "email";

/** MFA method exposed by the SDK for login challenges. */
export interface MFAMethod {
    type: MFAMethodType;
    label: string;
    hint?: string;
}

/** Result returned by login when a second factor is required. */
export interface MFARequiredResult {
    requiresMFA: true;
    /** Canonical field name used by backend DTOs. */
    mfaToken: string;
    /** Backward-compatible alias used by some clients/docs. */
    challengeToken: string;
    availableFactors: MFAMethodType[];
    availableMethods: MFAMethod[];
    preferredFactor?: MFAMethodType;
}

export interface RegisterOptions {
    email: string;
    password: string;
    username?: string;
    name?: string;
    customFields?: Record<string, any>;
}

export interface RegisterResponse {
    user_id: string;
    access_token?: string;
    expires_in?: number;
}

export interface LoginOptions {
    appState?: any;           // Recover state after redirect
    scope?: string;           // Override default scope
}

export interface TokenResponse {
    access_token: string;
    id_token?: string;
    refresh_token?: string;
    scope: string;
    expires_in: number;
    token_type: string;
}

export interface User {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
    [key: string]: any;
}

export interface CustomFieldSchema {
    name: string;
    type: string;
    label: string;
    required: boolean;
}

export interface AuthConfig {
    tenant_name: string;
    tenant_slug: string;
    client_name: string;
    logo_url?: string;
    primary_color?: string;
    social_providers: string[];
    password_enabled: boolean;
    features?: Record<string, boolean>;
    custom_fields?: CustomFieldSchema[];
}

export interface PasswordPolicy {
    configured?: boolean;
    tenant_id?: string;
    min_length: number;
    max_length: number;
    require_uppercase: boolean;
    require_lowercase: boolean;
    require_numbers: boolean;
    require_symbols: boolean;
    max_history: number;
    breach_detection: boolean;
    common_password: boolean;
    personal_info: boolean;
}

/**
 * Status of a single auth provider as returned by /v2/auth/providers.
 * `ready: true` means the provider is fully configured and usable.
 * When `ready: false`, `reason` explains what is missing.
 */
export interface ProviderStatus {
    /** Provider identifier, e.g. "google", "github", "password" */
    name: string;
    /** Whether the provider is enabled for this client */
    enabled: boolean;
    /** Whether the provider is fully configured and can be used for login */
    ready: boolean;
    /** Human-readable explanation when ready is false */
    reason?: string;
    /** Direct start URL — use this instead of building it manually */
    start_url?: string;
}

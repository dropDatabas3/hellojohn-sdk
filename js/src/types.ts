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

// Core client
export { AuthClient, createHelloJohn } from "./client"

// Types
export type {
    AuthClientOptions,
    LoginOptions,
    TokenResponse,
    User,
    RegisterOptions,
    RegisterResponse,
    AuthConfig,
    CustomFieldSchema,
} from "./types"

// Storage adapters
export type { StorageAdapter } from "./storage"
export {
    localStorageAdapter,
    sessionStorageAdapter,
    createMemoryStorageAdapter,
    createCookieStorageAdapter,
} from "./storage"

// Event system
export type { AuthEvent, AuthSession, AuthEventCallback } from "./event-emitter"

// JWT utilities
export { decodeJWTPayload, isTokenExpired, getTokenExpiresIn } from "./jwt"
export type { JWTPayload } from "./jwt"

// MFA
export type { MFAClient, MFAEnrollResult, MFAChallengeResult, MFARecoveryResult } from "./mfa"

// Errors
export {
    HelloJohnError,
    AuthenticationError,
    TokenError,
    MFARequiredError,
    NetworkError,
} from "./errors"

// Fetch wrapper
export { createFetchWrapper } from "./fetch-wrapper"

// PKCE utilities (advanced)
export { generateCodeVerifier, generateCodeChallenge } from "./pkce"

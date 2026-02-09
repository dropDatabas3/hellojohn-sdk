/**
 * Event system for HelloJohn JS SDK.
 * Firebase-inspired onAuthStateChange pattern.
 */

export type AuthEvent =
  | "SIGNED_IN"
  | "SIGNED_OUT"
  | "TOKEN_REFRESHED"
  | "USER_UPDATED"
  | "SESSION_EXPIRED"
  | "MFA_REQUIRED"

export interface AuthSession {
  accessToken: string
  idToken?: string
  refreshToken?: string
  user: { sub: string; email?: string; name?: string; [key: string]: any }
  expiresAt: number
}

export type AuthEventCallback = (event: AuthEvent, session: AuthSession | null) => void

export class AuthEventEmitter {
  private listeners = new Set<AuthEventCallback>()

  /**
   * Subscribe to auth state changes.
   * Returns an unsubscribe function.
   */
  on(callback: AuthEventCallback): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  /** Emit an event to all listeners */
  emit(event: AuthEvent, session: AuthSession | null): void {
    for (const listener of this.listeners) {
      try {
        listener(event, session)
      } catch {
        // Don't let listener errors break the SDK
      }
    }
  }

  /** Remove all listeners */
  clear(): void {
    this.listeners.clear()
  }
}

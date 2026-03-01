import { HelloJohnError } from "./errors"
import { TokenResponse } from "./types"

export interface AuthResult extends TokenResponse { }

export interface PasswordlessClient {
    sendMagicLink(email: string, redirectUri: string): Promise<void>
    verifyMagicLink(token: string): Promise<AuthResult>
    exchangeMagicLinkCode(code: string): Promise<AuthResult>
    sendOTP(email: string): Promise<void>
    verifyOTP(email: string, code: string): Promise<AuthResult>
}

export function createPasswordlessClient(
    domain: string,
    clientID: string,
    tenantID?: string
): PasswordlessClient {
    const baseUrl = domain.replace(/\/$/, "")

    return {
        async sendMagicLink(email: string, redirectUri: string): Promise<void> {
            const body: any = {
                client_id: clientID,
                email,
                redirect_uri: redirectUri
            }
            if (tenantID) {
                body.tenant_id = tenantID
            }

            const resp = await fetch(`${baseUrl}/v2/auth/magic-link/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            })

            if (!resp.ok) {
                const err = await resp.json().catch(() => ({ error: "unknown_error" }))
                throw new HelloJohnError(err.error_description || "Magic Link failed", err.error || "magic_link_error", resp.status)
            }
        },

        async verifyMagicLink(token: string): Promise<AuthResult> {
            const resp = await fetch(`${baseUrl}/v2/auth/magic-link/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, client_id: clientID })
            })

            if (!resp.ok) {
                const err = await resp.json().catch(() => ({ error: "unknown_error" }))
                throw new HelloJohnError(err.error_description || "Verification failed", err.error || "verification_error", resp.status)
            }

            return resp.json()
        },

        async exchangeMagicLinkCode(code: string): Promise<AuthResult> {
            const resp = await fetch(`${baseUrl}/v2/auth/magic-link/exchange`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code })
            })

            if (!resp.ok) {
                const err = await resp.json().catch(() => ({ error: "unknown_error" }))
                throw new HelloJohnError(err.error_description || "Magic Link code exchange failed", err.error || "magic_link_exchange_error", resp.status)
            }

            return resp.json()
        },

        async sendOTP(email: string): Promise<void> {
            const body: any = {
                client_id: clientID,
                email,
            }
            if (tenantID) {
                body.tenant_id = tenantID
            }

            const resp = await fetch(`${baseUrl}/v2/auth/otp/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            })

            if (!resp.ok) {
                const err = await resp.json().catch(() => ({ error: "unknown_error" }))
                throw new HelloJohnError(err.error_description || "Sending OTP failed", err.error || "otp_send_error", resp.status)
            }
        },

        async verifyOTP(email: string, code: string): Promise<AuthResult> {
            const body: any = {
                client_id: clientID,
                email,
                code
            }
            if (tenantID) {
                body.tenant_id = tenantID
            }

            const resp = await fetch(`${baseUrl}/v2/auth/otp/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            })

            if (!resp.ok) {
                const err = await resp.json().catch(() => ({ error: "unknown_error" }))
                throw new HelloJohnError(err.error_description || "Verifying OTP failed", err.error || "otp_verify_error", resp.status)
            }

            return resp.json()
        }
    }
}

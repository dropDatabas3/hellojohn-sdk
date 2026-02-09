/**
 * MFA (Multi-Factor Authentication) methods for HelloJohn JS SDK.
 * Covers TOTP enrollment, verification, challenge, disable, and recovery codes.
 */

import type { TokenResponse } from "./types"
import { parseAPIError, NetworkError } from "./errors"

export interface MFAEnrollResult {
  secret: string
  qr_uri: string
  recovery_codes: string[]
}

export interface MFAChallengeResult {
  challenge_id: string
}

export interface MFARecoveryResult {
  codes: string[]
}

export interface MFAClient {
  /** Enroll a new TOTP device. Returns secret, QR URI, and recovery codes. */
  enrollTOTP(): Promise<MFAEnrollResult>

  /** Verify TOTP code during enrollment (activates MFA). */
  verifyTOTP(code: string): Promise<{ success: boolean }>

  /** Initiate a TOTP challenge (during login). Returns challenge_id. */
  challengeTOTP(): Promise<MFAChallengeResult>

  /** Solve a TOTP challenge with a code. Returns new tokens. */
  solveTOTP(challengeId: string, code: string): Promise<TokenResponse>

  /** Disable TOTP MFA. Requires a valid TOTP code. */
  disableTOTP(code: string): Promise<void>

  /** Rotate recovery codes. Returns new set of codes. */
  rotateRecoveryCodes(): Promise<MFARecoveryResult>
}

export function createMFAClient(
  domain: string,
  getAccessToken: () => Promise<string>,
): MFAClient {
  async function authedFetch(path: string, body?: object): Promise<Response> {
    const token = await getAccessToken()
    let resp: Response
    try {
      resp = await fetch(`${domain}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      })
    } catch {
      throw new NetworkError()
    }

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}))
      throw parseAPIError(resp.status, errBody)
    }

    return resp
  }

  return {
    async enrollTOTP() {
      const resp = await authedFetch("/v2/mfa/totp/enroll")
      return resp.json()
    },

    async verifyTOTP(code: string) {
      const resp = await authedFetch("/v2/mfa/totp/verify", { code })
      return resp.json()
    },

    async challengeTOTP() {
      const resp = await authedFetch("/v2/mfa/totp/challenge")
      return resp.json()
    },

    async solveTOTP(challengeId: string, code: string) {
      const resp = await authedFetch("/v2/mfa/totp/challenge", {
        challenge_id: challengeId,
        code,
      })
      return resp.json()
    },

    async disableTOTP(code: string) {
      await authedFetch("/v2/mfa/totp/disable", { code })
    },

    async rotateRecoveryCodes() {
      const resp = await authedFetch("/v2/mfa/recovery/rotate")
      return resp.json()
    },
  }
}

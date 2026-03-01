/**
 * MFA (Multi-Factor Authentication) methods for HelloJohn JS SDK.
 * Covers TOTP enrollment, verification and login challenge flows (TOTP/SMS/Email).
 */

import type { MFAMethod, MFAMethodType, TokenResponse } from "./types"
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

export interface MFASendChallengeResult {
  sent: boolean
  expiresIn: number
}

export interface MFAChallengeState {
  mfaToken: string
  availableFactors: MFAMethodType[]
  preferredFactor?: MFAMethodType
  activeMethod: MFAMethod | null
}

interface MFAChallengeContext {
  mfaToken: string
  availableFactors: MFAMethodType[]
  preferredFactor?: MFAMethodType
  activeMethod: MFAMethodType | null
}

export interface MFAClient {
  /** Enroll a new TOTP device. Returns secret, QR URI, and recovery codes. */
  enrollTOTP(): Promise<MFAEnrollResult>

  /** Verify TOTP code during enrollment (activates MFA). */
  verifyTOTP(code: string): Promise<{ success: boolean }>

  /** Select TOTP as active challenge method. */
  challengeTOTP(): Promise<MFAChallengeResult>

  /** Backward-compatible helper for old flows. */
  solveTOTP(challengeId: string, code: string): Promise<TokenResponse>

  /** Disable TOTP MFA. Requires a valid TOTP code. */
  disableTOTP(code: string): Promise<void>

  /** Rotate recovery codes. Returns new set of codes. */
  rotateRecoveryCodes(): Promise<MFARecoveryResult>

  /** List available MFA methods for current challenge or authenticated user. */
  listMethods(): Promise<MFAMethod[]>

  /** Send SMS one-time code for the active challenge token. */
  challengeSMS(): Promise<MFASendChallengeResult>

  /** Send email one-time code for the active challenge token. */
  challengeEmail(): Promise<MFASendChallengeResult>

  /** Submit a challenge code for the active MFA method. */
  submitChallenge(code: string, options?: { rememberDevice?: boolean; recovery?: string }): Promise<TokenResponse>

  /** Set active MFA challenge context received from login response. */
  setChallenge(mfaToken: string, availableFactors?: MFAMethodType[], preferredFactor?: MFAMethodType): void

  /** Get active MFA challenge state. */
  getChallengeState(): MFAChallengeState | null

  /** Clear active MFA challenge context. */
  clearChallenge(): void
}

interface CreateMFAClientDeps {
  getAccessToken: () => Promise<string>
  onTokens?: (tokens: TokenResponse) => void
}

function toFactorType(value: unknown): MFAMethodType | null {
  if (value !== "totp" && value !== "sms" && value !== "email") {
    return null
  }
  return value
}

function methodLabel(type: MFAMethodType): string {
  if (type === "totp") return "Authenticator App"
  if (type === "sms") return "SMS"
  return "Email"
}

function toMethod(type: MFAMethodType, hint?: string): MFAMethod {
  return { type, label: methodLabel(type), hint }
}

function uniqueFactorList(factors: MFAMethodType[]): MFAMethodType[] {
  return Array.from(new Set(factors))
}

export function createMFAClient(
  domain: string,
  depsOrGetAccessToken: CreateMFAClientDeps | (() => Promise<string>),
): MFAClient {
  const deps: CreateMFAClientDeps =
    typeof depsOrGetAccessToken === "function"
      ? { getAccessToken: depsOrGetAccessToken }
      : depsOrGetAccessToken

  let challengeContext: MFAChallengeContext | null = null

  function ensureChallengeContext(): MFAChallengeContext {
    if (!challengeContext || !challengeContext.mfaToken) {
      throw new Error("No active MFA challenge token")
    }
    return challengeContext
  }

  function setActiveMethod(method: MFAMethodType): MFAChallengeContext {
    const context = ensureChallengeContext()
    challengeContext = { ...context, activeMethod: method }
    return challengeContext
  }

  async function challengePost(path: string, body: Record<string, unknown>): Promise<Response> {
    let resp: Response
    try {
      resp = await fetch(`${domain}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  async function authedFetch(path: string, body?: object): Promise<Response> {
    const token = await deps.getAccessToken()
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

  async function authedGet(path: string): Promise<Response> {
    const token = await deps.getAccessToken()
    let resp: Response
    try {
      resp = await fetch(`${domain}${path}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
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

  function readSendChallengeResult(payload: unknown): MFASendChallengeResult {
    if (typeof payload !== "object" || payload === null) {
      return { sent: true, expiresIn: 0 }
    }

    const raw = payload as { sent?: unknown; expires_in?: unknown }
    const expiresIn = typeof raw.expires_in === "number" ? raw.expires_in : 0

    return {
      sent: typeof raw.sent === "boolean" ? raw.sent : true,
      expiresIn,
    }
  }

  return {
    setChallenge(mfaToken: string, availableFactors: MFAMethodType[] = [], preferredFactor?: MFAMethodType) {
      challengeContext = {
        mfaToken,
        availableFactors: uniqueFactorList(availableFactors),
        preferredFactor,
        activeMethod: null,
      }
    },

    getChallengeState() {
      if (!challengeContext) return null
      return {
        mfaToken: challengeContext.mfaToken,
        availableFactors: challengeContext.availableFactors,
        preferredFactor: challengeContext.preferredFactor,
        activeMethod: challengeContext.activeMethod ? toMethod(challengeContext.activeMethod) : null,
      }
    },

    clearChallenge() {
      challengeContext = null
    },

    async enrollTOTP() {
      const resp = await authedFetch("/v2/mfa/totp/enroll")
      const body = await resp.json()
      // Backward-compatible payload for existing SDK consumers.
      if (typeof body?.secret_base32 === "string" || typeof body?.otpauth_url === "string") {
        return {
          secret: typeof body.secret_base32 === "string" ? body.secret_base32 : "",
          qr_uri: typeof body.otpauth_url === "string" ? body.otpauth_url : "",
          recovery_codes: Array.isArray(body.recovery_codes) ? body.recovery_codes : [],
        }
      }
      return body
    },

    async verifyTOTP(code: string) {
      const resp = await authedFetch("/v2/mfa/totp/verify", { code })
      return resp.json()
    },

    async challengeTOTP() {
      const context = setActiveMethod("totp")
      return { challenge_id: context.mfaToken }
    },

    async challengeSMS() {
      const context = setActiveMethod("sms")
      const resp = await challengePost("/v2/mfa/sms/send", { mfa_token: context.mfaToken })
      const payload = await resp.json().catch(() => ({}))
      return readSendChallengeResult(payload)
    },

    async challengeEmail() {
      const context = setActiveMethod("email")
      const resp = await challengePost("/v2/mfa/email/send", { mfa_token: context.mfaToken })
      const payload = await resp.json().catch(() => ({}))
      return readSendChallengeResult(payload)
    },

    async submitChallenge(code: string, options?: { rememberDevice?: boolean; recovery?: string }) {
      const context = ensureChallengeContext()
      const method = context.activeMethod || context.preferredFactor || "totp"
      const normalizedCode = code.trim()
      if (!normalizedCode && !options?.recovery) {
        throw new Error("MFA code is required")
      }

      const path =
        method === "totp"
          ? "/v2/mfa/totp/challenge"
          : method === "sms"
            ? "/v2/mfa/sms/challenge"
            : "/v2/mfa/email/challenge"

      const body: Record<string, unknown> = {
        mfa_token: context.mfaToken,
      }

      if (normalizedCode) {
        body.code = normalizedCode
      }
      if (options?.rememberDevice) {
        body.remember_device = true
      }
      if (method === "totp" && options?.recovery) {
        body.recovery = options.recovery
      }

      const resp = await challengePost(path, body)
      const tokenData = (await resp.json()) as TokenResponse

      deps.onTokens?.(tokenData)
      challengeContext = null
      return tokenData
    },

    async solveTOTP(challengeId: string, code: string) {
      const existingFactors = challengeContext?.availableFactors ?? ["totp"]
      const preferredFactor = challengeContext?.preferredFactor
      challengeContext = {
        mfaToken: challengeId,
        availableFactors: uniqueFactorList(existingFactors),
        preferredFactor,
        activeMethod: "totp",
      }
      return this.submitChallenge(code)
    },

    async disableTOTP(code: string) {
      await authedFetch("/v2/mfa/totp/disable", { code })
    },

    async rotateRecoveryCodes() {
      const resp = await authedFetch("/v2/mfa/recovery/rotate")
      return resp.json()
    },

    async listMethods() {
      if (challengeContext?.availableFactors.length) {
        return challengeContext.availableFactors.map((factor) => toMethod(factor))
      }

      const resp = await authedGet("/v2/mfa/factors")
      const payload = await resp.json().catch(() => ({}))

      const rawFactors =
        typeof payload === "object" && payload !== null && Array.isArray((payload as { available_factors?: unknown }).available_factors)
          ? (payload as { available_factors: unknown[] }).available_factors
          : []

      const factors = rawFactors
        .map((factor) => toFactorType(factor))
        .filter((factor): factor is MFAMethodType => factor !== null)

      if (factors.length === 0) {
        return [toMethod("totp")]
      }

      const preferredFactor =
        typeof (payload as { preferred_factor?: unknown }).preferred_factor === "string"
          ? toFactorType((payload as { preferred_factor: string }).preferred_factor)
          : null

      if (challengeContext) {
        challengeContext = {
          ...challengeContext,
          availableFactors: uniqueFactorList(factors),
          preferredFactor: preferredFactor || challengeContext.preferredFactor,
        }
      }

      return factors.map((factor) => toMethod(factor))
    },
  }
}

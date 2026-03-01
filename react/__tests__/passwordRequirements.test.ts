import { describe, expect, it } from "vitest"
import {
  DEFAULT_PASSWORD_POLICY,
  evaluatePasswordPolicy,
  hasVisiblePasswordRequirements,
} from "../src/components/PasswordRequirements"

describe("evaluatePasswordPolicy", () => {
  it("fails default policy for weak password", () => {
    const rules = evaluatePasswordPolicy("abc", "user@example.com", "John Doe", DEFAULT_PASSWORD_POLICY)
    expect(rules.some((rule) => rule.ok === false)).toBe(true)
  })

  it("passes default policy for strong password without personal info", () => {
    const rules = evaluatePasswordPolicy("StrongPass123", "user@example.com", "John Doe", DEFAULT_PASSWORD_POLICY)
    expect(rules.every((rule) => rule.ok)).toBe(true)
  })

  it("enforces personal info rule when enabled", () => {
    const rules = evaluatePasswordPolicy(
      "john123ABC",
      "john@example.com",
      "John Doe",
      { ...DEFAULT_PASSWORD_POLICY, personal_info: true },
    )
    const personalRule = rules.find((rule) => rule.id === "personal_info")
    expect(personalRule?.ok).toBe(false)
    expect(personalRule?.visible).toBe(false)
  })

  it("respects tenant policy flags when complexity requirements are disabled", () => {
    const relaxedPolicy = {
      ...DEFAULT_PASSWORD_POLICY,
      require_uppercase: false,
      require_numbers: false,
      personal_info: false,
    }
    const rules = evaluatePasswordPolicy("lowercasepass", "user@example.com", "John Doe", relaxedPolicy)
    expect(rules.every((rule) => rule.ok)).toBe(true)
  })

  it("detects when there are no visible requirements", () => {
    const emptyPolicy = {
      ...DEFAULT_PASSWORD_POLICY,
      min_length: 0,
      require_lowercase: false,
      require_numbers: false,
    }
    expect(hasVisiblePasswordRequirements(emptyPolicy)).toBe(false)
  })
})

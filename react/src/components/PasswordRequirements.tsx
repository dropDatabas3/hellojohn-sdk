import React from "react";
import { PasswordPolicy } from "@hellojohn/js";
import { Theme, getTheme } from "../lib/themes";

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
    configured: false,
    min_length: 8,
    max_length: 128,
    require_uppercase: false,
    require_lowercase: true,
    require_numbers: true,
    require_symbols: false,
    max_history: 0,
    breach_detection: false,
    common_password: false,
    personal_info: false,
};

export type PasswordRequirement = {
    id: string;
    label: string;
    ok: boolean;
    visible: boolean;
};

export function hasVisiblePasswordRequirements(policy: PasswordPolicy): boolean {
    return policy.min_length > 0 ||
        policy.require_uppercase ||
        policy.require_lowercase ||
        policy.require_numbers ||
        policy.require_symbols;
}

function hasForbiddenPersonalInfo(password: string, email: string, name: string): boolean {
    const normalizedPassword = password.toLowerCase();
    if (!normalizedPassword) return false;

    const emailLocalPart = (email || "").toLowerCase().split("@")[0] || "";
    const nameTokens = (name || "")
        .toLowerCase()
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3);

    if (emailLocalPart.length >= 3 && normalizedPassword.includes(emailLocalPart)) {
        return true;
    }

    return nameTokens.some((token) => normalizedPassword.includes(token));
}


export function evaluatePasswordPolicy(
    password: string,
    email: string,
    name: string,
    policy: PasswordPolicy,
): PasswordRequirement[] {
    const rules: PasswordRequirement[] = [];

    if (policy.min_length > 0) {
        rules.push({
            id: "min_length",
            label: `At least ${policy.min_length} characters`,
            ok: password.length >= policy.min_length,
            visible: true,
        });
    }

    if (policy.max_length > 0) {
        rules.push({
            id: "max_length",
            label: `Maximum ${policy.max_length} characters`,
            ok: password.length <= policy.max_length,
            visible: false,
        });
    }

    if (policy.require_uppercase) {
        rules.push({
            id: "upper",
            label: "At least one uppercase letter",
            ok: /[A-Z]/.test(password),
            visible: true,
        });
    }

    if (policy.require_lowercase) {
        rules.push({
            id: "lower",
            label: "At least one lowercase letter",
            ok: /[a-z]/.test(password),
            visible: true,
        });
    }

    if (policy.require_numbers) {
        rules.push({
            id: "number",
            label: "At least one number",
            ok: /[0-9]/.test(password),
            visible: true,
        });
    }

    if (policy.require_symbols) {
        rules.push({
            id: "symbol",
            label: "At least one symbol",
            ok: /[^A-Za-z0-9]/.test(password),
            visible: true,
        });
    }

    if (policy.personal_info) {
        rules.push({
            id: "personal_info",
            label: "Do not include your email or name in the password",
            ok: !hasForbiddenPersonalInfo(password, email, name),
            visible: false,
        });
    }

    return rules;
}

export interface PasswordRequirementsProps {
    password: string;
    email?: string;
    name?: string;
    policy?: PasswordPolicy;
    theme?: Theme;
    borderRadius?: string;
    title?: string;
    isVisible?: boolean; // New prop for progressive disclosure
}

function RequirementIcon({ ok }: { ok: boolean }) {
    if (ok) {
        return (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                    d="M20 6L9 17L4 12"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        );
    }

    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M12 8V12M12 16H12.01M10.29 3.86L1.82 18A2 2 0 0 0 3.53 21H20.47A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function PasswordRequirements({
    password,
    email = "",
    name = "",
    policy = DEFAULT_PASSWORD_POLICY,
    theme = getTheme("minimal"),
    borderRadius = "8px",
    title = "Password policy",
    isVisible = true, // Default to true if not specified
}: PasswordRequirementsProps) {
    const rules = evaluatePasswordPolicy(password, email, name, policy);
    const visibleRules = rules.filter((rule) => rule.visible);

    if (visibleRules.length === 0) {
        return null;
    }

    return (
        <div
            style={{
                border: `1px solid ${theme.colors.inputBorder}`,
                background: theme.isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(15, 23, 42, 0.02)",
                borderRadius: `calc(${borderRadius} - 2px)`,
                padding: isVisible ? "10px 12px" : "0 12px",
                marginBottom: "14px",
                maxHeight: isVisible ? "300px" : "0",
                opacity: isVisible ? 1 : 0,
                overflow: "hidden",
                transition: "all 0.3s ease-in-out",
            }}
        >
            <p
                style={{
                    margin: "0 0 8px 0",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: theme.colors.textSecondary,
                }}
            >
                {title}
            </p>
            <div style={{ display: "grid", gap: "6px", paddingBottom: "10px" }}>
                {visibleRules.map((rule) => (
                    <div
                        key={rule.id}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "12px",
                            color: rule.ok ? theme.colors.success : theme.colors.textMuted,
                            transition: "color 0.2s ease-in-out",
                        }}
                    >
                        <RequirementIcon ok={rule.ok} />
                        <span>{rule.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}




import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context";
import { useI18n } from "../i18n";
import { ThemeName, getTheme } from "../lib/themes";

export interface MFAChallengeProps {
    /** The challenge ID returned by the MFA challenge step */
    challengeId: string;
    /** Called with the token set on successful verification */
    onSuccess?: (tokens: any) => void;
    /** Called on failure */
    onError?: (error: Error) => void;
    /** Theme name */
    theme?: ThemeName;
    /** Custom style overrides */
    customStyles?: {
        primaryColor?: string;
        borderRadius?: string;
    };
}

/**
 * MFAChallenge renders a code input for TOTP verification during login.
 *
 * @example
 * <MFAChallenge
 *   challengeId={challengeId}
 *   onSuccess={(tokens) => { ... }}
 * />
 */
export function MFAChallenge({
    challengeId,
    onSuccess,
    onError,
    theme: themeName = "minimal",
    customStyles,
}: MFAChallengeProps) {
    const { client, config } = useAuth();
    const i18n = useI18n();
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [systemDark, setSystemDark] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setSystemDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
        }
        inputRef.current?.focus();
    }, []);

    const resolvedThemeName = themeName === "auto" ? (systemDark ? "midnight" : "minimal") : themeName;
    const theme = getTheme(resolvedThemeName as Exclude<ThemeName, "auto">);
    const primaryColor = customStyles?.primaryColor || config?.primary_color || theme.colors.accent;
    const borderRadius = customStyles?.borderRadius || theme.styles.borderRadius;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!client || !code.trim()) return;

        setError("");
        setSubmitting(true);
        try {
            const tokens = await client.mfa.solveTOTP(challengeId, code.trim());
            onSuccess?.(tokens);
        } catch (err: any) {
            const msg = err.message || i18n.errors.mfaInvalidCode;
            setError(msg);
            onError?.(err);
        } finally {
            setSubmitting(false);
        }
    };

    // Auto-submit when 6 digits entered
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, "").slice(0, 6);
        setCode(val);
    };

    const cardStyle: React.CSSProperties = {
        width: "100%",
        maxWidth: "380px",
        margin: "0 auto",
        padding: "32px",
        background: theme.colors.cardBackground,
        border: `1px solid ${theme.colors.cardBorder}`,
        borderRadius,
        boxShadow: theme.styles.cardShadow,
        fontFamily: theme.styles.fontFamily,
    };

    return (
        <div style={cardStyle}>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <div style={{
                    width: "56px", height: "56px", margin: "0 auto 16px",
                    borderRadius: "50%", background: `${primaryColor}15`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke={primaryColor} strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                </div>
                <h2 style={{ fontSize: "20px", fontWeight: 700, color: theme.colors.textPrimary, margin: 0 }}>
                    {i18n.mfa.challengeTitle}
                </h2>
                <p style={{ fontSize: "14px", color: theme.colors.textMuted, marginTop: "6px" }}>
                    {i18n.mfa.challengeSubtitle}
                </p>
            </div>

            {/* Error */}
            {error && (
                <div style={{
                    padding: "10px 14px", marginBottom: "16px", fontSize: "14px",
                    color: theme.colors.error, background: theme.colors.errorBackground,
                    border: `1px solid ${theme.colors.errorBorder}`,
                    borderRadius: `calc(${borderRadius} - 4px)`,
                }}>
                    {error}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: theme.colors.textPrimary, marginBottom: "8px" }}>
                        {i18n.mfa.codeLabel}
                    </label>
                    <input
                        ref={inputRef}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={code}
                        onChange={handleChange}
                        placeholder={i18n.mfa.codePlaceholder}
                        maxLength={6}
                        style={{
                            display: "block",
                            width: "100%",
                            height: "52px",
                            textAlign: "center",
                            fontSize: "24px",
                            fontWeight: 600,
                            letterSpacing: "0.5em",
                            borderRadius: `calc(${borderRadius} - 4px)`,
                            border: `1.5px solid ${theme.colors.inputBorder}`,
                            background: theme.colors.inputBackground,
                            color: theme.colors.inputText,
                            outline: "none",
                            transition: "border-color 0.2s ease",
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = primaryColor}
                        onBlur={(e) => e.currentTarget.style.borderColor = theme.colors.inputBorder}
                    />
                </div>

                <button
                    type="submit"
                    disabled={submitting || code.length < 6}
                    style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        width: "100%", height: "46px",
                        borderRadius: `calc(${borderRadius} - 2px)`,
                        border: "none", background: theme.colors.buttonPrimary, color: theme.colors.buttonPrimaryText,
                        fontSize: "15px", fontWeight: 600,
                        cursor: submitting || code.length < 6 ? "not-allowed" : "pointer",
                        opacity: submitting || code.length < 6 ? 0.6 : 1,
                        transition: "all 0.2s ease",
                    }}
                >
                    {submitting ? i18n.mfa.verifying : i18n.mfa.submitButton}
                </button>
            </form>
        </div>
    );
}

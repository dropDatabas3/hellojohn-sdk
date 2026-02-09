import React, { useState, useEffect } from "react";
import { useAuth } from "../context";
import { useI18n } from "../i18n";
import { ThemeName, getTheme } from "../lib/themes";

export interface MFASetupProps {
    /** Called when MFA setup is complete */
    onComplete?: () => void;
    /** Called when user cancels */
    onCancel?: () => void;
    /** Theme name */
    theme?: ThemeName;
    /** Custom style overrides */
    customStyles?: {
        primaryColor?: string;
        borderRadius?: string;
    };
}

/**
 * MFASetup walks the user through TOTP enrollment:
 * 1. QR code + manual secret display
 * 2. Code verification
 * 3. Recovery codes display
 *
 * @example
 * <MFASetup onComplete={() => alert('MFA enabled!')} />
 */
export function MFASetup({
    onComplete,
    onCancel,
    theme: themeName = "minimal",
    customStyles,
}: MFASetupProps) {
    const { client, config } = useAuth();
    const i18n = useI18n();
    const [step, setStep] = useState<"enroll" | "verify" | "recovery">("enroll");
    const [secret, setSecret] = useState("");
    const [qrUri, setQrUri] = useState("");
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [systemDark, setSystemDark] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setSystemDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
        }
    }, []);

    const resolvedThemeName = themeName === "auto" ? (systemDark ? "midnight" : "minimal") : themeName;
    const theme = getTheme(resolvedThemeName as Exclude<ThemeName, "auto">);
    const primaryColor = customStyles?.primaryColor || config?.primary_color || theme.colors.accent;
    const borderRadius = customStyles?.borderRadius || theme.styles.borderRadius;

    // Enroll on mount
    useEffect(() => {
        if (!client) return;
        (async () => {
            try {
                const result = await client.mfa.enrollTOTP();
                setSecret(result.secret);
                setQrUri(result.qr_uri);
                if (result.recovery_codes) setRecoveryCodes(result.recovery_codes);
            } catch (err: any) {
                setError(err.message || "Failed to enroll MFA");
            } finally {
                setLoading(false);
            }
        })();
    }, [client]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!client || !code.trim()) return;

        setError("");
        setSubmitting(true);
        try {
            await client.mfa.verifyTOTP(code.trim());
            if (recoveryCodes.length > 0) {
                setStep("recovery");
            } else {
                onComplete?.();
            }
        } catch (err: any) {
            setError(err.message || i18n.errors.mfaInvalidCode);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(recoveryCodes.join("\n"));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const cardStyle: React.CSSProperties = {
        width: "100%",
        maxWidth: "420px",
        margin: "0 auto",
        padding: "32px",
        background: theme.colors.cardBackground,
        border: `1px solid ${theme.colors.cardBorder}`,
        borderRadius,
        boxShadow: theme.styles.cardShadow,
        fontFamily: theme.styles.fontFamily,
    };

    const buttonStyle: React.CSSProperties = {
        display: "flex", alignItems: "center", justifyContent: "center",
        width: "100%", height: "46px",
        borderRadius: `calc(${borderRadius} - 2px)`,
        border: "none", background: theme.colors.buttonPrimary, color: theme.colors.buttonPrimaryText,
        fontSize: "15px", fontWeight: 600,
        cursor: "pointer", transition: "all 0.2s ease",
    };

    const secondaryButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        background: "transparent",
        color: theme.colors.textSecondary,
        border: `1.5px solid ${theme.colors.inputBorder}`,
    };

    if (loading) {
        return (
            <div style={cardStyle}>
                <div style={{ textAlign: "center", color: theme.colors.textMuted, padding: "20px 0" }}>
                    {i18n.common.loading}
                </div>
            </div>
        );
    }

    // Step 1: Show QR + secret
    if (step === "enroll") {
        return (
            <div style={cardStyle}>
                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                    <h2 style={{ fontSize: "20px", fontWeight: 700, color: theme.colors.textPrimary, margin: "0 0 6px 0" }}>
                        {i18n.mfa.setupTitle}
                    </h2>
                    <p style={{ fontSize: "14px", color: theme.colors.textMuted, margin: 0 }}>
                        {i18n.mfa.setupSubtitle}
                    </p>
                </div>

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

                {/* QR Code */}
                {qrUri && (
                    <div style={{ textAlign: "center", marginBottom: "20px" }}>
                        <p style={{ fontSize: "14px", fontWeight: 500, color: theme.colors.textPrimary, marginBottom: "12px" }}>
                            {i18n.mfa.scanQRCode}
                        </p>
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUri)}`}
                            alt="QR Code"
                            style={{ width: "200px", height: "200px", borderRadius: "8px", border: `1px solid ${theme.colors.inputBorder}` }}
                        />
                    </div>
                )}

                {/* Manual entry */}
                {secret && (
                    <div style={{ marginBottom: "24px" }}>
                        <p style={{ fontSize: "13px", color: theme.colors.textMuted, marginBottom: "8px" }}>
                            {i18n.mfa.manualEntry}
                        </p>
                        <div style={{
                            padding: "10px 14px",
                            background: theme.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                            borderRadius: `calc(${borderRadius} - 4px)`,
                            fontFamily: "monospace",
                            fontSize: "14px",
                            fontWeight: 600,
                            color: theme.colors.textPrimary,
                            wordBreak: "break-all",
                            textAlign: "center",
                            letterSpacing: "0.05em",
                        }}>
                            {secret}
                        </div>
                    </div>
                )}

                <div style={{ display: "flex", gap: "12px" }}>
                    {onCancel && (
                        <button onClick={onCancel} style={{ ...secondaryButtonStyle, flex: 1 }}>
                            {i18n.mfa.cancelButton}
                        </button>
                    )}
                    <button onClick={() => setStep("verify")} style={{ ...buttonStyle, flex: onCancel ? 2 : 1 }}>
                        {i18n.signUp.continueButton} →
                    </button>
                </div>
            </div>
        );
    }

    // Step 2: Verify code
    if (step === "verify") {
        return (
            <div style={cardStyle}>
                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                    <h2 style={{ fontSize: "20px", fontWeight: 700, color: theme.colors.textPrimary, margin: "0 0 6px 0" }}>
                        {i18n.mfa.verifyButton}
                    </h2>
                    <p style={{ fontSize: "14px", color: theme.colors.textMuted, margin: 0 }}>
                        {i18n.mfa.challengeSubtitle}
                    </p>
                </div>

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

                <form onSubmit={handleVerify}>
                    <div style={{ marginBottom: "20px" }}>
                        <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: theme.colors.textPrimary, marginBottom: "8px" }}>
                            {i18n.mfa.codeLabel}
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            placeholder={i18n.mfa.codePlaceholder}
                            maxLength={6}
                            autoFocus
                            style={{
                                display: "block", width: "100%", height: "52px",
                                textAlign: "center", fontSize: "24px", fontWeight: 600,
                                letterSpacing: "0.5em",
                                borderRadius: `calc(${borderRadius} - 4px)`,
                                border: `1.5px solid ${theme.colors.inputBorder}`,
                                background: theme.colors.inputBackground,
                                color: theme.colors.inputText,
                                outline: "none",
                            }}
                        />
                    </div>

                    <div style={{ display: "flex", gap: "12px" }}>
                        <button type="button" onClick={() => { setStep("enroll"); setError(""); setCode(""); }} style={{ ...secondaryButtonStyle, flex: 1 }}>
                            ← {i18n.signUp.backButton}
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || code.length < 6}
                            style={{
                                ...buttonStyle, flex: 2,
                                cursor: submitting || code.length < 6 ? "not-allowed" : "pointer",
                                opacity: submitting || code.length < 6 ? 0.6 : 1,
                            }}
                        >
                            {submitting ? i18n.mfa.verifying : i18n.mfa.verifyButton}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    // Step 3: Recovery codes
    return (
        <div style={cardStyle}>
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <div style={{
                    width: "56px", height: "56px", margin: "0 auto 16px",
                    borderRadius: "50%", background: "rgba(34, 197, 94, 0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                </div>
                <h2 style={{ fontSize: "20px", fontWeight: 700, color: theme.colors.textPrimary, margin: "0 0 6px 0" }}>
                    {i18n.mfa.recoveryCodesTitle}
                </h2>
                <p style={{ fontSize: "14px", color: theme.colors.textMuted, margin: 0 }}>
                    {i18n.mfa.recoveryCodesSubtitle}
                </p>
            </div>

            {/* Recovery codes grid */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                padding: "16px",
                marginBottom: "20px",
                background: theme.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                borderRadius: `calc(${borderRadius} - 4px)`,
            }}>
                {recoveryCodes.map((code, i) => (
                    <div key={i} style={{
                        fontFamily: "monospace",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: theme.colors.textPrimary,
                        padding: "6px 10px",
                        background: theme.colors.inputBackground,
                        borderRadius: "4px",
                        textAlign: "center",
                    }}>
                        {code}
                    </div>
                ))}
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
                <button onClick={handleCopy} style={{ ...secondaryButtonStyle, flex: 1 }}>
                    {copied ? i18n.mfa.copied : i18n.mfa.copyButton}
                </button>
                <button onClick={() => onComplete?.()} style={{ ...buttonStyle, flex: 1 }}>
                    {i18n.mfa.doneButton}
                </button>
            </div>
        </div>
    );
}

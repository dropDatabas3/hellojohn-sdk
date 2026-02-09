import React, { useState, useEffect } from "react";
import { useAuth } from "../context";
import { useI18n, t } from "../i18n";
import { ThemeName, getTheme } from "../lib/themes";

export interface ResetPasswordProps {
    /** The reset token from the URL (required) */
    token: string;
    /** Called when password is reset successfully */
    onSuccess?: () => void;
    /** URL for sign in page (default: /login) */
    signInUrl?: string;
    /** Theme name: "midnight" | "ocean" | "sunrise" | "forest" | "honey" | "minimal" | "auto" */
    theme?: ThemeName;
    /** Background image URL */
    backgroundImage?: string;
    /** Background blur intensity (0-20, default: 4) */
    backgroundBlur?: number;
    /** Form position: "left" | "center" | "right" (default: center) */
    formPosition?: "left" | "center" | "right";
    /** Enable glassmorphism effect */
    glassmorphism?: boolean;
    /** Custom style overrides */
    customStyles?: {
        primaryColor?: string;
        borderRadius?: string;
    };
    /** Minimum password length (default: 6) */
    minPasswordLength?: number;
}

export function ResetPassword({
    token,
    onSuccess,
    signInUrl = "/login",
    theme: themeName = "minimal",
    backgroundImage,
    backgroundBlur = 4,
    formPosition = "center",
    glassmorphism = false,
    customStyles,
    minPasswordLength = 6,
}: ResetPasswordProps) {
    const { client, config } = useAuth();
    const i18n = useI18n();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [systemDark, setSystemDark] = useState(false);
    const [shake, setShake] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (typeof window !== "undefined") {
            setSystemDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
        }
    }, []);

    const resolvedThemeName = themeName === "auto" ? (systemDark ? "midnight" : "minimal") : themeName;
    const theme = getTheme(resolvedThemeName as Exclude<ThemeName, "auto">);
    const primaryColor = customStyles?.primaryColor || config?.primary_color || theme.colors.accent;
    const borderRadius = customStyles?.borderRadius || theme.styles.borderRadius;

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!password) {
            setError(i18n.resetPassword.passwordRequired);
            triggerShake();
            return;
        }

        if (password.length < minPasswordLength) {
            setError(t(i18n.resetPassword.passwordMinLength, { min: String(minPasswordLength) }));
            triggerShake();
            return;
        }

        if (password !== confirmPassword) {
            setError(i18n.resetPassword.passwordMismatch);
            triggerShake();
            return;
        }

        if (!client) {
            setError(i18n.errors.clientConfigError);
            triggerShake();
            return;
        }

        setSubmitting(true);
        try {
            await client.resetPassword(token, password);
            setSuccess(true);
            onSuccess?.();
        } catch (err: any) {
            setError(err.message || i18n.errors.resetError);
            triggerShake();
        } finally {
            setSubmitting(false);
        }
    };

    // Eye icon SVGs
    const EyeIcon = () => (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
    );
    const EyeOffIcon = () => (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
    );

    // Styles
    const justifyMap = { left: "flex-start", center: "center", right: "flex-end" };
    const overlayOpacity = backgroundBlur > 0 ? Math.min(backgroundBlur * 0.04, 0.65) : 0;

    const containerStyle: React.CSSProperties = {
        position: backgroundImage ? "fixed" : undefined,
        inset: backgroundImage ? 0 : undefined,
        width: "100%",
        minHeight: backgroundImage ? undefined : "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: justifyMap[formPosition],
        padding: backgroundImage ? (formPosition === "center" ? "20px" : "20px 60px") : "20px",
        background: backgroundImage ? undefined : (theme.colors.background.includes("gradient") ? theme.colors.background : undefined),
        fontFamily: theme.styles.fontFamily,
        zIndex: backgroundImage ? 9999 : undefined,
        overflow: "auto",
    };

    const bgStyle: React.CSSProperties = backgroundImage ? {
        position: "absolute", inset: 0,
        backgroundImage: `url(${backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center", zIndex: 0,
    } : {};

    const overlayStyle: React.CSSProperties = backgroundImage ? {
        position: "absolute", inset: 0,
        background: overlayOpacity > 0 ? (theme.isDark ? `rgba(0,0,0,${overlayOpacity})` : `rgba(255,255,255,${overlayOpacity})`) : "transparent",
        backdropFilter: backgroundBlur > 0 ? `blur(${backgroundBlur}px)` : undefined,
        WebkitBackdropFilter: backgroundBlur > 0 ? `blur(${backgroundBlur}px)` : undefined,
        zIndex: 1,
    } : {};

    const shakeKeyframes = `
        @keyframes hjShake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
            20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
    `;

    const cardStyle: React.CSSProperties = {
        position: "relative", zIndex: 2,
        width: "100%", maxWidth: "420px",
        padding: "32px",
        background: glassmorphism ? (theme.isDark ? "rgba(15, 15, 26, 0.8)" : "rgba(255, 255, 255, 0.85)") : theme.colors.cardBackground,
        backdropFilter: glassmorphism ? "blur(16px) saturate(180%)" : undefined,
        border: `1px solid ${theme.colors.cardBorder}`,
        borderRadius, boxShadow: theme.styles.cardShadow,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(10px)",
        transition: theme.styles.transition,
        animation: shake ? "hjShake 0.5s ease-in-out" : undefined,
    };

    const inputContainerStyle: React.CSSProperties = {
        position: "relative",
        display: "flex",
        alignItems: "center",
    };

    const inputStyle: React.CSSProperties = {
        display: "block",
        height: "48px",
        width: "100%",
        borderRadius: `calc(${borderRadius} - 4px)`,
        border: `1.5px solid ${theme.colors.inputBorder}`,
        background: theme.colors.inputBackground,
        color: theme.colors.inputText,
        padding: "0 48px 0 16px",
        fontSize: "15px",
        outline: "none",
        transition: "all 0.2s ease",
    };

    const eyeButtonStyle: React.CSSProperties = {
        position: "absolute",
        right: "12px",
        background: "none",
        border: "none",
        cursor: "pointer",
        color: theme.colors.textMuted,
        padding: "4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    };

    const buttonStyle: React.CSSProperties = {
        display: "flex", alignItems: "center", justifyContent: "center",
        width: "100%", height: "48px",
        borderRadius: `calc(${borderRadius} - 2px)`,
        border: "none", background: theme.colors.buttonPrimary, color: theme.colors.buttonPrimaryText,
        fontSize: "15px", fontWeight: 600,
        cursor: submitting ? "not-allowed" : "pointer",
        opacity: submitting ? 0.7 : 1,
        transition: "all 0.2s ease",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    };

    const labelStyle: React.CSSProperties = {
        display: "block",
        fontSize: "14px",
        fontWeight: 500,
        color: theme.colors.textPrimary,
        marginBottom: "8px",
    };

    if (!token) {
        return (
            <div style={containerStyle}>
                {backgroundImage && <><div style={bgStyle} /><div style={overlayStyle} /></>}
                <div style={cardStyle}>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ width: "64px", height: "64px", margin: "0 auto 20px", borderRadius: "50%", background: "rgba(239, 68, 68, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 style={{ fontSize: "22px", fontWeight: 700, color: theme.colors.textPrimary, marginBottom: "12px" }}>{i18n.resetPassword.invalidTokenTitle}</h2>
                        <p style={{ fontSize: "15px", color: theme.colors.textMuted, marginBottom: "24px", lineHeight: 1.5 }}>
                            {i18n.resetPassword.invalidTokenMessage}
                        </p>
                        <a href="/forgot-password" style={{ ...buttonStyle, textDecoration: "none", display: "inline-flex", width: "auto", padding: "0 32px" }}>
                            {i18n.resetPassword.invalidTokenAction}
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div style={containerStyle}>
                {backgroundImage && <><div style={bgStyle} /><div style={overlayStyle} /></>}
                <div style={cardStyle}>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ width: "64px", height: "64px", margin: "0 auto 20px", borderRadius: "50%", background: "rgba(34, 197, 94, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 style={{ fontSize: "22px", fontWeight: 700, color: theme.colors.textPrimary, marginBottom: "12px" }}>{i18n.resetPassword.successTitle}</h2>
                        <p style={{ fontSize: "15px", color: theme.colors.textMuted, marginBottom: "24px", lineHeight: 1.5 }}>
                            {i18n.resetPassword.successMessage}
                        </p>
                        <a href={signInUrl} style={{ ...buttonStyle, textDecoration: "none", display: "inline-flex", width: "auto", padding: "0 32px" }}>
                            {i18n.resetPassword.successAction}
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            <style>{shakeKeyframes}</style>
            {backgroundImage && <><div style={bgStyle} /><div style={overlayStyle} /></>}
            <div style={cardStyle}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "24px" }}>
                    {config?.logo_url && (
                        <img src={config.logo_url} alt="" style={{ height: "40px", flexShrink: 0 }} onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                    )}
                    <div>
                        <h1 style={{ fontSize: "22px", fontWeight: 700, color: theme.colors.textPrimary, margin: 0 }}>
                            {i18n.resetPassword.title}
                        </h1>
                        <p style={{ fontSize: "14px", color: theme.colors.textMuted, margin: "4px 0 0 0" }}>
                            {i18n.resetPassword.subtitle}
                        </p>
                    </div>
                </div>

                {/* Error message */}
                {error && (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", marginBottom: "20px", fontSize: "14px", color: "#dc2626", background: "rgba(220, 38, 38, 0.08)", border: "1px solid rgba(220, 38, 38, 0.2)", borderRadius: `calc(${borderRadius} - 4px)` }}>
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: "16px" }}>
                        <label style={labelStyle}>{i18n.resetPassword.newPasswordLabel}</label>
                        <div style={inputContainerStyle}>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={i18n.resetPassword.newPasswordPlaceholder}
                                style={inputStyle}
                                required
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeButtonStyle} title={showPassword ? i18n.common.hide : i18n.common.show}>
                                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                        </div>
                    </div>

                    <div style={{ marginBottom: "24px" }}>
                        <label style={labelStyle}>{i18n.resetPassword.confirmPasswordLabel}</label>
                        <div style={inputContainerStyle}>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder={i18n.resetPassword.confirmPasswordPlaceholder}
                                style={inputStyle}
                                required
                            />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={eyeButtonStyle} title={showConfirmPassword ? i18n.common.hide : i18n.common.show}>
                                {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" disabled={submitting} style={buttonStyle}>
                        {submitting ? (
                            <>
                                <svg style={{ marginRight: "8px", animation: "spin 1s linear infinite" }} width="18" height="18" fill="none" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="60" strokeDashoffset="20" />
                                </svg>
                                {i18n.resetPassword.submitting}
                            </>
                        ) : (
                            i18n.resetPassword.submitButton
                        )}
                    </button>
                </form>

                <p style={{ textAlign: "center", marginTop: "24px", marginBottom: 0, fontSize: "14px", color: theme.colors.textSecondary }}>
                    {i18n.resetPassword.rememberedPassword} <a href={signInUrl} style={{ color: theme.colors.link, fontWeight: 600, textDecoration: "none" }}>{i18n.resetPassword.signInLink}</a>
                </p>
            </div>
        </div>
    );
}

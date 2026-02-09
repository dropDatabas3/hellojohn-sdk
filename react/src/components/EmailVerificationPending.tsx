import React, { useState, useEffect } from "react";
import { useAuth } from "../context";
import { useI18n, t } from "../i18n";
import { ThemeName, getTheme } from "../lib/themes";

export interface EmailVerificationPendingProps {
    /** Email address that was registered */
    email?: string;
    /** Called when resend email is successful */
    onResendSuccess?: () => void;
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
}

export function EmailVerificationPending({
    email,
    onResendSuccess,
    signInUrl = "/login",
    theme: themeName = "minimal",
    backgroundImage,
    backgroundBlur = 4,
    formPosition = "center",
    glassmorphism = false,
    customStyles,
}: EmailVerificationPendingProps) {
    const { client, config } = useAuth();
    const i18n = useI18n();
    const [error, setError] = useState("");
    const [resending, setResending] = useState(false);
    const [resent, setResent] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [systemDark, setSystemDark] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        setMounted(true);
        if (typeof window !== "undefined") {
            setSystemDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
        }
    }, []);

    // Cooldown timer
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const resolvedThemeName = themeName === "auto" ? (systemDark ? "midnight" : "minimal") : themeName;
    const theme = getTheme(resolvedThemeName as Exclude<ThemeName, "auto">);
    const primaryColor = customStyles?.primaryColor || config?.primary_color || theme.colors.accent;
    const borderRadius = customStyles?.borderRadius || theme.styles.borderRadius;

    const handleResend = async () => {
        setError("");

        if (!client) {
            setError(i18n.errors.clientConfigError);
            return;
        }

        setResending(true);
        try {
            await client.resendVerificationEmail();
            setResent(true);
            setCooldown(60); // 60 second cooldown
            onResendSuccess?.();
        } catch (err: any) {
            setError(err.message || i18n.errors.resendError);
        } finally {
            setResending(false);
        }
    };

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

    const cardStyle: React.CSSProperties = {
        width: "100%",
        maxWidth: "420px",
        padding: "48px 40px",
        background: glassmorphism
            ? `rgba(${theme === getTheme("midnight") ? "30,30,40" : "255,255,255"}, 0.85)`
            : theme.colors.cardBackground,
        borderRadius,
        boxShadow: theme.styles.cardShadow,
        backdropFilter: glassmorphism ? "blur(16px)" : undefined,
        border: glassmorphism ? "1px solid rgba(255,255,255,0.1)" : undefined,
        textAlign: "center",
    };

    const iconContainerStyle: React.CSSProperties = {
        width: "80px",
        height: "80px",
        borderRadius: "50%",
        background: `${primaryColor}15`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 24px",
    };

    const titleStyle: React.CSSProperties = {
        margin: "0 0 12px",
        fontSize: "28px",
        fontWeight: 700,
        color: theme.colors.textPrimary,
    };

    const subtitleStyle: React.CSSProperties = {
        margin: "0 0 32px",
        fontSize: "15px",
        color: theme.colors.textMuted,
        lineHeight: 1.6,
    };

    const emailHighlightStyle: React.CSSProperties = {
        color: primaryColor,
        fontWeight: 600,
    };

    const buttonStyle: React.CSSProperties = {
        width: "100%",
        padding: "14px 24px",
        background: primaryColor,
        color: "#fff",
        border: "none",
        borderRadius,
        fontSize: "15px",
        fontWeight: 600,
        cursor: cooldown > 0 || resending ? "not-allowed" : "pointer",
        opacity: cooldown > 0 || resending ? 0.6 : 1,
        transition: "all 0.2s ease",
        marginBottom: "16px",
    };

    const linkStyle: React.CSSProperties = {
        color: primaryColor,
        textDecoration: "none",
        fontSize: "14px",
        fontWeight: 500,
    };

    const errorStyle: React.CSSProperties = {
        background: "rgba(239, 68, 68, 0.1)",
        border: "1px solid rgba(239, 68, 68, 0.2)",
        borderRadius: "8px",
        padding: "12px 16px",
        marginBottom: "20px",
        color: "#ef4444",
        fontSize: "14px",
    };

    const successStyle: React.CSSProperties = {
        background: "rgba(34, 197, 94, 0.1)",
        border: "1px solid rgba(34, 197, 94, 0.2)",
        borderRadius: "8px",
        padding: "12px 16px",
        marginBottom: "20px",
        color: "#22c55e",
        fontSize: "14px",
    };

    if (!mounted) return null;

    return (
        <>
            {backgroundImage && (
                <>
                    <div style={{
                        position: "fixed",
                        inset: 0,
                        backgroundImage: `url(${backgroundImage})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        filter: backgroundBlur > 0 ? `blur(${backgroundBlur}px)` : undefined,
                        transform: "scale(1.02)",
                        zIndex: 9998,
                    }} />
                    <div style={{
                        position: "fixed",
                        inset: 0,
                        background: `rgba(0,0,0,${overlayOpacity})`,
                        zIndex: 9998,
                    }} />
                </>
            )}
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <div style={iconContainerStyle}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                            <polyline points="22,6 12,13 2,6" />
                        </svg>
                    </div>

                    <h1 style={titleStyle}>{i18n.emailVerification.title}</h1>

                    <p style={subtitleStyle} dangerouslySetInnerHTML={{ __html: t(i18n.emailVerification.subtitle, { email: email ? `<span style="color:${primaryColor};font-weight:600">${email}</span>` : '' }) }} />

                    {error && <div style={errorStyle}>{error}</div>}
                    {resent && !error && (
                        <div style={successStyle}>
                            {i18n.emailVerification.resendSuccess}
                        </div>
                    )}

                    <button
                        onClick={handleResend}
                        disabled={cooldown > 0 || resending}
                        style={buttonStyle}
                    >
                        {resending ? i18n.emailVerification.resending : cooldown > 0 ? t(i18n.emailVerification.cooldown, { seconds: String(cooldown) }) : i18n.emailVerification.resendButton}
                    </button>

                    <div>
                        <a href={signInUrl} style={linkStyle}>
                            {"← " + i18n.emailVerification.backToSignIn}
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
}

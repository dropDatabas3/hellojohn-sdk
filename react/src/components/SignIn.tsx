import React, { useState, useEffect } from "react";
import { useAuth } from "../context";
import { useI18n } from "../i18n";
import { ThemeName, getTheme } from "../lib/themes";

export interface SignInProps {
    onSuccess?: () => void;
    redirectTo?: string;
    /** URL for sign up page (default: /register) */
    signUpUrl?: string;
    /** URL for forgot password page (default: /forgot-password) */
    forgotPasswordUrl?: string;
    /** Hide the sign-up link */
    hideSignUpLink?: boolean;
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

/**
 * SignIn component with built-in theming support.
 * 
 * @example
 * // Simple usage
 * <SignIn theme="midnight" />
 * 
 * @example
 * // With background and glassmorphism
 * <SignIn theme="ocean" backgroundImage="/hero.jpg" glassmorphism />
 */
export function SignIn({
    onSuccess,
    redirectTo = "/",
    signUpUrl = "/register",
    forgotPasswordUrl = "/forgot-password",
    hideSignUpLink = false,
    theme: themeName = "minimal",
    backgroundImage,
    backgroundBlur = 4,
    formPosition = "center",
    glassmorphism = false,
    customStyles,
}: SignInProps) {
    const { loginWithCredentials, loginWithSocialProvider, config, isLoading, isAuthenticated, client } = useAuth();
    const i18n = useI18n();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [verificationNeeded, setVerificationNeeded] = useState(false);
    const [resendStatus, setResendStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
    const [showPassword, setShowPassword] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [systemDark, setSystemDark] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (typeof window !== "undefined") {
            setSystemDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
            const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
            const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
            mediaQuery.addEventListener("change", handler);
            return () => mediaQuery.removeEventListener("change", handler);
        }
    }, []);

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            if (onSuccess) {
                onSuccess();
            } else {
                window.location.href = redirectTo;
            }
        }
    }, [isLoading, isAuthenticated, onSuccess, redirectTo]);

    // Get resolved theme
    const resolvedThemeName = themeName === "auto" ? (systemDark ? "midnight" : "minimal") : themeName;
    const theme = getTheme(resolvedThemeName as Exclude<ThemeName, "auto">);

    // Apply custom overrides
    const primaryColor = customStyles?.primaryColor || config?.primary_color || theme.colors.accent;
    const borderRadius = customStyles?.borderRadius || theme.styles.borderRadius;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSubmitting(true);
        try {
            await loginWithCredentials(email, password);
            if (onSuccess) {
                onSuccess();
            } else {
                window.location.href = redirectTo;
            }
        } catch (err: any) {
            // Check for verification error (1211 or string match)
            if (err.error === "email_not_verified" || (err.message && err.message.toLowerCase().includes("verificar"))) {
                setVerificationNeeded(true);
                setError(i18n.signIn.verificationNeeded);
            } else {
                setError(err.message || "Login failed");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleResend = async () => {
        console.log("[SignIn] handleResend called", { email });
        if (!email) {
            console.warn("[SignIn] No email state");
            return;
        }
        setResendStatus("loading");
        try {
            console.log("[SignIn] client available:", !!client);
            if (client && typeof client.resendVerificationEmail === 'function') {
                console.log("[SignIn] calling resendVerificationEmail");
                await client.resendVerificationEmail(email);
                console.log("[SignIn] resend success");
                setResendStatus("sent");
                setError(""); // Clear error on success
            } else {
                console.error("[SignIn] Client not ready or method missing");
                throw new Error("Client not ready");
            }
        } catch (e) {
            console.error("[SignIn] Resend error", e);
            setResendStatus("error");
        }
    };

    const handleGoogleLogin = () => {
        loginWithSocialProvider("google");
    };

    // Styles
    const justifyMap = { left: "flex-start", center: "center", right: "flex-end" };
    const containerStyle: React.CSSProperties = {
        position: backgroundImage ? "fixed" : undefined,
        top: backgroundImage ? 0 : undefined,
        left: backgroundImage ? 0 : undefined,
        right: backgroundImage ? 0 : undefined,
        bottom: backgroundImage ? 0 : undefined,
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: justifyMap[formPosition],
        padding: backgroundImage ? (formPosition === "center" ? "20px" : "20px 60px") : undefined,
        background: backgroundImage
            ? undefined
            : (theme.colors.background.includes("gradient") ? theme.colors.background : undefined),
        fontFamily: theme.styles.fontFamily,
        zIndex: backgroundImage ? 9999 : undefined,
    };

    const bgStyle: React.CSSProperties = backgroundImage ? {
        position: "absolute",
        inset: 0,
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        zIndex: 0,
    } : {};

    // Calculate overlay opacity based on blur (0 blur = no overlay)
    const overlayOpacity = backgroundBlur > 0 ? Math.min(backgroundBlur * 0.04, 0.65) : 0;
    const overlayStyle: React.CSSProperties = backgroundImage ? {
        position: "absolute",
        inset: 0,
        background: overlayOpacity > 0
            ? (theme.isDark ? `rgba(0,0,0,${overlayOpacity})` : `rgba(255,255,255,${overlayOpacity})`)
            : "transparent",
        backdropFilter: backgroundBlur > 0 ? `blur(${backgroundBlur}px)` : undefined,
        WebkitBackdropFilter: backgroundBlur > 0 ? `blur(${backgroundBlur}px)` : undefined,
        zIndex: 1,
    } : {};

    const cardStyle: React.CSSProperties = {
        position: "relative",
        zIndex: 2,
        width: "100%",
        maxWidth: "420px",
        margin: backgroundImage ? undefined : "0 auto",
        padding: "32px",
        background: glassmorphism
            ? (theme.isDark ? "rgba(15, 15, 26, 0.7)" : "rgba(255, 255, 255, 0.7)")
            : theme.colors.cardBackground,
        backdropFilter: glassmorphism ? "blur(16px) saturate(180%)" : undefined,
        border: `1px solid ${theme.colors.cardBorder}`,
        borderRadius,
        boxShadow: theme.styles.cardShadow,
        transition: theme.styles.transition,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(12px)",
    };

    const inputStyle: React.CSSProperties = {
        display: "flex",
        height: "44px",
        width: "100%",
        borderRadius: `calc(${borderRadius} - 4px)`,
        border: `1px solid ${theme.colors.inputBorder}`,
        background: theme.colors.inputBackground,
        color: theme.colors.inputText,
        padding: "0 14px",
        fontSize: "15px",
        outline: "none",
        transition: theme.styles.transition,
    };

    const buttonStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        width: "100%",
        height: "46px",
        borderRadius: `calc(${borderRadius} - 2px)`,
        border: "none",
        background: theme.colors.buttonPrimary,
        color: theme.colors.buttonPrimaryText,
        fontSize: "15px",
        fontWeight: 500,
        cursor: submitting ? "not-allowed" : "pointer",
        opacity: submitting ? 0.7 : 1,
        transition: theme.styles.transition,
    };

    const socialButtonStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        width: "100%",
        height: "46px",
        borderRadius: `calc(${borderRadius} - 2px)`,
        border: `1px solid ${theme.colors.buttonSecondaryBorder}`,
        background: theme.colors.buttonSecondary,
        color: theme.colors.buttonSecondaryText,
        fontSize: "15px",
        fontWeight: 500,
        cursor: "pointer",
        transition: theme.styles.transition,
    };

    const hasGoogle = config?.social_providers?.some(p => p.toLowerCase() === "google");
    const hasSMTP = config?.features?.smtp_enabled;

    if (isLoading) {
        return (
            <div style={{ ...containerStyle, justifyContent: "center", padding: "40px" }}>
                <div style={{ color: theme.colors.textMuted, animation: "pulse 2s infinite" }}>
                    {i18n.common.loading}
                </div>
            </div>
        );
    }

    const formContent = (
        <>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "28px" }}>
                {config?.logo_url && (
                    <img
                        src={config.logo_url}
                        alt={config.tenant_name || config.client_name}
                        style={{ height: "48px", marginLeft: "auto", marginRight: "auto", marginBottom: "16px", display: "block" }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                )}
                <h1 style={{
                    fontSize: "26px",
                    fontWeight: 700,
                    color: theme.colors.textPrimary,
                    margin: 0,
                }}>
                    {config?.tenant_name || config?.client_name || i18n.signIn.title}
                </h1>
                <p style={{
                    fontSize: "15px",
                    color: theme.colors.textMuted,
                    marginTop: "6px",
                }}>
                    {i18n.signIn.subtitle}
                </p>
            </div>

            {/* Error & Verification */}
            {(error || verificationNeeded) && (
                <div style={{
                    padding: "14px",
                    marginBottom: "20px",
                    fontSize: "14px",
                    color: verificationNeeded && resendStatus === "sent" ? "#15803d" : theme.colors.error,
                    background: verificationNeeded && resendStatus === "sent" ? "#dcfce7" : theme.colors.errorBackground,
                    border: `1px solid ${verificationNeeded && resendStatus === "sent" ? "#86efac" : theme.colors.errorBorder}`,
                    borderRadius: `calc(${borderRadius} - 4px)`,
                }}>
                    {resendStatus === "sent" ? i18n.signIn.verificationResent : error}

                    {verificationNeeded && resendStatus !== "sent" && (
                        <div style={{ marginTop: "10px" }}>
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={resendStatus === "loading"}
                                style={{
                                    background: "transparent",
                                    border: "none",
                                    padding: 0,
                                    color: theme.colors.link,
                                    textDecoration: "underline",
                                    fontSize: "13px",
                                    cursor: "pointer",
                                    fontWeight: 500
                                }}
                            >
                                {resendStatus === "loading" ? i18n.signIn.resending : i18n.signIn.resendVerification}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Social Login */}
            {hasGoogle && (
                <div style={{ marginBottom: "24px" }}>
                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        style={socialButtonStyle}
                        onMouseEnter={(e) => e.currentTarget.style.background = theme.colors.buttonSecondaryHover}
                        onMouseLeave={(e) => e.currentTarget.style.background = theme.colors.buttonSecondary}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        {i18n.signIn.socialButtonPrefix} Google
                    </button>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        margin: "20px 0",
                    }}>
                        <div style={{ flex: 1, height: "1px", background: theme.colors.inputBorder }} />
                        <span style={{ fontSize: "13px", color: theme.colors.textMuted, textTransform: "uppercase" }}>
                            {i18n.signIn.socialDivider}
                        </span>
                        <div style={{ flex: 1, height: "1px", background: theme.colors.inputBorder }} />
                    </div>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "18px" }}>
                    <label style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: theme.colors.textPrimary,
                        marginBottom: "8px",
                    }}>
                        {i18n.signIn.emailLabel}
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder={i18n.signIn.emailPlaceholder}
                        required
                        disabled={submitting}
                        style={inputStyle}
                        onFocus={(e) => e.currentTarget.style.borderColor = primaryColor}
                        onBlur={(e) => e.currentTarget.style.borderColor = theme.colors.inputBorder}
                    />
                </div>

                <div style={{ marginBottom: "24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <label style={{
                            fontSize: "14px",
                            fontWeight: 500,
                            color: theme.colors.textPrimary,
                        }}>
                            {i18n.signIn.passwordLabel}
                        </label>
                        {hasSMTP && (
                            <a
                                href={forgotPasswordUrl}
                                style={{
                                    fontSize: "13px",
                                    color: theme.colors.link,
                                    textDecoration: "none",
                                }}
                            >
                                {i18n.signIn.forgotPasswordLink}
                            </a>
                        )}
                    </div>
                    <div style={{ position: "relative" }}>
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            disabled={submitting}
                            style={{ ...inputStyle, paddingRight: "44px" }}
                            onFocus={(e) => e.currentTarget.style.borderColor = primaryColor}
                            onBlur={(e) => e.currentTarget.style.borderColor = theme.colors.inputBorder}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: "absolute",
                                right: "12px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                background: "none",
                                border: "none",
                                padding: "4px",
                                cursor: "pointer",
                                color: theme.colors.textMuted,
                            }}
                        >
                            {showPassword ? (
                                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                </svg>
                            ) : (
                                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={submitting}
                    style={buttonStyle}
                >
                    {submitting ? i18n.signIn.submitting : i18n.signIn.submitButton}
                </button>
            </form>

            {/* Sign Up Link */}
            {!hideSignUpLink && (
                <p style={{
                    textAlign: "center",
                    marginTop: "24px",
                    fontSize: "14px",
                    color: theme.colors.textSecondary,
                }}>
                    {i18n.signIn.noAccountText}{" "}
                    <a
                        href={signUpUrl}
                        style={{
                            color: theme.colors.link,
                            fontWeight: 500,
                            textDecoration: "none",
                        }}
                    >
                        {i18n.signIn.signUpLink}
                    </a>
                </p>
            )}
        </>
    );

    // If background image, wrap in full container
    if (backgroundImage) {
        return (
            <div style={containerStyle}>
                <div style={bgStyle} />
                <div style={overlayStyle} />
                <div style={cardStyle}>
                    {formContent}
                </div>
            </div>
        );
    }

    // Default: just the card
    return (
        <div style={cardStyle}>
            {formContent}
        </div>
    );
}

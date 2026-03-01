import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context";
import { useI18n, t } from "../i18n";
import { PasswordPolicy, RegisterOptions } from "@hellojohn/js";
import { ThemeName, getTheme } from "../lib/themes";
import { PhoneInput } from "./PhoneInput";
import { CountrySelect } from "./CountrySelect";
import {
    DEFAULT_PASSWORD_POLICY,
    PasswordRequirements,
    evaluatePasswordPolicy,
    hasVisiblePasswordRequirements,
} from "./PasswordRequirements";

export interface SignUpProps {
    onSuccess?: () => void;
    redirectTo?: string;
    signInUrl?: string;
    hideSignInLink?: boolean;
    theme?: ThemeName;
    backgroundImage?: string;
    backgroundBlur?: number;
    formPosition?: "left" | "center" | "right";
    glassmorphism?: boolean;
    customStyles?: {
        primaryColor?: string;
        borderRadius?: string;
    };
}

export function SignUp({
    onSuccess,
    redirectTo = "/login",
    signInUrl = "/login",
    hideSignInLink = false,
    theme: themeName = "minimal",
    backgroundImage,
    backgroundBlur = 4,
    formPosition = "center",
    glassmorphism = false,
    customStyles,
}: SignUpProps) {
    const { register, loginWithSocialProvider, config, providerStatus, client, isLoading, isAuthenticated } = useAuth();
    const i18n = useI18n();
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [success, setSuccess] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [systemDark, setSystemDark] = useState(false);
    const [step, setStep] = useState(1);
    const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
    const [passwordError, setPasswordError] = useState("");
    const [shake, setShake] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);

    // New states for verification flow
    const [showVerification, setShowVerification] = useState(false);
    const [resendStatus, setResendStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
    const [emailForVerification, setEmailForVerification] = useState("");
    const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy>(DEFAULT_PASSWORD_POLICY);

    useEffect(() => {
        setMounted(true);
        if (typeof window !== "undefined") {
            setSystemDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
        }
    }, []);

    useEffect(() => {
        if (!isLoading && isAuthenticated && !showVerification) {
            onSuccess ? onSuccess() : (window.location.href = redirectTo || "/");
        }
    }, [isLoading, isAuthenticated, onSuccess, redirectTo, showVerification]);

    const resolvedThemeName = themeName === "auto" ? (systemDark ? "midnight" : "minimal") : themeName;
    const theme = getTheme(resolvedThemeName as Exclude<ThemeName, "auto">);
    const borderRadius = customStyles?.borderRadius || theme.styles.borderRadius;

    const customFields = config?.custom_fields || [];
    const hasCustomFields = customFields.length > 0;
    const totalSteps = hasCustomFields ? 2 : 1;

    useEffect(() => {
        let cancelled = false;

        const loadPasswordPolicy = async () => {
            if (!client || typeof client.getPasswordPolicy !== "function") return;

            try {
                const policy = await client.getPasswordPolicy(config?.tenant_slug);
                if (!cancelled && policy) {
                    setPasswordPolicy({ ...DEFAULT_PASSWORD_POLICY, ...policy });
                }
            } catch (err) {
                console.warn("Failed to load password policy", err);
            }
        };

        void loadPasswordPolicy();
        return () => {
            cancelled = true;
        };
    }, [client, config?.tenant_slug]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: false }));
        if (name === "password" || name === "confirmPassword") setPasswordError("");
    };

    const handleCustomFieldChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: false }));
    };

    const passwordRules = evaluatePasswordPolicy(
        formData.password || "",
        formData.email || "",
        formData.name || "",
        passwordPolicy,
    );

    const showPasswordRequirements = hasVisiblePasswordRequirements(passwordPolicy);
    const effectiveMinPasswordLength =
        passwordPolicy.min_length > 0 ? passwordPolicy.min_length : DEFAULT_PASSWORD_POLICY.min_length;
    const passwordPlaceholder = t(i18n.signUp.passwordPlaceholder, { min: String(effectiveMinPasswordLength) });

    const canSubmitStep1 =
        !!formData.name?.trim() &&
        !!formData.email?.trim() &&
        !!formData.password?.trim() &&
        !!formData.confirmPassword?.trim() &&
        passwordRules.every((rule) => rule.ok) &&
        formData.password === formData.confirmPassword;

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const validateStep1 = (): boolean => {
        const errors: Record<string, boolean> = {};
        let hasError = false;
        setPasswordError("");

        if (!formData.name?.trim()) { errors.name = true; hasError = true; }
        if (!formData.email?.trim()) { errors.email = true; hasError = true; }
        if (!formData.password?.trim()) { errors.password = true; hasError = true; }
        if (!formData.confirmPassword?.trim()) { errors.confirmPassword = true; hasError = true; }

        const failedRule = passwordRules.find((rule) => !rule.ok);
        if (failedRule) {
            setPasswordError(failedRule.label);
            errors.password = true;
            hasError = true;
        } else if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
            setPasswordError(i18n.signUp.passwordMismatch);
            errors.confirmPassword = true;
            hasError = true;
        }

        setFieldErrors(errors);
        if (hasError) triggerShake();
        return !hasError;
    };

    const validateStep2 = (): boolean => {
        const errors: Record<string, boolean> = {};
        let hasError = false;

        customFields.forEach(field => {
            if (field.required && !formData[field.name]?.trim()) {
                errors[field.name] = true;
                hasError = true;
            }
        });

        setFieldErrors(errors);
        if (hasError) triggerShake();
        return !hasError;
    };

    const handleNextStep = () => {
        setPasswordError("");
        if (validateStep1()) setStep(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (step === 1 && hasCustomFields) {
            handleNextStep();
            return;
        }

        if (step === 1 && !validateStep1()) return;
        if (step === 2 && !validateStep2()) return;

        setSubmitting(true);
        try {
            const opts: RegisterOptions = {
                username: formData.email,
                email: formData.email,
                password: formData.password,
                name: formData.name,
                customFields: {}
            };
            customFields.forEach(f => { if (formData[f.name]) opts.customFields![f.name] = formData[f.name]; });

            await register(opts);

            if (config?.features?.require_email_verification) {
                setEmailForVerification(formData.email);
                setShowVerification(true);
            } else {
                setSuccess(true);
                onSuccess?.();
            }
        } catch (err: any) {
            setPasswordError(err.message || i18n.errors.registerError);
        } finally {
            setSubmitting(false);
        }
    };

    // Check if client supports resend
    const handleResend = async () => {
        if (!emailForVerification) return;
        setResendStatus("loading");
        try {
            // Check if client is available and has method
            if (client && 'resendVerificationEmail' in client && typeof client.resendVerificationEmail === 'function') {
                await client.resendVerificationEmail(emailForVerification);
                setResendStatus("sent");
            } else {
                // Should not happen if SDK is up to date, but fallback log
                console.error("Resend not supported by client");
                setResendStatus("error");
            }
        } catch (e) {
            setResendStatus("error");
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

    const cardStyle: React.CSSProperties = {
        position: "relative", zIndex: 2,
        width: "100%", maxWidth: "420px",
        padding: "28px",
        background: glassmorphism ? (theme.isDark ? "rgba(15, 15, 26, 0.8)" : "rgba(255, 255, 255, 0.85)") : theme.colors.cardBackground,
        backdropFilter: glassmorphism ? "blur(16px) saturate(180%)" : undefined,
        border: `1px solid ${theme.colors.cardBorder}`,
        borderRadius, boxShadow: theme.styles.cardShadow,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(10px)",
        transition: theme.styles.transition,
    };

    const getInputStyle = (fieldName: string): React.CSSProperties => ({
        display: "block",
        height: "44px",
        width: "100%",
        borderRadius: `calc(${borderRadius} - 4px)`,
        border: `1.5px solid ${fieldErrors[fieldName] ? "#ef4444" : theme.colors.inputBorder}`,
        background: fieldErrors[fieldName] ? "rgba(239, 68, 68, 0.05)" : theme.colors.inputBackground,
        color: theme.colors.inputText,
        padding: "0 14px",
        fontSize: "15px",
        outline: "none",
        transition: "all 0.2s ease",
        boxShadow: fieldErrors[fieldName] ? "0 0 0 3px rgba(239, 68, 68, 0.1)" : undefined,
    });

    const buttonStyle: React.CSSProperties = {
        display: "flex", alignItems: "center", justifyContent: "center",
        width: "100%", height: "46px",
        borderRadius: `calc(${borderRadius} - 2px)`,
        border: "none", background: theme.colors.buttonPrimary, color: theme.colors.buttonPrimaryText,
        fontSize: "15px", fontWeight: 600,
        cursor: submitting ? "not-allowed" : "pointer",
        opacity: submitting ? 0.7 : 1,
        transition: "all 0.2s ease",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    };

    const secondaryButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        background: "transparent",
        color: theme.colors.textSecondary,
        border: `1.5px solid ${theme.colors.inputBorder}`,
        boxShadow: "none",
        gap: "10px",
    };

    const socialButtonContentStyle: React.CSSProperties = {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
    };

    const labelStyle: React.CSSProperties = {
        display: "block",
        fontSize: "14px",
        fontWeight: 500,
        color: theme.colors.textPrimary,
        marginBottom: "6px",
    };

    /**
     * Derive the list of social providers to display.
     * Prefer `providerStatus` (real readiness from /v2/auth/providers) over `config.social_providers`.
     * Only providers with `ready: true` are shown — never show a button for a misconfigured provider.
     */
    const socialProviders = useMemo(() => {
        if (providerStatus.length > 0) {
            return providerStatus
                .filter(p => p.ready && p.name !== "password")
                .map(p => p.name);
        }
        const providers = config?.social_providers || [];
        const unique = new Set<string>();
        for (const provider of providers) {
            const normalized = provider.toLowerCase().trim();
            if (!normalized || normalized === "password") continue;
            unique.add(normalized);
        }
        return Array.from(unique);
    }, [providerStatus, config?.social_providers]);
    const providerLabel = (provider: string) => {
        const labels: Record<string, string> = {
            google: "Google",
            github: "GitHub",
            facebook: "Facebook",
            discord: "Discord",
            microsoft: "Microsoft",
            linkedin: "LinkedIn",
            apple: "Apple",
            gitlab: "GitLab",
        };
        return labels[provider] || (provider.charAt(0).toUpperCase() + provider.slice(1));
    };

    const SocialIcon = ({ provider }: { provider: string }) => {
        if (provider === "google") {
            return (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
            );
        }
        if (provider === "github") {
            return (
                <svg width="20" height="20" viewBox="0 0 24 24" fill={theme.colors.inputText}>
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
            );
        }
        return null;
    };

    useEffect(() => {
        if (typeof document !== "undefined") {
            const styleId = "hj-shake-animation";
            if (!document.getElementById(styleId)) {
                const style = document.createElement("style");
                style.id = styleId;
                style.textContent = `
                    @keyframes hjShake {
                        0%, 100% { transform: translateX(0); }
                        10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
                        20%, 40%, 60%, 80% { transform: translateX(4px); }
                    }
                `;
                document.head.appendChild(style);
            }
        }
    }, []);

    const EyeIcon = ({ visible }: { visible: boolean }) => (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            {visible ? (
                <>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </>
            ) : (
                <>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </>
            )}
        </svg>
    );

    if (isLoading) {
        return (
            <div style={{ ...containerStyle, justifyContent: "center" }}>
                <div style={{ color: theme.colors.textMuted }}>{i18n.common.loading}</div>
            </div>
        );
    }

    // New Verification UI
    if (showVerification) {
        return (
            <div style={containerStyle}>
                {backgroundImage && <><div style={bgStyle} /><div style={overlayStyle} /></>}
                <div style={cardStyle}>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ marginBottom: "20px" }}>
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6ZM20 6L12 11L4 6H20ZM20 18H4V8L12 13L20 8V18Z" fill={theme.colors.buttonPrimary} />
                            </svg>
                        </div>
                        <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px", color: theme.colors.textPrimary }}>{i18n.signUp.verifyEmailTitle}</h2>
                        <p style={{ fontSize: "16px", lineHeight: "1.5", marginBottom: "24px", color: theme.colors.textSecondary }}>
                            <span dangerouslySetInnerHTML={{ __html: t(i18n.signUp.verifyEmailMessage, { email: emailForVerification }) }} />
                        </p>

                        {resendStatus === "sent" && (
                            <div style={{
                                padding: "10px",
                                marginBottom: "20px",
                                background: "rgba(34, 197, 94, 0.1)",
                                color: "#22c55e",
                                borderRadius: "4px",
                                fontSize: "14px"
                            }}>
                                {i18n.signUp.verifyEmailResent}
                            </div>
                        )}

                        <div style={{ marginTop: "20px" }}>
                            <p style={{ fontSize: "14px", color: theme.colors.textSecondary }}>
                                {i18n.signUp.verifyEmailNotReceived}{" "}
                                <button
                                    onClick={handleResend}
                                    disabled={resendStatus === "loading"}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        padding: 0,
                                        color: theme.colors.link,
                                        cursor: "pointer",
                                        textDecoration: "underline",
                                        fontWeight: "bold",
                                        fontFamily: "inherit"
                                    }}
                                >
                                    {resendStatus === "loading" ? i18n.signUp.verifyEmailResending : i18n.signUp.verifyEmailResend}
                                </button>
                            </p>
                        </div>
                        <div style={{ marginTop: "30px" }}>
                            <a href={redirectTo || "/"} style={{ fontSize: "14px", color: theme.colors.textSecondary, textDecoration: "none" }}>
                                ← {i18n.signUp.verifyEmailBack}
                            </a>
                        </div>
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
                        <div style={{ width: "64px", height: "64px", margin: "0 auto 16px", borderRadius: "50%", background: "rgba(34, 197, 94, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 style={{ fontSize: "20px", fontWeight: 700, color: theme.colors.textPrimary, marginBottom: "8px" }}>{i18n.signUp.successTitle}</h2>
                        <p style={{ fontSize: "15px", color: theme.colors.textMuted, marginBottom: "20px" }}>{i18n.signUp.successMessage}</p>
                        <a href={redirectTo} style={{ ...buttonStyle, textDecoration: "none", display: "inline-flex" }}>{i18n.signUp.successAction}</a>
                    </div>
                </div>
            </div>
        );
    }

    const renderHeader = () => (
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
            {config?.logo_url && (
                <img src={config.logo_url} alt="" style={{ height: "40px", flexShrink: 0 }} onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
            )}
            <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: "20px", fontWeight: 700, color: theme.colors.textPrimary, margin: 0 }}>
                    {config?.tenant_name || i18n.signUp.title}
                </h1>
                {hasCustomFields && (
                    <p style={{ fontSize: "13px", color: theme.colors.textMuted, margin: "2px 0 0 0" }}>
                        {t(i18n.signUp.stepIndicator, { step: String(step), total: String(totalSteps) })}
                    </p>
                )}
            </div>
        </div>
    );


    const renderStep1 = () => (
        <>
            {renderHeader()}

            {socialProviders.length > 0 && (
                <>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                        {socialProviders.map((provider) => (
                            <button
                                key={provider}
                                type="button"
                                onClick={() => loginWithSocialProvider(provider)}
                                style={secondaryButtonStyle}
                                onMouseEnter={(e) => e.currentTarget.style.background = theme.colors.buttonSecondaryHover}
                                onMouseLeave={(e) => e.currentTarget.style.background = theme.colors.buttonSecondary}
                            >
                                <span style={socialButtonContentStyle}>
                                    <SocialIcon provider={provider} />
                                    <span>{i18n.signIn.socialButtonPrefix} {providerLabel(provider)}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
                        <div style={{ flex: 1, height: "1px", background: theme.colors.inputBorder }} />
                        <span style={{ fontSize: "12px", color: theme.colors.textMuted, textTransform: "uppercase", fontWeight: 500 }}>{i18n.signIn.socialDivider}</span>
                    </div>
                </>
            )}

            <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>{i18n.signUp.nameLabel} <span style={{ color: "#ef4444" }}>*</span></label>
                <input name="name" type="text" onChange={handleChange} value={formData.name || ""} placeholder={i18n.signUp.namePlaceholder} style={getInputStyle("name")} />
            </div>

            <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>{i18n.signUp.emailLabel} <span style={{ color: "#ef4444" }}>*</span></label>
                <input name="email" type="email" onChange={handleChange} value={formData.email || ""} placeholder={i18n.signUp.emailPlaceholder} style={getInputStyle("email")} />
            </div>

            <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>{i18n.signUp.passwordLabel} <span style={{ color: "#ef4444" }}>*</span></label>
                <div style={{ position: "relative" }}>
                    <input name="password" type={showPassword ? "text" : "password"} onChange={handleChange} onFocus={() => setIsPasswordFocused(true)} onBlur={() => setIsPasswordFocused(false)} value={formData.password || ""} placeholder={passwordPlaceholder} style={{ ...getInputStyle("password"), paddingRight: "44px" }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: "4px", cursor: "pointer", color: theme.colors.textMuted }}>
                        <EyeIcon visible={showPassword} />
                    </button>
                </div>
            </div>

            {showPasswordRequirements && (
                <PasswordRequirements
                    password={formData.password || ""}
                    email={formData.email || ""}
                    name={formData.name || ""}
                    policy={passwordPolicy}
                    theme={theme}
                    borderRadius={borderRadius}
                />
            )}

            <div style={{ marginBottom: passwordError ? "8px" : "20px" }}>
                <label style={labelStyle}>{i18n.signUp.confirmPasswordLabel} <span style={{ color: "#ef4444" }}>*</span></label>
                <div style={{ position: "relative" }}>
                    <input name="confirmPassword" type={showConfirmPassword ? "text" : "password"} onChange={handleChange} onFocus={() => setIsPasswordFocused(true)} onBlur={() => setIsPasswordFocused(false)} value={formData.confirmPassword || ""} placeholder={i18n.signUp.confirmPasswordPlaceholder} style={{ ...getInputStyle("confirmPassword"), paddingRight: "44px" }} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: "4px", cursor: "pointer", color: theme.colors.textMuted }}>
                        <EyeIcon visible={showConfirmPassword} />
                    </button>
                </div>
            </div>

            {passwordError && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", fontSize: "13px", color: "#ef4444" }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {passwordError}
                </div>
            )}

            <button type="submit" disabled={submitting || !canSubmitStep1} style={buttonStyle}>
                {submitting ? i18n.signUp.processing : hasCustomFields ? i18n.signUp.continueButton + " ->" : i18n.signUp.submitButton}
            </button>
        </>
    );

    const renderStep2 = () => (
        <>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
                {config?.logo_url && (
                    <img src={config.logo_url} alt="" style={{ height: "40px", flexShrink: 0 }} onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                )}
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: "20px", fontWeight: 700, color: theme.colors.textPrimary, margin: 0 }}>
                        {i18n.signUp.additionalInfo}
                    </h1>
                    <p style={{ fontSize: "13px", color: theme.colors.textMuted, margin: "2px 0 0 0" }}>
                        {t(i18n.signUp.stepIndicator, { step: String(step), total: String(totalSteps) })}
                    </p>
                </div>
            </div>

            {customFields.map((field, index) => {
                const type = field.type?.toLowerCase() || "text";
                const isLast = index === customFields.length - 1;

                return (
                    <div key={field.name} style={{ marginBottom: isLast ? "20px" : "14px" }}>
                        <label style={labelStyle}>
                            {field.label || field.name}
                            {field.required && <span style={{ color: "#ef4444" }}> *</span>}
                        </label>
                        {type === "phone" ? (
                            <PhoneInput value={formData[field.name] || ""} onChange={(v) => handleCustomFieldChange(field.name, v)} required={field.required} disabled={submitting} />
                        ) : type === "country" ? (
                            <CountrySelect value={formData[field.name] || ""} onChange={(v) => handleCustomFieldChange(field.name, v)} required={field.required} disabled={submitting} />
                        ) : (
                            <input name={field.name} type={type === "number" ? "number" : "text"} onChange={handleChange} value={formData[field.name] || ""} style={getInputStyle(field.name)} />
                        )}
                    </div>
                );
            })}

            <div style={{ display: "flex", gap: "12px" }}>
                <button type="button" onClick={() => { setStep(1); setPasswordError(""); setFieldErrors({}); }} style={{ ...secondaryButtonStyle, flex: 1 }}>
                    {"← " + i18n.signUp.backButton}
                </button>
                <button type="submit" disabled={submitting} style={{ ...buttonStyle, flex: 2 }}>
                    {submitting ? i18n.signUp.registering : i18n.signUp.submitButton}
                </button>
            </div>
        </>
    );

    return (
        <div style={containerStyle}>
            {backgroundImage && <><div style={bgStyle} /><div style={overlayStyle} /></>}
            <div style={{ ...cardStyle, animation: shake ? "hjShake 0.5s ease-in-out" : undefined }}>
                <form onSubmit={handleSubmit}>
                    {step === 1 ? renderStep1() : renderStep2()}
                </form>
                {!hideSignInLink && step === 1 && (
                    <p style={{ textAlign: "center", marginTop: "20px", marginBottom: 0, fontSize: "14px", color: theme.colors.textSecondary }}>
                        {i18n.signUp.hasAccountText} <a href={signInUrl} style={{ color: theme.colors.link, fontWeight: 600, textDecoration: "none" }}>{i18n.signUp.signInLink}</a>
                    </p>
                )}
            </div>
        </div>
    );
}







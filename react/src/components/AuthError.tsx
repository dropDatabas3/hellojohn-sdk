import React, { useState, useEffect, useMemo } from "react";
import { useI18n } from "../i18n";
import { ThemeName, getTheme } from "../lib/themes";

export interface AuthErrorProps {
    /** Error message to display */
    error: string;
    /** Error code (e.g. "temporarily_unavailable", "server_error") */
    errorCode?: string;
    /** The flow that triggered the error (e.g. "register", "social", "login") */
    errorFlow?: string;
    /** Called when user clicks retry button */
    onRetry?: () => void;
    /** URL to redirect to on retry (default: /) */
    retryUrl?: string;
    /** Theme name */
    theme?: ThemeName;
}

// Map error codes to user-friendly context
const ERROR_INFO: Record<string, { icon: "shield" | "cloud" | "key" | "alert"; severity: "warning" | "error" }> = {
    temporarily_unavailable: { icon: "cloud", severity: "warning" },
    server_error: { icon: "alert", severity: "error" },
    unauthorized_client: { icon: "key", severity: "error" },
    redirect_uri_not_allowed: { icon: "key", severity: "warning" },
    invalid_redirect_uri: { icon: "shield", severity: "warning" },
    invalid_request: { icon: "shield", severity: "warning" },
    api_error: { icon: "alert", severity: "error" },
    INTERNAL_SERVER_ERROR: { icon: "alert", severity: "error" },
};

/**
 * Pre-built error page for authentication failures.
 * Automatically rendered by AuthProvider when social login or callback fails.
 */
export function AuthError({
    error,
    errorCode,
    errorFlow,
    onRetry,
    retryUrl = "/",
    theme: themeName = "minimal",
}: AuthErrorProps) {
    const i18n = useI18n();
    const [mounted, setMounted] = useState(false);
    const [systemDark, setSystemDark] = useState(false);
    const [buttonHover, setButtonHover] = useState(false);
    const [iconPulse, setIconPulse] = useState(true);
    const [copied, setCopied] = useState(false);

    // Generate a unique error reference ID for admin tracking
    const errorRef = useMemo(() => {
        const ts = Date.now().toString(36).toUpperCase();
        const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `HJ-${ts}-${rand}`;
    }, []);

    useEffect(() => {
        const t1 = setTimeout(() => setMounted(true), 50);
        const t2 = setTimeout(() => setIconPulse(false), 3000);
        if (typeof window !== "undefined") {
            setSystemDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
        }
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    const resolvedThemeName = themeName === "auto" ? (systemDark ? "midnight" : "minimal") : themeName;
    const theme = getTheme(resolvedThemeName as Exclude<ThemeName, "auto">);
    const info = errorCode ? ERROR_INFO[errorCode] : undefined;
    const severity = info?.severity || "error";
    const iconType = info?.icon || "alert";
    const dk = theme.isDark;

    const handleRetry = () => {
        if (onRetry) {
            onRetry();
        } else if (typeof window !== "undefined") {
            window.location.href = retryUrl;
        }
    };

    const handleCopyRef = () => {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
            navigator.clipboard.writeText(errorRef);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // ─── Keyframes ───

    const keyframesId = "hj-auth-error-keyframes";
    useEffect(() => {
        if (typeof document === "undefined") return;
        if (document.getElementById(keyframesId)) return;
        const style = document.createElement("style");
        style.id = keyframesId;
        style.textContent = `
            @keyframes hj-error-fade-up {
                from { opacity: 0; transform: translateY(24px) scale(0.96); }
                to   { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes hj-error-icon-pop {
                0%   { transform: scale(0.3) rotate(-10deg); opacity: 0; }
                50%  { transform: scale(1.1) rotate(2deg); opacity: 1; }
                100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }
            @keyframes hj-error-icon-pulse {
                0%, 100% { transform: scale(1); }
                50%      { transform: scale(1.06); }
            }
            @keyframes hj-error-line-grow {
                from { width: 0%; }
                to   { width: 100%; }
            }
            @keyframes hj-error-bg-float {
                0%, 100% { transform: translate(0, 0) scale(1); }
                33%      { transform: translate(15px, -20px) scale(1.05); }
                66%      { transform: translate(-10px, -30px) scale(0.95); }
            }
        `;
        document.head.appendChild(style);
    }, []);

    // ─── Severity colors ───

    const severityColors = severity === "warning" ? {
        iconBg: dk ? "rgba(251, 191, 36, 0.15)" : "#fef3c7",
        iconBorder: dk ? "rgba(251, 191, 36, 0.3)" : "#f59e0b",
        iconColor: dk ? "#fbbf24" : "#b45309",
        accentGradient: dk
            ? "linear-gradient(90deg, #fbbf24, #f59e0b80, transparent)"
            : "linear-gradient(90deg, #f59e0b, #fbbf2480, transparent)",
        badgeBg: dk ? "rgba(251, 191, 36, 0.1)" : "#fef9c3",
        badgeText: dk ? "#fbbf24" : "#92400e",
        badgeBorder: dk ? "rgba(251, 191, 36, 0.25)" : "#fcd34d",
    } : {
        iconBg: dk ? "rgba(239, 68, 68, 0.15)" : "#fee2e2",
        iconBorder: dk ? "rgba(239, 68, 68, 0.3)" : "#f87171",
        iconColor: dk ? "#f87171" : "#dc2626",
        accentGradient: dk
            ? "linear-gradient(90deg, #ef4444, #ef444480, transparent)"
            : "linear-gradient(90deg, #dc2626, #ef444480, transparent)",
        badgeBg: dk ? "rgba(239, 68, 68, 0.1)" : "#fef2f2",
        badgeText: dk ? "#f87171" : "#991b1b",
        badgeBorder: dk ? "rgba(239, 68, 68, 0.25)" : "#fecaca",
    };

    // ─── Styles ───

    const containerStyle: React.CSSProperties = {
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        minHeight: "100vh",
        padding: "24px",
        fontFamily: theme.styles.fontFamily,
        background: dk
            ? "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)"
            : "linear-gradient(145deg, #1e1b4b 0%, #312e81 25%, #4c1d95 50%, #581c87 75%, #1e1b4b 100%)",
        overflow: "hidden",
    };

    const bgShapeBase: React.CSSProperties = {
        position: "absolute",
        borderRadius: "50%",
        filter: dk ? "blur(60px)" : "blur(80px)",
        opacity: dk ? 0.15 : 0.4,
        pointerEvents: "none",
    };

    const cardStyle: React.CSSProperties = {
        position: "relative",
        width: "100%",
        maxWidth: "440px",
        padding: "0",
        background: dk
            ? "rgba(15, 15, 26, 0.85)"
            : "rgba(255, 255, 255, 0.97)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: dk
            ? "1px solid rgba(255, 255, 255, 0.08)"
            : "1px solid rgba(255, 255, 255, 0.6)",
        borderRadius: "16px",
        boxShadow: dk
            ? "0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset"
            : "0 32px 64px -16px rgba(0, 0, 0, 0.35), 0 16px 32px -8px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.3) inset, 0 1px 0 rgba(255, 255, 255, 0.6) inset",
        overflow: "hidden",
        animation: mounted ? "hj-error-fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" : "none",
        opacity: mounted ? undefined : 0,
        zIndex: 1,
    };

    const accentLineStyle: React.CSSProperties = {
        height: "3px",
        background: severityColors.accentGradient,
        animation: mounted ? "hj-error-line-grow 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards" : "none",
        width: mounted ? undefined : "0%",
    };

    const contentStyle: React.CSSProperties = {
        padding: "44px 40px 36px",
    };

    const iconWrapperStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "76px",
        height: "76px",
        borderRadius: "22px",
        background: severityColors.iconBg,
        border: `2px solid ${severityColors.iconBorder}`,
        margin: "0 auto 28px",
        boxShadow: dk
            ? `0 8px 24px ${severityColors.iconBg}`
            : `0 8px 24px rgba(0, 0, 0, 0.06), 0 0 0 4px ${severityColors.iconBg}`,
        animation: mounted
            ? `hj-error-icon-pop 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards${iconPulse ? ", hj-error-icon-pulse 2s ease-in-out 0.8s infinite" : ""}`
            : "none",
        opacity: mounted ? undefined : 0,
    };

    const titleStyle: React.CSSProperties = {
        fontSize: "24px",
        fontWeight: 700,
        color: dk ? "#f1f5f9" : "#0f172a",
        margin: "0 0 12px",
        textAlign: "center",
        letterSpacing: "-0.025em",
        lineHeight: "1.3",
    };

    const messageStyle: React.CSSProperties = {
        fontSize: "15px",
        color: dk ? "#94a3b8" : "#475569",
        margin: "0 0 8px",
        textAlign: "center",
        lineHeight: "1.6",
    };

    const badgeStyle: React.CSSProperties = errorCode ? {
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "11px",
        fontWeight: 600,
        fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
        color: severityColors.badgeText,
        background: severityColors.badgeBg,
        border: `1px solid ${severityColors.badgeBorder}`,
        borderRadius: "6px",
        padding: "5px 14px",
        margin: "0 auto 24px",
        letterSpacing: "0.03em",
    } : { display: "none" };

    const dividerStyle: React.CSSProperties = {
        height: "1px",
        background: dk
            ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)"
            : "linear-gradient(90deg, transparent, #e2e8f0, transparent)",
        margin: errorCode ? "0 0 28px" : "20px 0 28px",
    };

    const buttonStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        width: "100%",
        height: "50px",
        borderRadius: "12px",
        border: "none",
        background: buttonHover
            ? (dk ? "#818cf8" : "#4338ca")
            : (dk ? "#6366f1" : "#4f46e5"),
        color: "#ffffff",
        fontSize: "15px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: buttonHover ? "translateY(-2px)" : "translateY(0)",
        boxShadow: buttonHover
            ? (dk ? "0 8px 24px rgba(99, 102, 241, 0.45)" : "0 8px 24px rgba(79, 70, 229, 0.35)")
            : (dk ? "0 4px 12px rgba(99, 102, 241, 0.25)" : "0 4px 12px rgba(79, 70, 229, 0.2)"),
        letterSpacing: "0.01em",
    };

    const hintStyle: React.CSSProperties = {
        fontSize: "12px",
        color: dk ? "rgba(75, 81, 90, 0.6)" : "#4a525eff",
        textAlign: "center",
        marginTop: "20px",
        lineHeight: "1.5",
    };

    // Error reference section
    const refSectionStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        marginTop: "16px",
        padding: "10px 16px",
        background: dk ? "rgba(255,255,255,0.03)" : "#f8fafc",
        borderRadius: "8px",
        border: dk ? "1px solid rgba(255,255,255,0.05)" : "1px solid #e2e8f0",
    };

    const refLabelStyle: React.CSSProperties = {
        fontSize: "11px",
        color: dk ? "#272c33ff" : "#3d444dff",
        fontWeight: 500,
    };

    const refCodeStyle: React.CSSProperties = {
        fontSize: "11px",
        fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
        color: dk ? "#94a3b8" : "#64748b",
        fontWeight: 600,
        letterSpacing: "0.04em",
    };

    const copyBtnStyle: React.CSSProperties = {
        background: "none",
        border: "none",
        padding: "2px",
        cursor: "pointer",
        color: dk ? "#64748b" : "#94a3b8",
        display: "flex",
        alignItems: "center",
        transition: "color 0.15s",
    };

    // ─── Icon SVGs ───

    const renderIcon = () => {
        const iconProps = { width: 32, height: 32, fill: "none", stroke: severityColors.iconColor, strokeWidth: 1.5 };

        switch (iconType) {
            case "cloud":
                return (
                    <svg {...iconProps} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12l-3 3m0 0l-3-3m3 3V6" />
                    </svg>
                );
            case "key":
                return (
                    <svg {...iconProps} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                    </svg>
                );
            case "shield":
                return (
                    <svg {...iconProps} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285zm0 13.5h.008v.008H12v-.008z" />
                    </svg>
                );
            default:
                return (
                    <svg {...iconProps} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                );
        }
    };

    // ─── Render ───

    return (
        <div style={containerStyle}>
            {/* Floating background blobs */}
            <div style={{
                ...bgShapeBase,
                width: "400px", height: "400px",
                top: "-120px", right: "-100px",
                background: dk ? "#6366f1" : "#7c3aed",
                animation: "hj-error-bg-float 20s ease-in-out infinite",
            }} />
            <div style={{
                ...bgShapeBase,
                width: "350px", height: "350px",
                bottom: "-80px", left: "-80px",
                background: dk ? "#ec4899" : "#db2777",
                animation: "hj-error-bg-float 25s ease-in-out infinite reverse",
            }} />
            <div style={{
                ...bgShapeBase,
                width: "250px", height: "250px",
                top: "30%", left: "55%",
                background: dk ? "#8b5cf6" : "#6d28d9",
                animation: "hj-error-bg-float 18s ease-in-out infinite 3s",
                opacity: dk ? 0.08 : 0.25,
            }} />
            {/* Subtle grid/noise texture overlay */}
            <div style={{
                position: "absolute",
                inset: 0,
                backgroundImage: dk
                    ? "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)"
                    : "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.07) 1px, transparent 0)",
                backgroundSize: "24px 24px",
                pointerEvents: "none",
                zIndex: 0,
            }} />

            <div style={cardStyle}>
                {/* Accent line */}
                <div style={accentLineStyle} />

                <div style={contentStyle}>
                    {/* Icon */}
                    <div style={iconWrapperStyle}>
                        {renderIcon()}
                    </div>

                    {/* Title - contextual based on flow */}
                    <h2 style={titleStyle}>
                        {errorFlow
                            ? (i18n.authError as any)[`title_${errorFlow}`] || i18n.authError.title
                            : i18n.authError.title}
                    </h2>

                    {/* Error message */}
                    <p style={messageStyle}>{error}</p>

                    {/* Error code badge */}
                    {errorCode && (
                        <div style={{ textAlign: "center" as const, marginBottom: "20px" }}>
                            <span style={badgeStyle}>{errorCode}</span>
                        </div>
                    )}

                    {/* Divider */}
                    <div style={dividerStyle} />

                    {/* Retry button */}
                    <button
                        onClick={handleRetry}
                        onMouseEnter={() => setButtonHover(true)}
                        onMouseLeave={() => setButtonHover(false)}
                        style={buttonStyle}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                        {i18n.authError.retryButton}
                    </button>

                    {/* Hint */}
                    <p style={hintStyle}>{i18n.authError.hint}</p>

                    {/* Error reference for admin tracking */}
                    <div style={refSectionStyle}>
                        <span style={refLabelStyle}>{i18n.authError.referenceLabel}:</span>
                        <span style={refCodeStyle}>{errorRef}</span>
                        <button
                            onClick={handleCopyRef}
                            style={copyBtnStyle}
                            title="Copy"
                        >
                            {copied ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                            ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

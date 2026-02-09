import React, { useState, useEffect } from "react";
import { useAuth } from "../context";
import { useI18n } from "../i18n";
import { ThemeName, getTheme } from "../lib/themes";

export interface UserProfileProps {
    /** Theme name */
    theme?: ThemeName;
    /** Custom style overrides */
    customStyles?: {
        primaryColor?: string;
        borderRadius?: string;
    };
    /** Callback when MFA setup is requested */
    onMFASetup?: () => void;
}

/**
 * UserProfile renders a profile management panel with personal info and security settings.
 *
 * @example
 * <UserProfile theme="midnight" />
 */
export function UserProfile({
    theme: themeName = "minimal",
    customStyles,
    onMFASetup,
}: UserProfileProps) {
    const { user, client, config, isLoading, isAuthenticated } = useAuth();
    const i18n = useI18n();
    const [activeTab, setActiveTab] = useState<"personal" | "security">("personal");
    const [name, setName] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState("");
    const [systemDark, setSystemDark] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setSystemDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
        }
    }, []);

    useEffect(() => {
        if (user?.name) setName(user.name);
    }, [user?.name]);

    const resolvedThemeName = themeName === "auto" ? (systemDark ? "midnight" : "minimal") : themeName;
    const theme = getTheme(resolvedThemeName as Exclude<ThemeName, "auto">);
    const primaryColor = customStyles?.primaryColor || config?.primary_color || theme.colors.accent;
    const borderRadius = customStyles?.borderRadius || theme.styles.borderRadius;

    if (isLoading || !isAuthenticated || !user) return null;

    const initials = (user.name || user.email || "?")
        .split(" ")
        .map(s => s[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const handleSave = async () => {
        if (!client) return;
        setSaving(true);
        setSaveMessage("");
        try {
            await client.completeProfile({ name });
            setSaveMessage("Saved!");
            setTimeout(() => setSaveMessage(""), 2000);
        } catch (err: any) {
            setSaveMessage(err.message || i18n.errors.profileSaveError);
        } finally {
            setSaving(false);
        }
    };

    const cardStyle: React.CSSProperties = {
        width: "100%",
        maxWidth: "520px",
        margin: "0 auto",
        background: theme.colors.cardBackground,
        border: `1px solid ${theme.colors.cardBorder}`,
        borderRadius,
        boxShadow: theme.styles.cardShadow,
        fontFamily: theme.styles.fontFamily,
        overflow: "hidden",
    };

    const tabStyle = (active: boolean): React.CSSProperties => ({
        padding: "12px 20px",
        fontSize: "14px",
        fontWeight: active ? 600 : 400,
        color: active ? primaryColor : theme.colors.textSecondary,
        background: "transparent",
        border: "none",
        borderBottom: active ? `2px solid ${primaryColor}` : "2px solid transparent",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.2s ease",
    });

    const inputStyle: React.CSSProperties = {
        display: "block",
        width: "100%",
        height: "44px",
        borderRadius: `calc(${borderRadius} - 4px)`,
        border: `1.5px solid ${theme.colors.inputBorder}`,
        background: theme.colors.inputBackground,
        color: theme.colors.inputText,
        padding: "0 14px",
        fontSize: "15px",
        outline: "none",
    };

    const labelStyle: React.CSSProperties = {
        display: "block",
        fontSize: "13px",
        fontWeight: 500,
        color: theme.colors.textMuted,
        marginBottom: "6px",
    };

    return (
        <div style={cardStyle}>
            {/* Header */}
            <div style={{
                padding: "24px 28px",
                borderBottom: `1px solid ${theme.colors.inputBorder}`,
                display: "flex",
                alignItems: "center",
                gap: "16px",
            }}>
                <div style={{
                    width: "56px", height: "56px", borderRadius: "50%",
                    background: theme.colors.buttonPrimary, color: theme.colors.buttonPrimaryText,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "20px", fontWeight: 600, overflow: "hidden", flexShrink: 0,
                }}>
                    {user.picture ? (
                        <img src={user.picture} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : initials}
                </div>
                <div>
                    <h2 style={{ fontSize: "18px", fontWeight: 700, color: theme.colors.textPrimary, margin: 0 }}>
                        {i18n.userProfile.title}
                    </h2>
                    <p style={{ fontSize: "14px", color: theme.colors.textMuted, margin: "2px 0 0 0" }}>
                        {user.email}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: `1px solid ${theme.colors.inputBorder}` }}>
                <button style={tabStyle(activeTab === "personal")} onClick={() => setActiveTab("personal")}>
                    {i18n.userProfile.personalInfo}
                </button>
                <button style={tabStyle(activeTab === "security")} onClick={() => setActiveTab("security")}>
                    {i18n.userProfile.security}
                </button>
            </div>

            {/* Content */}
            <div style={{ padding: "24px 28px" }}>
                {activeTab === "personal" && (
                    <div>
                        <div style={{ marginBottom: "18px" }}>
                            <label style={labelStyle}>{i18n.userProfile.nameLabel}</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ marginBottom: "24px" }}>
                            <label style={labelStyle}>{i18n.userProfile.emailLabel}</label>
                            <input
                                type="email"
                                value={user.email || ""}
                                disabled
                                style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }}
                            />
                        </div>

                        {saveMessage && (
                            <div style={{
                                padding: "8px 14px", marginBottom: "16px", fontSize: "14px",
                                color: saveMessage.includes("!") ? "#22c55e" : theme.colors.error,
                                background: saveMessage.includes("!") ? "rgba(34,197,94,0.1)" : theme.colors.errorBackground,
                                borderRadius: "6px",
                            }}>
                                {saveMessage}
                            </div>
                        )}

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            style={{
                                display: "flex", alignItems: "center", justifyContent: "center",
                                padding: "10px 24px", fontSize: "14px", fontWeight: 600,
                                borderRadius: `calc(${borderRadius} - 2px)`,
                                border: "none", background: theme.colors.buttonPrimary, color: theme.colors.buttonPrimaryText,
                                cursor: saving ? "not-allowed" : "pointer",
                                opacity: saving ? 0.6 : 1,
                                transition: "all 0.2s ease",
                            }}
                        >
                            {saving ? i18n.userProfile.saving : i18n.userProfile.saveButton}
                        </button>
                    </div>
                )}

                {activeTab === "security" && (
                    <div>
                        {/* MFA Section */}
                        <div style={{
                            padding: "16px",
                            border: `1px solid ${theme.colors.inputBorder}`,
                            borderRadius: `calc(${borderRadius} - 4px)`,
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke={primaryColor} strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                </svg>
                                <span style={{ fontSize: "15px", fontWeight: 600, color: theme.colors.textPrimary }}>
                                    {i18n.mfa.challengeTitle}
                                </span>
                            </div>
                            <p style={{ fontSize: "13px", color: theme.colors.textMuted, margin: "0 0 12px 0" }}>
                                {i18n.mfa.setupSubtitle}
                            </p>
                            {onMFASetup && (
                                <button
                                    onClick={onMFASetup}
                                    style={{
                                        padding: "8px 16px", fontSize: "13px", fontWeight: 500,
                                        borderRadius: "6px",
                                        border: `1.5px solid ${theme.colors.inputBorder}`,
                                        background: "transparent",
                                        color: theme.colors.textPrimary,
                                        cursor: "pointer",
                                        fontFamily: "inherit",
                                    }}
                                >
                                    {i18n.userProfile.enableMFA}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

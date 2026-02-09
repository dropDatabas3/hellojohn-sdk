import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context";
import { useI18n } from "../i18n";
import { ThemeName, getTheme } from "../lib/themes";

export interface UserButtonProps {
    /** URL to navigate after sign out */
    afterSignOutUrl?: string;
    /** Theme name */
    theme?: ThemeName;
    /** Avatar size in pixels (default: 36) */
    size?: number;
    /** Custom style overrides */
    customStyles?: {
        primaryColor?: string;
        borderRadius?: string;
    };
}

/**
 * UserButton renders an avatar circle that opens a dropdown with user info and sign out.
 *
 * @example
 * <UserButton afterSignOutUrl="/" theme="midnight" />
 */
export function UserButton({
    afterSignOutUrl = "/",
    theme: themeName = "minimal",
    size = 36,
    customStyles,
}: UserButtonProps) {
    const { isAuthenticated, isLoading, user, logout } = useAuth();
    const i18n = useI18n();
    const [open, setOpen] = useState(false);
    const [systemDark, setSystemDark] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setSystemDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
        }
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const resolvedThemeName = themeName === "auto" ? (systemDark ? "midnight" : "minimal") : themeName;
    const theme = getTheme(resolvedThemeName as Exclude<ThemeName, "auto">);
    const borderRadius = customStyles?.borderRadius || theme.styles.borderRadius;

    if (isLoading || !isAuthenticated || !user) return null;

    const initials = (user.name || user.email || "?")
        .split(" ")
        .map(s => s[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const handleSignOut = () => {
        setOpen(false);
        logout(afterSignOutUrl);
    };

    return (
        <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
            {/* Avatar button */}
            <button
                onClick={() => setOpen(!open)}
                style={{
                    width: size,
                    height: size,
                    borderRadius: "50%",
                    border: `2px solid ${theme.colors.inputBorder}`,
                    background: theme.colors.buttonPrimary,
                    color: theme.colors.buttonPrimaryText,
                    fontSize: Math.round(size * 0.38) + "px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    padding: 0,
                    transition: theme.styles.transition,
                }}
            >
                {user.picture ? (
                    <img
                        src={user.picture}
                        alt={user.name || ""}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                ) : (
                    initials
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div style={{
                    position: "absolute",
                    top: size + 8,
                    right: 0,
                    minWidth: "220px",
                    background: theme.colors.cardBackground,
                    border: `1px solid ${theme.colors.cardBorder}`,
                    borderRadius,
                    boxShadow: theme.styles.cardShadow,
                    zIndex: 9999,
                    overflow: "hidden",
                    fontFamily: theme.styles.fontFamily,
                }}>
                    {/* User info */}
                    <div style={{
                        padding: "14px 16px",
                        borderBottom: `1px solid ${theme.colors.inputBorder}`,
                    }}>
                        <div style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: theme.colors.textPrimary,
                            marginBottom: "2px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}>
                            {user.name || user.email}
                        </div>
                        {user.name && user.email && (
                            <div style={{
                                fontSize: "12px",
                                color: theme.colors.textMuted,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}>
                                {user.email}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div style={{ padding: "4px 0" }}>
                        <button
                            onClick={handleSignOut}
                            style={{
                                display: "block",
                                width: "100%",
                                textAlign: "left",
                                padding: "10px 16px",
                                fontSize: "14px",
                                color: theme.colors.textSecondary,
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                fontFamily: "inherit",
                                transition: theme.styles.transition,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = theme.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                            }}
                        >
                            {i18n.userButton.signOut}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

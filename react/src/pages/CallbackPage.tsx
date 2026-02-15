"use client";
import React, { useEffect } from "react";
import { useAuth } from "../context";
import { useRoutes, useHJNavigate, useSearchParam } from "../routing";
import { CompleteProfile } from "../components/CompleteProfile";
import { getTheme } from "../lib/themes";

export interface CallbackPageProps {
    /** Override where to redirect after login completes. Default: routes.afterLogin */
    afterLogin?: string;
    /** Allow skipping profile completion. Default: true */
    allowSkipProfile?: boolean;
}

/**
 * Pre-built callback page. Handles post-auth redirect, email verification,
 * and profile completion automatically.
 *
 * @example
 * // Next.js: app/callback/page.tsx (one line!)
 * export { CallbackPage as default } from "@hellojohn/react/pages"
 */
export function CallbackPage({ afterLogin, allowSkipProfile = true }: CallbackPageProps) {
    const { isAuthenticated, isLoading, needsProfileCompletion, error, theme: themeName } = useAuth();
    const routes = useRoutes();
    const navigate = useHJNavigate();
    const verificationStatus = useSearchParam("status");
    const theme = getTheme(themeName === "auto" ? "minimal" : themeName);

    const targetAfterLogin = afterLogin || routes.afterLogin;

    // Handle email verification redirect
    useEffect(() => {
        if (verificationStatus === "verified") {
            navigate(routes.login + "?verified=true");
        }
    }, [verificationStatus, navigate, routes.login]);

    // Handle post-auth navigation
    useEffect(() => {
        if (isLoading || error || verificationStatus === "verified") return;

        if (isAuthenticated && !needsProfileCompletion) {
            navigate(targetAfterLogin);
        } else if (!isAuthenticated) {
            navigate(routes.login);
        }
    }, [isLoading, isAuthenticated, needsProfileCompletion, error, navigate, targetAfterLogin, routes.login, verificationStatus]);

    // Profile completion form
    if (isAuthenticated && needsProfileCompletion) {
        const dk = theme.isDark;
        return (
            <div style={{
                display: "flex",
                minHeight: "100vh",
                alignItems: "center",
                justifyContent: "center",
                background: dk ? "#0f0f1a" : "#f8fafc",
                padding: "16px",
                fontFamily: theme.styles.fontFamily,
            }}>
                <div style={{ width: "100%", maxWidth: "448px" }}>
                    <CompleteProfile
                        onComplete={() => navigate(targetAfterLogin)}
                        allowSkip={allowSkipProfile}
                    />
                </div>
            </div>
        );
    }

    // Loading state — styled with theme
    const dk = theme.isDark;
    return (
        <div style={{
            display: "flex",
            minHeight: "100vh",
            alignItems: "center",
            justifyContent: "center",
            background: dk ? "#0f0f1a" : "#f8fafc",
            fontFamily: theme.styles.fontFamily,
        }}>
            <div style={{ textAlign: "center" }}>
                <div style={{
                    width: "32px",
                    height: "32px",
                    border: `3px solid ${dk ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`,
                    borderTopColor: dk ? "#6366f1" : "#4f46e5",
                    borderRadius: "50%",
                    margin: "0 auto 16px",
                    animation: "hj-callback-spin 0.8s linear infinite",
                }} />
                <style>{`@keyframes hj-callback-spin { to { transform: rotate(360deg); } }`}</style>
                <p style={{
                    color: dk ? "#94a3b8" : "#64748b",
                    fontSize: "14px",
                    margin: 0,
                }}>
                    Loading...
                </p>
            </div>
        </div>
    );
}

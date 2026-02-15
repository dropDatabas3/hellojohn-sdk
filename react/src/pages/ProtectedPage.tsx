"use client";
import React, { ReactNode } from "react";
import { AuthGuard, type AuthGuardProps } from "../components/AuthGuard";
import { getTheme } from "../lib/themes";
import { useAuth } from "../context";

export interface ProtectedPageProps {
    children: ReactNode;
    /** Require a specific role */
    role?: string | string[];
    /** Require a specific permission */
    permission?: string;
    /** Enforce profile completion before rendering. Default: true */
    requireCompleteProfile?: boolean;
    /** Custom redirect path for unauthenticated users */
    redirectTo?: string;
    /** Custom loading component */
    loading?: ReactNode;
}

/**
 * Pre-built protected page wrapper. Redirects to login if not authenticated.
 * Wraps AuthGuard with redirect=true and themed loading state.
 *
 * @example
 * // Next.js: app/(protected)/layout.tsx
 * import { ProtectedPage } from "@hellojohn/react/pages"
 * export default function ProtectedLayout({ children }) {
 *   return <ProtectedPage>{children}</ProtectedPage>
 * }
 *
 * @example
 * // Require admin role
 * <ProtectedPage role="admin">
 *   <AdminPanel />
 * </ProtectedPage>
 */
export function ProtectedPage({
    children,
    role,
    permission,
    requireCompleteProfile = true,
    redirectTo,
    loading,
}: ProtectedPageProps) {
    const { theme: themeName } = useAuth();
    const theme = getTheme(themeName === "auto" ? "minimal" : themeName);
    const dk = theme.isDark;

    const defaultLoading = (
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
                    animation: "hj-protected-spin 0.8s linear infinite",
                }} />
                <style>{`@keyframes hj-protected-spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );

    return (
        <AuthGuard
            redirect
            redirectTo={redirectTo}
            requireCompleteProfile={requireCompleteProfile}
            role={role}
            permission={permission}
            loading={loading || defaultLoading}
        >
            {children}
        </AuthGuard>
    );
}

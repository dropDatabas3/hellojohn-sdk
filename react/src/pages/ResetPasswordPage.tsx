"use client";
import React from "react";
import { ResetPassword, type ResetPasswordProps } from "../components/ResetPassword";
import { useRoutes, useHJNavigate, useSearchParam } from "../routing";
import { useAuth } from "../context";
import { useI18n } from "../i18n";

export interface ResetPasswordPageProps extends Partial<Omit<ResetPasswordProps, "token">> {
    /** Override token extraction (default: reads ?token= from URL) */
    token?: string;
}

/**
 * Pre-built reset password page. Automatically extracts ?token= from URL.
 *
 * @example
 * // Next.js: app/reset-password/page.tsx (one line!)
 * export { ResetPasswordPage as default } from "@hellojohn/react/pages"
 */
export function ResetPasswordPage(props: ResetPasswordPageProps) {
    const routes = useRoutes();
    const navigate = useHJNavigate();
    const { theme } = useAuth();
    const i18n = useI18n();
    const urlToken = useSearchParam("token");
    const token = props.token || urlToken || "";

    // If no token found, show an error state
    if (!token) {
        return (
            <ResetPassword
                token=""
                signInUrl={routes.login}
                theme={theme}
                onSuccess={() => navigate(routes.login)}
                {...props}
            />
        );
    }

    return (
        <ResetPassword
            token={token}
            signInUrl={routes.login}
            theme={theme}
            onSuccess={() => navigate(routes.login)}
            {...props}
        />
    );
}

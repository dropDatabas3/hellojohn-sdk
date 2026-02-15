"use client";
import React from "react";
import { ForgotPassword, type ForgotPasswordProps } from "../components/ForgotPassword";
import { useRoutes } from "../routing";
import { useAuth } from "../context";

export interface ForgotPasswordPageProps extends Partial<ForgotPasswordProps> {}

/**
 * Pre-built forgot password page. Reads routes and theme from AuthProvider context.
 *
 * @example
 * // Next.js: app/forgot-password/page.tsx (one line!)
 * export { ForgotPasswordPage as default } from "@hellojohn/react/pages"
 */
export function ForgotPasswordPage(props: ForgotPasswordPageProps) {
    const routes = useRoutes();
    const { theme } = useAuth();

    return (
        <ForgotPassword
            signInUrl={routes.login}
            theme={theme}
            {...props}
        />
    );
}

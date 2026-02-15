"use client";
import React from "react";
import { SignUp, type SignUpProps } from "../components/SignUp";
import { useRoutes, useHJNavigate } from "../routing";
import { useAuth } from "../context";

export interface RegisterPageProps extends Partial<SignUpProps> {}

/**
 * Pre-built registration page. Reads routes and theme from AuthProvider context.
 *
 * @example
 * // Next.js: app/register/page.tsx (one line!)
 * export { RegisterPage as default } from "@hellojohn/react/pages"
 */
export function RegisterPage(props: RegisterPageProps) {
    const routes = useRoutes();
    const navigate = useHJNavigate();
    const { theme } = useAuth();

    return (
        <SignUp
            signInUrl={routes.login}
            redirectTo={routes.afterLogin}
            onSuccess={() => navigate(routes.afterLogin)}
            theme={theme}
            {...props}
        />
    );
}

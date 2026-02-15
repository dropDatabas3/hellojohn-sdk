"use client";
import React from "react";
import { SignIn, type SignInProps } from "../components/SignIn";
import { useRoutes, useHJNavigate } from "../routing";
import { useAuth } from "../context";

export interface LoginPageProps extends Partial<SignInProps> {}

/**
 * Pre-built login page. Reads routes and theme from AuthProvider context.
 *
 * @example
 * // Next.js: app/login/page.tsx (one line!)
 * export { LoginPage as default } from "@hellojohn/react/pages"
 *
 * @example
 * // With overrides
 * export default function Login() {
 *   return <LoginPage backgroundImage="/hero.jpg" glassmorphism />;
 * }
 */
export function LoginPage(props: LoginPageProps) {
    const routes = useRoutes();
    const navigate = useHJNavigate();
    const { theme } = useAuth();

    return (
        <SignIn
            signUpUrl={routes.register}
            forgotPasswordUrl={routes.forgotPassword}
            redirectTo={routes.afterLogin}
            onSuccess={() => navigate(routes.afterLogin)}
            theme={theme}
            {...props}
        />
    );
}

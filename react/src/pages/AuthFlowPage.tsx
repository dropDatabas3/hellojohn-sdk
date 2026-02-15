"use client";
import React, { ReactNode, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context";
import { normalizeAuthBasePath } from "../routing";
import { CallbackPage, type CallbackPageProps } from "./CallbackPage";
import { ForgotPasswordPage, type ForgotPasswordPageProps } from "./ForgotPasswordPage";
import { LoginPage, type LoginPageProps } from "./LoginPage";
import { RegisterPage, type RegisterPageProps } from "./RegisterPage";
import { ResetPasswordPage, type ResetPasswordPageProps } from "./ResetPasswordPage";
import { type AuthFlow, resolveAuthFlow } from "./authFlowResolver";

export interface AuthFlowPageProps {
    /** Explicitly force a flow (takes priority over URL). */
    flow?: AuthFlow;
    /** Fallback flow when URL flow is missing/invalid. Default: "login". */
    fallbackFlow?: AuthFlow;
    /** Override base auth path used for URL flow extraction. */
    basePath?: string;
    /** Optional loading placeholder while client location is being resolved. */
    loading?: ReactNode;
    /** Per-flow overrides (optional). */
    loginProps?: Partial<LoginPageProps>;
    registerProps?: Partial<RegisterPageProps>;
    forgotPasswordProps?: Partial<ForgotPasswordPageProps>;
    resetPasswordProps?: Partial<ResetPasswordPageProps>;
    callbackProps?: Partial<CallbackPageProps>;
}

/**
 * Pre-built auth flow page with internal branching.
 *
 * Designed for quick mode integrations:
 * - Next.js: app/auth/[[...flow]]/page.tsx
 * - Consumer does not need custom switch/case logic.
 *
 * Resolution order:
 * 1) `flow` prop
 * 2) pathname segment under basePath (e.g. /auth/register)
 * 3) ?flow= query param
 * 4) fallbackFlow/login
 */
export function AuthFlowPage({
    flow,
    fallbackFlow = "login",
    basePath,
    loading = null,
    loginProps,
    registerProps,
    forgotPasswordProps,
    resetPasswordProps,
    callbackProps,
}: AuthFlowPageProps) {
    const { authBasePath } = useAuth();
    const resolvedBasePath = useMemo(
        () => normalizeAuthBasePath(basePath || authBasePath),
        [basePath, authBasePath]
    );

    const [locationState, setLocationState] = useState<{ pathname: string | null; search: string | null }>({
        pathname: null,
        search: null,
    });

    useEffect(() => {
        if (typeof window === "undefined") return;
        setLocationState({
            pathname: window.location.pathname,
            search: window.location.search,
        });
    }, []);

    const resolvedFlow = useMemo(
        () =>
            resolveAuthFlow({
                flow,
                fallbackFlow,
                pathname: locationState.pathname,
                search: locationState.search,
                basePath: resolvedBasePath,
            }),
        [flow, fallbackFlow, locationState.pathname, locationState.search, resolvedBasePath]
    );

    // Keep first render identical on server and client to avoid hydration mismatches.
    if (!flow && locationState.pathname === null) {
        return <>{loading}</>;
    }

    switch (resolvedFlow) {
        case "register":
            return <RegisterPage {...registerProps} />;
        case "forgot-password":
            return <ForgotPasswordPage {...forgotPasswordProps} />;
        case "reset-password":
            return <ResetPasswordPage {...resetPasswordProps} />;
        case "callback":
            return <CallbackPage {...callbackProps} />;
        case "login":
        default:
            return <LoginPage {...loginProps} />;
    }
}

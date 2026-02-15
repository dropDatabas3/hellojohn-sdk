import React, { ReactNode, useEffect } from "react";
import { useAuth } from "../context";
import { useRole } from "../hooks/useRole";
import { useRoutes, useHJNavigate } from "../routing";

export interface AuthGuardProps {
    children: ReactNode;
    /** Require authentication. Default: true */
    authenticated?: boolean;
    /** Require a specific role (or any of the roles if array) */
    role?: string | string[];
    /** Require a specific permission */
    permission?: string;
    /** Content to render while checking auth state */
    loading?: ReactNode;
    /** Content to render when not authorized (only used when redirect is false) */
    fallback?: ReactNode;
    /** If true, redirect to login route instead of rendering fallback. Default: false */
    redirect?: boolean;
    /** Custom redirect path. Overrides routes.login from context. */
    redirectTo?: string;
    /** If true, redirect to callback when profile is incomplete. Default: false */
    requireCompleteProfile?: boolean;
}

/**
 * AuthGuard gates content based on auth state, roles, and permissions.
 *
 * @example
 * // Render-gating (original behavior)
 * <AuthGuard fallback={<Navigate to="/login" />}>
 *   <Dashboard />
 * </AuthGuard>
 *
 * @example
 * // Auto-redirect to login (zero-config)
 * <AuthGuard redirect>
 *   <Dashboard />
 * </AuthGuard>
 *
 * @example
 * // Require admin role with redirect
 * <AuthGuard role="admin" redirect redirectTo="/unauthorized">
 *   <AdminPanel />
 * </AuthGuard>
 *
 * @example
 * // Require profile completion
 * <AuthGuard redirect requireCompleteProfile>
 *   <Dashboard />
 * </AuthGuard>
 */
export function AuthGuard({
    children,
    authenticated = true,
    role,
    permission,
    loading = null,
    fallback = null,
    redirect = false,
    redirectTo,
    requireCompleteProfile = false,
}: AuthGuardProps) {
    const { isAuthenticated, isLoading, needsProfileCompletion } = useAuth();
    const { hasRole, hasPermission } = useRole();
    const routes = useRoutes();
    const navigate = useHJNavigate();

    // Determine authorization status
    let authorized = true;
    let reason: "loading" | "unauthenticated" | "profile_incomplete" | "role" | "permission" | null = null;

    if (isLoading) {
        reason = "loading";
    } else if (authenticated && !isAuthenticated) {
        authorized = false;
        reason = "unauthenticated";
    } else if (requireCompleteProfile && needsProfileCompletion) {
        authorized = false;
        reason = "profile_incomplete";
    } else if (role) {
        const hasRequiredRole = Array.isArray(role)
            ? role.some(r => hasRole(r))
            : hasRole(role);
        if (!hasRequiredRole) {
            authorized = false;
            reason = "role";
        }
    } else if (permission && !hasPermission(permission)) {
        authorized = false;
        reason = "permission";
    }

    // Handle redirect when not authorized
    useEffect(() => {
        if (isLoading || authorized || !redirect) return;

        if (reason === "unauthenticated") {
            navigate(redirectTo || routes.login);
        } else if (reason === "profile_incomplete") {
            navigate(routes.callback);
        }
        // For role/permission failures, redirect to login by default
        else if (reason === "role" || reason === "permission") {
            navigate(redirectTo || routes.login);
        }
    }, [isLoading, authorized, redirect, reason, redirectTo, routes, navigate]);

    // Loading state
    if (isLoading) {
        return <>{loading}</>;
    }

    // Not authorized
    if (!authorized) {
        // If redirect mode, render nothing (navigation is happening via useEffect)
        if (redirect) return null;
        // Otherwise render fallback
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

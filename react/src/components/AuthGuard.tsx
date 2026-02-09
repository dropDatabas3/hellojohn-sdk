import React, { ReactNode } from "react";
import { useAuth } from "../context";
import { useRole } from "../hooks/useRole";

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
    /** Content to render when not authorized */
    fallback?: ReactNode;
}

/**
 * AuthGuard gates content based on auth state, roles, and permissions.
 *
 * @example
 * // Require authentication
 * <AuthGuard fallback={<Navigate to="/login" />}>
 *   <Dashboard />
 * </AuthGuard>
 *
 * @example
 * // Require admin role
 * <AuthGuard role="admin" fallback={<p>Access denied</p>}>
 *   <AdminPanel />
 * </AuthGuard>
 *
 * @example
 * // Require specific permission
 * <AuthGuard permission="users:write">
 *   <UserEditor />
 * </AuthGuard>
 */
export function AuthGuard({
    children,
    authenticated = true,
    role,
    permission,
    loading = null,
    fallback = null,
}: AuthGuardProps) {
    const { isAuthenticated, isLoading } = useAuth();
    const { hasRole, hasPermission } = useRole();

    if (isLoading) {
        return <>{loading}</>;
    }

    if (authenticated && !isAuthenticated) {
        return <>{fallback}</>;
    }

    if (role) {
        const hasRequiredRole = Array.isArray(role)
            ? role.some(r => hasRole(r))
            : hasRole(role);
        if (!hasRequiredRole) return <>{fallback}</>;
    }

    if (permission && !hasPermission(permission)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

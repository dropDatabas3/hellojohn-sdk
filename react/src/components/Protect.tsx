import React, { ReactNode } from "react";
import { useRole } from "../hooks/useRole";

interface ProtectProps {
    children: ReactNode;
    role?: string | string[];
    permission?: string;
    fallback?: ReactNode;
}

export function Protect({ children, role, permission, fallback }: ProtectProps) {
    const { hasRole, hasPermission } = useRole();

    let authorized = true;

    if (role) {
        if (Array.isArray(role)) {
            authorized = role.some(r => hasRole(r));
        } else {
            authorized = hasRole(role);
        }
    }

    if (permission && authorized) {
        authorized = hasPermission(permission);
    }

    if (!authorized) {
        return <>{fallback || null}</>;
    }

    return <>{children}</>;
}

import { useMemo } from "react";
import { useAuth } from "../context";

export function useRole() {
    const { hasRole, hasPermission, user } = useAuth();

    const { roles, permissions, isAdmin } = useMemo(() => {
        if (!user || !user.custom) return { roles: [] as string[], permissions: [] as string[], isAdmin: false };

        let allRoles: string[] = [];
        let allPerms: string[] = [];
        let admin = false;

        for (const k in user.custom) {
            if (k.endsWith("/claims/sys")) {
                const sys = user.custom[k];
                if (sys.is_admin) admin = true;
                if (Array.isArray(sys.roles)) allRoles = allRoles.concat(sys.roles);
                if (Array.isArray(sys.perms)) allPerms = allPerms.concat(sys.perms);
            }
        }

        return { roles: allRoles, permissions: allPerms, isAdmin: admin };
    }, [user]);

    return {
        hasRole,
        hasPermission,
        roles,
        permissions,
        isAdmin,
        user,
    };
}

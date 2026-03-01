import { useAuth } from "../context";

export interface UseUserResult {
    user: ReturnType<typeof useAuth>["user"];
    isLoading: boolean;
}

export function useUser(): UseUserResult {
    const { user, isLoading } = useAuth();
    return { user, isLoading };
}

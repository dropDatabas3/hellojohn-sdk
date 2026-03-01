import { useAuth } from "./useAuth";

export function useUser() {
  const { user, isLoading } = useAuth();
  return { user, isLoading };
}

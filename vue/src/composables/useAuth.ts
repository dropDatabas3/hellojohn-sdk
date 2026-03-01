import type { MFARequiredResult, User } from "@hellojohn/js";
import { computed, inject, readonly } from "vue";
import { HELLOJOHN_INJECTION_KEY } from "../plugin";
import type { HelloJohnContextValue, LoginPasswordResult, SignUpResult } from "../types";
import { toHelloJohnUser } from "../types";

function isMFARequiredResult(value: User | MFARequiredResult): value is MFARequiredResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "requiresMFA" in value &&
    value.requiresMFA === true
  );
}

export function useAuth() {
  const context = inject<HelloJohnContextValue>(HELLOJOHN_INJECTION_KEY);

  if (!context) {
    throw new Error(
      "[HelloJohn] useAuth() requiere createHelloJohn(). Asegurate de ejecutar app.use(createHelloJohn(options))."
    );
  }

  const { auth, state, options } = context;

  const isAuthenticated = computed(() => state.isAuthenticated);
  const user = computed(() => state.user);
  const isLoading = computed(() => state.isLoading);
  const error = computed(() => state.error);

  async function refreshUser(): Promise<void> {
    const profile = await auth.getUser();
    state.isAuthenticated = Boolean(profile);
    state.user = profile ? toHelloJohnUser(profile) : null;
  }

  async function loginWithRedirect(): Promise<void> {
    const redirectUri = options.redirectUri ?? (typeof window !== "undefined" ? window.location.origin : "");
    await auth.loginWithRedirect({ appState: { redirectUri } });
  }

  async function loginWithPassword(email: string, password: string): Promise<LoginPasswordResult> {
    state.isLoading = true;
    state.error = null;

    try {
      const result = await auth.loginWithPassword(email, password);
      if (isMFARequiredResult(result)) {
        return result;
      }

      state.isAuthenticated = true;
      state.user = toHelloJohnUser(result);
      return state.user;
    } catch (err: unknown) {
      state.error = err instanceof Error ? err.message : "Login failed";
      throw err;
    } finally {
      state.isLoading = false;
    }
  }

  async function signUp(email: string, password: string, name?: string): Promise<SignUpResult> {
    state.isLoading = true;
    state.error = null;
    try {
      const result = await auth.register({ email, password, name });
      if (auth.isAuthenticated()) {
        await refreshUser();
      }
      return result;
    } catch (err: unknown) {
      state.error = err instanceof Error ? err.message : "Registration failed";
      throw err;
    } finally {
      state.isLoading = false;
    }
  }

  function logout(returnTo?: string): void {
    state.isAuthenticated = false;
    state.user = null;
    auth.logout(returnTo);
  }

  async function handleRedirectCallback(url?: string): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }

    state.isLoading = true;
    state.error = null;

    try {
      await auth.handleRedirectCallback(url ?? window.location.href);
      await refreshUser();
    } catch (err: unknown) {
      state.error = err instanceof Error ? err.message : "Redirect callback failed";
      throw err;
    } finally {
      state.isLoading = false;
    }
  }

  return {
    isAuthenticated: readonly(isAuthenticated),
    user: readonly(user),
    isLoading: readonly(isLoading),
    error: readonly(error),
    loginWithRedirect,
    loginWithPassword,
    signUp,
    logout,
    handleRedirectCallback,
    auth
  };
}

import { createHelloJohn as createJSClient, type AuthClient, type User } from "@hellojohn/js";
import type { App, InjectionKey } from "vue";
import { reactive } from "vue";
import type { AuthState, HelloJohnContextValue, HelloJohnOptions } from "./types";
import { toHelloJohnUser } from "./types";

export const HELLOJOHN_INJECTION_KEY: InjectionKey<HelloJohnContextValue> = Symbol("hellojohn");

function resolveRedirectUri(redirectUri?: string): string {
  if (redirectUri) {
    return redirectUri;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}/callback`;
  }
  return "";
}

function isUser(value: unknown): value is User {
  return typeof value === "object" && value !== null && typeof (value as User).sub === "string";
}

async function hydrateUser(auth: AuthClient, state: AuthState): Promise<void> {
  const hasSession = auth.isAuthenticated();
  if (!hasSession) {
    state.isAuthenticated = false;
    state.user = null;
    return;
  }

  const profile = await auth.getUser();
  state.isAuthenticated = Boolean(profile);
  state.user = profile && isUser(profile) ? toHelloJohnUser(profile) : null;
}

export function createHelloJohn(options: HelloJohnOptions) {
  return {
    install(app: App): void {
      const auth = createJSClient({
        domain: options.domain,
        clientID: options.clientId,
        tenantID: options.tenantId,
        redirectURI: resolveRedirectUri(options.redirectUri)
      });

      const state = reactive<AuthState>({
        isAuthenticated: false,
        user: null,
        isLoading: true,
        error: null
      });

      const context: HelloJohnContextValue = { auth, state, options };

      const init = async (): Promise<void> => {
        state.isLoading = true;
        state.error = null;
        try {
          await hydrateUser(auth, state);
        } catch (error: unknown) {
          state.error = error instanceof Error ? error.message : "Failed to initialize auth state";
          state.isAuthenticated = false;
          state.user = null;
        } finally {
          state.isLoading = false;
        }
      };

      auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT" || event === "SESSION_EXPIRED") {
          state.isAuthenticated = false;
          state.user = null;
          state.error = null;
          return;
        }

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          void hydrateUser(auth, state);
        }
      });

      if (typeof window !== "undefined") {
        void init();
      } else {
        state.isLoading = false;
      }

      app.provide(HELLOJOHN_INJECTION_KEY, context);
      app.config.globalProperties.$hj = { auth, state };
    }
  };
}

declare module "@vue/runtime-core" {
  interface ComponentCustomProperties {
    $hj: {
      auth: AuthClient;
      state: AuthState;
    };
  }
}

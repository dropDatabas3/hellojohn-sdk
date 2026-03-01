import { useHelloJohnContext } from "../context";
import { loginWithPKCE, type PKCEFlowResult } from "../oauth/pkceFlow";

export function useAuth() {
  const context = useHelloJohnContext();

  async function loginWithRedirect(scopes?: string[]): Promise<PKCEFlowResult> {
    const result = await loginWithPKCE({
      domain: context.domain,
      clientId: context.clientId,
      tenantId: context.tenantId,
      redirectScheme: context.redirectScheme,
      redirectUri: context.redirectUri,
      scopes
    });

    await context.applyPKCEResult(result);
    return result;
  }

  return {
    isAuthenticated: context.isAuthenticated,
    user: context.user,
    isLoading: context.isLoading,
    error: context.error,
    login: context.login,
    loginWithRedirect,
    logout: context.logout,
    auth: context.auth
  };
}

import type { AuthClient, MFARequiredResult, User } from "@hellojohn/js";
import type { PKCEFlowResult } from "./oauth/pkceFlow";

export type HelloJohnUser = User;

export interface HelloJohnRNOptions {
  domain: string;
  clientId: string;
  tenantId?: string;
  redirectScheme?: string;
  redirectUri?: string;
}

export type LoginWithPasswordResult = HelloJohnUser | MFARequiredResult;

export interface AuthContextValue {
  isAuthenticated: boolean;
  user: HelloJohnUser | null;
  isLoading: boolean;
  error: string | null;
  domain: string;
  clientId: string;
  tenantId?: string;
  redirectScheme?: string;
  redirectUri: string;
  login: (email: string, password: string) => Promise<LoginWithPasswordResult>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  applyPKCEResult: (result: PKCEFlowResult) => Promise<void>;
  auth: AuthClient;
}

export function isMFARequiredResult(value: LoginWithPasswordResult): value is MFARequiredResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "requiresMFA" in value &&
    value.requiresMFA === true
  );
}

export function toHelloJohnUser(claims: Record<string, unknown>): HelloJohnUser {
  const sub = typeof claims.sub === "string" ? claims.sub : "";
  const email = typeof claims.email === "string" ? claims.email : undefined;
  const name = typeof claims.name === "string" ? claims.name : undefined;
  const picture = typeof claims.picture === "string" ? claims.picture : undefined;

  return {
    ...claims,
    sub,
    email,
    name,
    picture
  };
}

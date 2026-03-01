import type { AuthClient, MFARequiredResult, RegisterResponse, User } from "@hellojohn/js";

export interface HelloJohnUser {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  roles: string[];
  claims: Record<string, unknown>;
}

export interface HelloJohnOptions {
  domain: string;
  clientId: string;
  tenantId?: string;
  redirectUri?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: HelloJohnUser | null;
  isLoading: boolean;
  error: string | null;
}

export interface HelloJohnContextValue {
  auth: AuthClient;
  state: AuthState;
  options: HelloJohnOptions;
}

export type LoginPasswordResult = HelloJohnUser | MFARequiredResult;
export type SignUpResult = RegisterResponse;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function extractRolesFromCustom(userClaims: Record<string, unknown>): string[] {
  const customValue = userClaims.custom;
  if (!isRecord(customValue)) {
    return [];
  }

  for (const [key, value] of Object.entries(customValue)) {
    if (!key.endsWith("/claims/sys") || !isRecord(value)) {
      continue;
    }
    const roles = readStringArray(value.roles);
    if (roles.length > 0) {
      return roles;
    }
  }

  return [];
}

export function toHelloJohnUser(user: User): HelloJohnUser {
  const claims = { ...(user as unknown as Record<string, unknown>) };
  const directRoles = readStringArray(claims.roles);
  const derivedRoles = directRoles.length > 0 ? directRoles : extractRolesFromCustom(claims);

  return {
    id: user.sub,
    email: typeof user.email === "string" ? user.email : "",
    name: typeof user.name === "string" ? user.name : undefined,
    picture: typeof user.picture === "string" ? user.picture : undefined,
    roles: derivedRoles,
    claims
  };
}

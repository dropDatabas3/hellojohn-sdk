import { decodeJWTPayload } from "@hellojohn/js";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

export interface PKCEFlowOptions {
  domain: string;
  clientId: string;
  tenantId?: string;
  redirectUri?: string;
  redirectScheme?: string;
  scopes?: string[];
}

export interface PKCEFlowResult {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  tokenType: string;
  scope: string;
  expiresIn: number;
  user: Record<string, unknown>;
}

function normalizeDomain(domain: string): string {
  return domain.replace(/\/$/, "");
}

export async function loginWithPKCE(options: PKCEFlowOptions): Promise<PKCEFlowResult> {
  const redirectUri =
    options.redirectUri ??
    AuthSession.makeRedirectUri(
      options.redirectScheme
        ? {
            scheme: options.redirectScheme
          }
        : undefined
    );

  const scopes = options.scopes ?? ["openid", "profile", "email"];
  const discovery: AuthSession.DiscoveryDocument = {
    authorizationEndpoint: `${normalizeDomain(options.domain)}/oauth2/authorize`,
    tokenEndpoint: `${normalizeDomain(options.domain)}/oauth2/token`
  };

  const request = new AuthSession.AuthRequest({
    clientId: options.clientId,
    responseType: AuthSession.ResponseType.Code,
    scopes,
    redirectUri,
    usePKCE: true,
    extraParams: options.tenantId
      ? {
          tenant_id: options.tenantId
        }
      : undefined
  });

  await request.makeAuthUrlAsync(discovery);
  const authResult = await request.promptAsync(discovery);

  if (authResult.type !== "success" || typeof authResult.params.code !== "string") {
    throw new Error(`OAuth flow failed: ${authResult.type}`);
  }

  const codeVerifier =
    typeof request.codeVerifier === "string" && request.codeVerifier.length > 0
      ? request.codeVerifier
      : undefined;

  const tokenResult = await AuthSession.exchangeCodeAsync(
    {
      clientId: options.clientId,
      code: authResult.params.code,
      redirectUri,
      extraParams: codeVerifier
        ? {
            code_verifier: codeVerifier
          }
        : undefined
    },
    discovery
  );

  if (!tokenResult.accessToken) {
    throw new Error("No access token received");
  }

  const rawClaims = tokenResult.idToken ? decodeJWTPayload(tokenResult.idToken) : null;
  const userClaims =
    rawClaims && typeof rawClaims === "object" ? (rawClaims as Record<string, unknown>) : {};

  return {
    accessToken: tokenResult.accessToken,
    refreshToken: tokenResult.refreshToken ?? undefined,
    idToken: tokenResult.idToken ?? undefined,
    tokenType: tokenResult.tokenType ?? "Bearer",
    scope: tokenResult.scope ?? scopes.join(" "),
    expiresIn: tokenResult.expiresIn ?? 3600,
    user: userClaims
  };
}

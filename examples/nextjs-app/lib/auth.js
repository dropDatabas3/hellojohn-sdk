/**
 * Shared auth configuration for both client and server.
 */

export const DOMAIN = process.env.NEXT_PUBLIC_HELLOJOHN_DOMAIN || "http://localhost:8080";
export const CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID || "my-nextjs-app";
export const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || "local";

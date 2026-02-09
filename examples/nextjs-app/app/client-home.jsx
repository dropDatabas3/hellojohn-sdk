"use client";

/**
 * Client-side home component with auth state.
 * Demonstrates: useAuth(), UserButton, AuthGuard.
 */
import Link from "next/link";
import { useAuth, UserButton, AuthGuard } from "@hellojohn/react";

export default function ClientHome({ serverSession }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
      {/* Nav */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #e5e7eb", marginBottom: 32 }}>
        <span style={{ fontWeight: 700, fontSize: 20 }}>HelloJohn + Next.js</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isLoading ? (
            <span style={{ color: "#9ca3af" }}>...</span>
          ) : isAuthenticated ? (
            <>
              <Link href="/dashboard" style={{ color: "#4f46e5", textDecoration: "none" }}>Dashboard</Link>
              <UserButton />
            </>
          ) : (
            <Link href="/login" style={{ color: "#4f46e5", textDecoration: "none" }}>Sign In</Link>
          )}
        </div>
      </nav>

      {/* SSR Info */}
      {serverSession && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: 16, marginBottom: 24, fontSize: 13 }}>
          <strong>SSR Session Detected:</strong> User {serverSession.user?.sub} (resolved server-side via cookies)
        </div>
      )}

      {/* Main content */}
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>HelloJohn Next.js Example</h1>
      <p style={{ color: "#6b7280", marginBottom: 24 }}>
        Demonstrates SSR authentication with createServerClient, client-side HelloJohnProvider, and protected routes.
      </p>

      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
          <h3>Client-Side Auth</h3>
          <p style={{ fontSize: 14, color: "#6b7280" }}>
            Status: {isLoading ? "Loading..." : isAuthenticated ? `Authenticated as ${user?.email}` : "Not authenticated"}
          </p>
        </div>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
          <h3>Server-Side Auth</h3>
          <p style={{ fontSize: 14, color: "#6b7280" }}>
            {serverSession ? `Session for user ${serverSession.user?.sub}` : "No server session (no auth cookie)"}
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

/**
 * Protected dashboard page.
 * Demonstrates: AuthGuard, useAuth, useRole.
 */
import { useAuth, AuthGuard, useRole } from "@hellojohn/react";
import Link from "next/link";

function DashboardContent() {
  const { user } = useAuth();
  const { roles, permissions, isAdmin } = useRole();

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
      <nav style={{ marginBottom: 24 }}>
        <Link href="/" style={{ color: "#4f46e5", textDecoration: "none" }}>&larr; Home</Link>
      </nav>

      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>Protected Dashboard</h1>

      <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>Your Profile</h2>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>Roles:</strong> {roles.join(", ") || "none"}</p>
        <p><strong>Permissions:</strong> {permissions.join(", ") || "none"}</p>
        <p><strong>Admin:</strong> {isAdmin ? "Yes" : "No"}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard
      authenticated
      loading={<p style={{ textAlign: "center", padding: 40 }}>Checking auth...</p>}
      fallback={
        <div style={{ textAlign: "center", padding: 40 }}>
          <p>Please sign in to access the dashboard.</p>
          <Link href="/login" style={{ color: "#4f46e5" }}>Sign In</Link>
        </div>
      }
    >
      <DashboardContent />
    </AuthGuard>
  );
}

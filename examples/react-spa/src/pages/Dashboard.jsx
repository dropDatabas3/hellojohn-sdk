/**
 * Dashboard page — protected content.
 * Demonstrates: useAuth() hook, AuthGuard, useRole(), conditional rendering.
 */
import { Link } from "react-router-dom";
import { useAuth, AuthGuard, useRole } from "@hellojohn/react";

function ProtectedDashboard() {
  const { user, logout } = useAuth();
  const { roles, permissions, isAdmin } = useRole();

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>Dashboard</h1>
      <p style={{ color: "#6b7280", marginBottom: 24 }}>
        Welcome back, {user?.name || user?.email || "User"}!
      </p>

      {/* User Info Card */}
      <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20, marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>User Info</h2>
        <pre style={{ fontSize: 13, overflow: "auto", background: "#fff", padding: 12, borderRadius: 4 }}>
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>

      {/* RBAC Info Card */}
      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: 20, marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Roles & Permissions</h2>
        <p><strong>Admin:</strong> {isAdmin ? "Yes" : "No"}</p>
        <p><strong>Roles:</strong> {roles.length > 0 ? roles.join(", ") : "none"}</p>
        <p><strong>Permissions:</strong> {permissions.length > 0 ? permissions.join(", ") : "none"}</p>
      </div>

      {/* Admin Section */}
      <AuthGuard
        role="admin"
        fallback={
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 20, marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#b91c1c" }}>Admin Panel (Restricted)</h2>
            <p style={{ color: "#dc2626" }}>You need the "admin" role to view this section.</p>
          </div>
        }
      >
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: 20, marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#1d4ed8" }}>Admin Panel</h2>
          <p>You have admin access! This content is protected by AuthGuard.</p>
        </div>
      </AuthGuard>

      {/* Token Refresh Indicator */}
      <div style={{ background: "#fefce8", border: "1px solid #fde68a", borderRadius: 8, padding: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Token Refresh</h2>
        <p style={{ fontSize: 13, color: "#92400e" }}>
          Open the browser console to see automatic token refresh events.
          The SDK refreshes tokens at 75% of their lifetime.
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard
      authenticated
      loading={<p style={{ color: "#9ca3af" }}>Checking authentication...</p>}
      fallback={
        <div style={{ textAlign: "center", paddingTop: 60 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Welcome to HelloJohn</h1>
          <p style={{ color: "#6b7280", marginBottom: 24 }}>
            A self-hosted, multi-tenant auth platform for developers.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link to="/login" style={{ display: "inline-block", padding: "10px 24px", background: "#4f46e5", color: "#fff", borderRadius: 8, textDecoration: "none", fontWeight: 500 }}>
              Sign In
            </Link>
            <Link to="/register" style={{ display: "inline-block", padding: "10px 24px", border: "1px solid #4f46e5", color: "#4f46e5", borderRadius: 8, textDecoration: "none", fontWeight: 500 }}>
              Sign Up
            </Link>
          </div>
        </div>
      }
    >
      <ProtectedDashboard />
    </AuthGuard>
  );
}

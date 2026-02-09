/**
 * Root layout with navigation bar.
 * Demonstrates: useAuth() hook, <UserButton /> component, conditional rendering.
 */
import { Outlet, Link } from "react-router-dom";
import { useAuth, UserButton } from "@hellojohn/react";

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 960, margin: "0 auto", padding: 20 }}>
      {/* Navigation Bar */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #e5e7eb", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link to="/" style={{ fontWeight: 700, fontSize: 20, textDecoration: "none", color: "#111" }}>
            HelloJohn SPA
          </Link>
          <Link to="/" style={{ textDecoration: "none", color: "#6b7280" }}>Dashboard</Link>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isLoading ? (
            <span style={{ color: "#9ca3af" }}>Loading...</span>
          ) : isAuthenticated ? (
            <UserButton />
          ) : (
            <>
              <Link to="/login" style={{ textDecoration: "none", color: "#4f46e5" }}>Sign In</Link>
              <Link to="/register" style={{ textDecoration: "none", color: "#4f46e5", padding: "6px 16px", border: "1px solid #4f46e5", borderRadius: 6 }}>Sign Up</Link>
            </>
          )}
        </div>
      </nav>

      {/* Page Content */}
      <Outlet />
    </div>
  );
}

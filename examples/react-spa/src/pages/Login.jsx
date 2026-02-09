/**
 * Login page using HelloJohn <SignIn /> component.
 * Demonstrates: pre-built auth component with theming.
 */
import { Navigate } from "react-router-dom";
import { useAuth, SignIn } from "@hellojohn/react";

export default function LoginPage() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
      <SignIn
        onSuccess={() => {
          console.log("[HelloJohn] Login successful!");
          window.location.href = "/";
        }}
      />
    </div>
  );
}

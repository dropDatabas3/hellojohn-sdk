/**
 * Registration page using HelloJohn <SignUp /> component.
 * Demonstrates: pre-built sign-up component.
 */
import { Navigate } from "react-router-dom";
import { useAuth, SignUp } from "@hellojohn/react";

export default function RegisterPage() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
      <SignUp
        onSuccess={() => {
          console.log("[HelloJohn] Registration successful!");
          window.location.href = "/";
        }}
      />
    </div>
  );
}

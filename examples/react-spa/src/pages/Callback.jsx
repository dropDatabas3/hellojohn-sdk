/**
 * OAuth callback page.
 * Handles the redirect after OAuth2/Social login.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@hellojohn/react";

export default function CallbackPage() {
  const { handleRedirectCallback } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    handleRedirectCallback()
      .then(() => navigate("/", { replace: true }))
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div style={{ textAlign: "center", paddingTop: 60 }}>
        <h1 style={{ color: "#dc2626" }}>Authentication Error</h1>
        <p>{error}</p>
        <a href="/login">Try again</a>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", paddingTop: 60 }}>
      <p style={{ color: "#6b7280" }}>Processing authentication...</p>
    </div>
  );
}

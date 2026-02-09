"use client";

/**
 * Login page using HelloJohn SignIn component.
 */
import { useRouter } from "next/navigation";
import { SignIn, useAuth } from "@hellojohn/react";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    router.replace("/");
    return null;
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
      <SignIn onSuccess={() => router.push("/")} />
    </div>
  );
}

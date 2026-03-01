"use client";

import { SignIn, UserButton, useAuth } from "@hellojohn/react";

export default function Page() {
  const { isAuthenticated, user } = useAuth();

  return (
    <main style={{ padding: 24 }}>
      <UserButton />
      {isAuthenticated ? <p>Welcome, {user?.email}</p> : <SignIn />}
    </main>
  );
}

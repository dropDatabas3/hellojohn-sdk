"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@hellojohn/react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider
          domain={process.env.NEXT_PUBLIC_HJ_DOMAIN || "http://localhost:8080"}
          clientID={process.env.NEXT_PUBLIC_HJ_CLIENT_ID || "your-client-id"}
        >
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

"use client";

/**
 * Client-side providers wrapper.
 * HelloJohnProvider must be rendered on the client.
 */
import { HelloJohnProvider } from "@hellojohn/react";
import { DOMAIN, CLIENT_ID, TENANT_ID } from "../lib/auth";

export default function Providers({ children }) {
  return (
    <HelloJohnProvider
      domain={DOMAIN}
      clientID={CLIENT_ID}
      tenantID={TENANT_ID}
      redirectURI={typeof window !== "undefined" ? window.location.origin + "/callback" : ""}
    >
      {children}
    </HelloJohnProvider>
  );
}

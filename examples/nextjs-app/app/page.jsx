/**
 * Home page — demonstrates SSR session check.
 * Uses createServerClient from @hellojohn/react/server to read auth state on the server.
 */
import { cookies } from "next/headers";
import { createServerClient } from "@hellojohn/react/server";
import { DOMAIN } from "../lib/auth";
import ClientHome from "./client-home";

export default async function HomePage() {
  // SSR: read session from cookies (no verification — just decode)
  const cookieStore = await cookies();
  const session = createServerClient({
    domain: DOMAIN,
    cookies: cookieStore.toString(),
  });

  return <ClientHome serverSession={session.getSession()} />;
}

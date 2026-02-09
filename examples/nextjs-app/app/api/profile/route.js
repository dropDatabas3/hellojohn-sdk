/**
 * Server-side API route that verifies JWT tokens using @hellojohn/node.
 *
 * Demonstrates: createHelloJohnServer().verifyToken() in a Next.js API route.
 *
 * Test:
 *   curl -H "Authorization: Bearer <token>" http://localhost:3003/api/profile
 */
import { createHelloJohnServer } from "@hellojohn/node";
import { NextResponse } from "next/server";

const DOMAIN = process.env.HELLOJOHN_DOMAIN || "http://localhost:8080";
const hj = createHelloJohnServer({ domain: DOMAIN });

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const token = authHeader.slice(7);
    const claims = await hj.verifyToken(token);

    return NextResponse.json({
      userId: claims.userId,
      tenantId: claims.tenantId,
      scopes: claims.scopes,
      roles: claims.roles,
      permissions: claims.permissions,
      isM2M: claims.isM2M,
    });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

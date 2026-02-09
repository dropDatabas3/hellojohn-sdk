/**
 * Example: Express API protected with HelloJohn
 *
 * This demonstrates how to use the HelloJohn Node.js SDK
 * to protect API endpoints with JWT verification, scopes, and roles.
 *
 * Run:
 *   npm install
 *   node server.js
 *
 * Test:
 *   curl http://localhost:3002/api/health
 *   curl -H "Authorization: Bearer <token>" http://localhost:3002/api/profile
 *   curl -H "Authorization: Bearer <token>" http://localhost:3002/api/admin
 */

import express from "express";
import {
  createHelloJohnServer,
  createM2MClient,
} from "@hellojohn/node";
import {
  hjMiddleware,
  requireAuth,
  requireScope,
  requireRole,
} from "@hellojohn/node/express";

const app = express();
const port = process.env.PORT || 3002;
const domain = process.env.HELLOJOHN_DOMAIN || "http://localhost:8080";

// 1. Create HelloJohn server client
const hj = createHelloJohnServer({ domain });

// 2. Apply global middleware — non-blocking, attaches req.auth if valid token
app.use(hjMiddleware(hj));

// 3. Public endpoint — no auth required
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", authenticated: !!req.auth });
});

// 4. Protected endpoint — requires valid JWT
app.get("/api/profile", requireAuth(), (req, res) => {
  res.json({
    userId: req.auth.userId,
    tenantId: req.auth.tenantId,
    scopes: req.auth.scopes,
    roles: req.auth.roles,
    permissions: req.auth.permissions,
    isM2M: req.auth.isM2M,
  });
});

// 5. Role-protected endpoint — requires "admin" role
app.get("/api/admin", requireAuth(), requireRole("admin"), (req, res) => {
  res.json({
    message: "Welcome, admin!",
    userId: req.auth.userId,
  });
});

// 6. Scope-protected endpoint — requires "data:read" scope
app.get("/api/data", requireAuth(), requireScope("data:read"), (req, res) => {
  res.json({
    data: ["item1", "item2", "item3"],
  });
});

// 7. M2M example — service-to-service call
app.get("/api/m2m-demo", async (req, res) => {
  const clientId = process.env.M2M_CLIENT_ID;
  const clientSecret = process.env.M2M_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.json({
      message: "Set M2M_CLIENT_ID and M2M_CLIENT_SECRET to test M2M",
    });
  }

  try {
    const m2m = createM2MClient({
      domain,
      tenantId: "local",
      clientId,
      clientSecret,
    });

    const { accessToken, expiresAt } = await m2m.getToken({
      scopes: ["data:read"],
    });

    res.json({
      message: "M2M token acquired!",
      expiresAt,
      tokenPreview: accessToken.substring(0, 20) + "...",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`Express API listening on http://localhost:${port}`);
  console.log(`  GET  /api/health       — public`);
  console.log(`  GET  /api/profile      — requires auth`);
  console.log(`  GET  /api/admin        — requires 'admin' role`);
  console.log(`  GET  /api/data         — requires 'data:read' scope`);
  console.log(`  GET  /api/m2m-demo     — M2M token demo`);
});

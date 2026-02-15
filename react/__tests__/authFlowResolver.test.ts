import { describe, it, expect } from "vitest";
import {
    extractFlowFromPathname,
    extractFlowFromSearch,
    resolveAuthFlow,
} from "../src/pages/authFlowResolver";

describe("authFlowResolver", () => {
    it("prioritizes explicit flow over pathname and query", () => {
        const flow = resolveAuthFlow({
            flow: "register",
            pathname: "/auth/login",
            search: "?flow=callback",
            fallbackFlow: "forgot-password",
            basePath: "/auth",
        });

        expect(flow).toBe("register");
    });

    it("resolves flow from pathname segment under basePath", () => {
        const flow = resolveAuthFlow({
            pathname: "/auth/reset-password",
            search: "?flow=login",
            fallbackFlow: "login",
            basePath: "/auth",
        });

        expect(flow).toBe("reset-password");
    });

    it("supports nested base paths", () => {
        const flow = extractFlowFromPathname("/identity/auth/callback", "/identity/auth");
        expect(flow).toBe("callback");
    });

    it("returns null when pathname is outside basePath", () => {
        const flow = extractFlowFromPathname("/login", "/auth");
        expect(flow).toBeNull();
    });

    it("resolves flow from query when path has no valid flow", () => {
        const flow = resolveAuthFlow({
            pathname: "/auth",
            search: "?flow=forgot-password",
            fallbackFlow: "login",
            basePath: "/auth",
        });

        expect(flow).toBe("forgot-password");
    });

    it("accepts alias values from query", () => {
        const flow = extractFlowFromSearch("?flow=signin");
        expect(flow).toBe("login");
    });

    it("falls back to fallbackFlow when path/query are invalid", () => {
        const flow = resolveAuthFlow({
            pathname: "/auth/not-valid",
            search: "?flow=unknown",
            fallbackFlow: "callback",
            basePath: "/auth",
        });

        expect(flow).toBe("callback");
    });

    it("defaults to login when fallback is invalid", () => {
        const flow = resolveAuthFlow({
            pathname: "/auth/not-valid",
            search: "?flow=unknown",
            fallbackFlow: "not-valid",
            basePath: "/auth",
        });

        expect(flow).toBe("login");
    });
});


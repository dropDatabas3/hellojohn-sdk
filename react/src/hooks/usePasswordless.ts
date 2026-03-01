import { useState, useCallback } from "react";
import { useAuth } from "../context";
import { PasswordlessAuthResult } from "@hellojohn/js";

export function usePasswordless() {
    const { client } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const sendMagicLink = useCallback(async (email: string, redirectUri: string) => {
        if (!client) throw new Error("AuthClient not initialized");
        setIsLoading(true);
        setError(null);
        try {
            await client.passwordless.sendMagicLink(email, redirectUri);
        } catch (err: any) {
            setError(err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [client]);

    const verifyMagicLink = useCallback(async (token: string): Promise<PasswordlessAuthResult> => {
        if (!client) throw new Error("AuthClient not initialized");
        setIsLoading(true);
        setError(null);
        try {
            return await client.passwordless.verifyMagicLink(token);
        } catch (err: any) {
            setError(err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [client]);

    const exchangeMagicLinkCode = useCallback(async (code: string): Promise<PasswordlessAuthResult> => {
        if (!client) throw new Error("AuthClient not initialized");
        setIsLoading(true);
        setError(null);
        try {
            return await client.passwordless.exchangeMagicLinkCode(code);
        } catch (err: any) {
            setError(err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [client]);

    const completeMagicLinkFromURL = useCallback(async (): Promise<PasswordlessAuthResult> => {
        if (typeof window === "undefined") {
            throw new Error("Magic link completion is only available in browser");
        }

        const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
        const params = new URLSearchParams(hash);
        const code = params.get("magic_link_code");
        if (!code) {
            throw new Error("magic_link_code not found in URL fragment");
        }

        const result = await exchangeMagicLinkCode(code);
        window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
        return result;
    }, [exchangeMagicLinkCode]);

    const sendOTP = useCallback(async (email: string) => {
        if (!client) throw new Error("AuthClient not initialized");
        setIsLoading(true);
        setError(null);
        try {
            await client.passwordless.sendOTP(email);
        } catch (err: any) {
            setError(err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [client]);

    const verifyOTP = useCallback(async (email: string, code: string): Promise<PasswordlessAuthResult> => {
        if (!client) throw new Error("AuthClient not initialized");
        setIsLoading(true);
        setError(null);
        try {
            return await client.passwordless.verifyOTP(email, code);
        } catch (err: any) {
            setError(err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [client]);

    return {
        sendMagicLink,
        verifyMagicLink,
        exchangeMagicLinkCode,
        completeMagicLinkFromURL,
        sendOTP,
        verifyOTP,
        isLoading,
        error
    };
}

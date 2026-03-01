import { useCallback, useEffect, useMemo, useState } from "react";
import type { MFAMethod, MFAMethodType } from "@hellojohn/js";
import { useAuth } from "../context";

export interface UseMFAOptions {
    challengeToken?: string;
    methods?: MFAMethod[];
    preferredFactor?: MFAMethodType;
}

export interface UseMFAResult {
    methods: MFAMethod[];
    challengeActive: boolean;
    selectedMethod: MFAMethod | null;
    hint?: string;
    loadMethods: () => Promise<void>;
    challengeTOTP: () => Promise<void>;
    challengeSMS: () => Promise<void>;
    challengeEmail: () => Promise<void>;
    submitCode: (code: string) => Promise<void>;
    clearChallenge: () => void;
    isPending: boolean;
    error: string | null;
}

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }
    return fallback;
}

function normalizeMethods(methods: MFAMethod[]): MFAMethod[] {
    const seen = new Set<MFAMethodType>();
    const deduped: MFAMethod[] = [];

    for (const method of methods) {
        if (seen.has(method.type)) continue;
        seen.add(method.type);
        deduped.push(method);
    }

    return deduped;
}

const DEFAULT_METHODS: MFAMethod[] = [{ type: "totp", label: "Authenticator App" }];

export function useMFA(options?: UseMFAOptions): UseMFAResult {
    const { client } = useAuth();
    const initialMethods = useMemo(
        () => normalizeMethods(options?.methods && options.methods.length > 0 ? options.methods : DEFAULT_METHODS),
        [options?.methods]
    );

    const [methods, setMethods] = useState<MFAMethod[]>(initialMethods);
    const [challengeActive, setChallengeActive] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState<MFAMethod | null>(null);
    const [hint, setHint] = useState<string | undefined>(undefined);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setMethods(initialMethods);
    }, [initialMethods]);

    useEffect(() => {
        if (!client || !options?.challengeToken) return;
        const availableFactors = (options.methods || []).map((method) => method.type);
        client.mfa.setChallenge(options.challengeToken, availableFactors, options.preferredFactor);
    }, [client, options?.challengeToken, options?.methods, options?.preferredFactor]);

    const loadMethods = useCallback(async () => {
        if (!client) {
            throw new Error("AuthClient not initialized");
        }
        setError(null);
        try {
            const listed = await client.mfa.listMethods();
            setMethods(normalizeMethods(listed.length > 0 ? listed : DEFAULT_METHODS));
        } catch (err: unknown) {
            const message = getErrorMessage(err, "Failed to load MFA methods");
            setError(message);
            throw err;
        }
    }, [client]);

    const challengeTOTP = useCallback(async () => {
        if (!client) {
            throw new Error("AuthClient not initialized");
        }

        setIsPending(true);
        setError(null);
        setHint(undefined);
        try {
            await client.mfa.challengeTOTP();
            setSelectedMethod({ type: "totp", label: "Authenticator App" });
            setChallengeActive(true);
        } catch (err: unknown) {
            const message = getErrorMessage(err, "Failed to start TOTP challenge");
            setError(message);
            throw err;
        } finally {
            setIsPending(false);
        }
    }, [client]);

    const challengeSMS = useCallback(async () => {
        if (!client) {
            throw new Error("AuthClient not initialized");
        }

        setIsPending(true);
        setError(null);
        try {
            const result = await client.mfa.challengeSMS();
            setSelectedMethod({ type: "sms", label: "SMS" });
            setHint(result.sent ? "Code sent via SMS" : undefined);
            setChallengeActive(true);
        } catch (err: unknown) {
            const message = getErrorMessage(err, "Failed to send SMS code");
            setError(message);
            throw err;
        } finally {
            setIsPending(false);
        }
    }, [client]);

    const challengeEmail = useCallback(async () => {
        if (!client) {
            throw new Error("AuthClient not initialized");
        }

        setIsPending(true);
        setError(null);
        try {
            const result = await client.mfa.challengeEmail();
            setSelectedMethod({ type: "email", label: "Email" });
            setHint(result.sent ? "Code sent via email" : undefined);
            setChallengeActive(true);
        } catch (err: unknown) {
            const message = getErrorMessage(err, "Failed to send email code");
            setError(message);
            throw err;
        } finally {
            setIsPending(false);
        }
    }, [client]);

    const submitCode = useCallback(async (code: string) => {
        if (!client) {
            throw new Error("AuthClient not initialized");
        }

        setIsPending(true);
        setError(null);
        try {
            await client.mfa.submitChallenge(code);
            setChallengeActive(false);
            setSelectedMethod(null);
            setHint(undefined);
        } catch (err: unknown) {
            const message = getErrorMessage(err, "MFA verification failed");
            setError(message);
            throw err;
        } finally {
            setIsPending(false);
        }
    }, [client]);

    const clearChallenge = useCallback(() => {
        setChallengeActive(false);
        setSelectedMethod(null);
        setHint(undefined);
        setError(null);
    }, []);

    return {
        methods,
        challengeActive,
        selectedMethod,
        hint,
        loadMethods,
        challengeTOTP,
        challengeSMS,
        challengeEmail,
        submitCode,
        clearChallenge,
        isPending,
        error,
    };
}

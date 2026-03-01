import React, { useEffect, useMemo, useState } from "react";
import type { MFAMethod, MFAMethodType } from "@hellojohn/js";
import { useMFA } from "../hooks/useMFA";

export interface FactorSelectorChallengeProps {
    challengeToken?: string;
    availableMethods?: MFAMethod[];
    preferredFactor?: MFAMethodType;
    onSuccess?: () => void;
    onCancel?: () => void;
}

function sortMethods(methods: MFAMethod[]): MFAMethod[] {
    const order: Record<MFAMethodType, number> = {
        totp: 0,
        sms: 1,
        email: 2,
    };
    return methods.slice().sort((a, b) => order[a.type] - order[b.type]);
}

function methodTitle(method: MFAMethod | null, hint?: string): string {
    if (!method) return "Enter your verification code";
    if (method.type === "totp") {
        return "Enter the code from your authenticator app";
    }
    if (method.type === "sms") {
        return hint || "Enter the code sent via SMS";
    }
    return hint || "Enter the code sent via email";
}

export function FactorSelectorChallenge({
    challengeToken,
    availableMethods,
    preferredFactor,
    onSuccess,
    onCancel,
}: FactorSelectorChallengeProps) {
    const [code, setCode] = useState("");
    const [localError, setLocalError] = useState<string | null>(null);

    const {
        methods: dynamicMethods,
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
    } = useMFA({
        challengeToken,
        methods: availableMethods,
        preferredFactor,
    });

    const methods = useMemo(() => sortMethods(availableMethods ?? dynamicMethods), [availableMethods, dynamicMethods]);

    useEffect(() => {
        if (!availableMethods) {
            void loadMethods().catch(() => undefined);
        }
    }, [availableMethods, loadMethods]);

    const startChallenge = async (method: MFAMethod) => {
        setCode("");
        setLocalError(null);
        try {
            if (method.type === "totp") {
                await challengeTOTP();
                return;
            }
            if (method.type === "sms") {
                await challengeSMS();
                return;
            }
            await challengeEmail();
        } catch (err: unknown) {
            if (err instanceof Error) {
                setLocalError(err.message);
                return;
            }
            setLocalError("Unable to start MFA challenge");
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLocalError(null);
        try {
            await submitCode(code);
            setCode("");
            onSuccess?.();
        } catch (err: unknown) {
            if (err instanceof Error) {
                setLocalError(err.message);
                return;
            }
            setLocalError("Unable to verify MFA code");
        }
    };

    if (!challengeActive) {
        return (
            <div className="hj-factor-selector">
                <p className="hj-factor-selector__title">Two-factor verification</p>
                <p className="hj-factor-selector__subtitle">Choose how to verify your identity</p>
                <div className="hj-factor-selector__methods">
                    {methods.map((method) => (
                        <button
                            key={method.type}
                            type="button"
                            className="hj-factor-selector__option"
                            disabled={isPending}
                            onClick={() => {
                                void startChallenge(method);
                            }}
                        >
                            {method.label}
                        </button>
                    ))}
                </div>
                {(localError || error) && <p className="hj-factor-selector__error">{localError || error}</p>}
                {onCancel && (
                    <button type="button" className="hj-factor-selector__cancel" onClick={onCancel}>
                        Cancel
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="hj-factor-selector__challenge">
            <form onSubmit={handleSubmit}>
                <p className="hj-factor-selector__subtitle">{methodTitle(selectedMethod, hint)}</p>
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="hj-factor-selector__input"
                    autoFocus
                />
                {(localError || error) && <p className="hj-factor-selector__error">{localError || error}</p>}
                <button
                    type="submit"
                    className="hj-factor-selector__submit"
                    disabled={isPending || code.length < 6}
                >
                    {isPending ? "Verifying..." : "Verify"}
                </button>
            </form>
            <button
                type="button"
                className="hj-factor-selector__back"
                onClick={() => {
                    clearChallenge();
                    setCode("");
                    setLocalError(null);
                }}
            >
                Choose another method
            </button>
        </div>
    );
}

import React, { useState } from "react";
import { useAuth } from "../context";
import { useI18n } from "../i18n";
import { PhoneInput } from "./PhoneInput";
import { CountrySelect } from "./CountrySelect";

interface CompleteProfileProps {
    /** Called after successful profile completion */
    onComplete?: () => void;
    /** Redirect URL after completion (default: /) */
    redirectTo?: string;
    /** Allow skipping required fields (default: false) */
    allowSkip?: boolean;
}

/**
 * CompleteProfile component displays a form to collect missing required custom fields.
 * Used after social login when the tenant has required custom fields that weren't
 * provided by the social provider.
 * 
 * The SDK automatically detects when this form is needed and can render it in the
 * callback page or as a modal overlay.
 */
export function CompleteProfile({ onComplete, redirectTo = "/", allowSkip = false }: CompleteProfileProps) {
    const { config, completeProfile, user } = useAuth();
    const i18n = useI18n();
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (name: string, value: string) => {
        setFormData({ ...formData, [name]: value });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            await completeProfile(formData);
            if (onComplete) {
                onComplete();
            } else {
                window.location.href = redirectTo;
            }
        } catch (err: any) {
            setError(err.message || i18n.errors.profileSaveError);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSkip = () => {
        if (onComplete) {
            onComplete();
        } else {
            window.location.href = redirectTo;
        }
    };

    // Filter to only required fields that are currently empty
    const missingFields = config?.custom_fields?.filter(field => {
        if (!field.required) return false;
        // Check if user already has this field filled
        const existingValue = user?.custom_fields?.[field.name];
        return !existingValue || existingValue === "";
    }) || [];

    // If no missing fields, don't render anything
    if (missingFields.length === 0) {
        return null;
    }

    const brandColor = config?.primary_color || "#09090b";

    const labelStyle: React.CSSProperties = {
        display: "block",
        fontSize: "14px",
        fontWeight: 500,
        marginBottom: "6px",
    };

    const commonInputStyle: React.CSSProperties = {
        display: "flex",
        height: "40px",
        width: "100%",
        borderRadius: "8px",
        border: "1px solid #cbd5e1",
        backgroundColor: "#ffffff",
        padding: "10px 14px",
        fontSize: "14px",
        outline: "none",
        transition: "all 0.2s ease",
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
    };

    const renderField = (field: { name: string; type: string; required: boolean; label?: string }) => {
        const label = field.label || field.name;
        // Case insensitive matching and debug logging
        const type = field.type?.toLowerCase() || "text";

        console.log(`[SDK] Rendering field: ${field.name}, type: ${field.type} -> ${type}`);

        switch (type) {
            case "phone":
                return (
                    <div key={field.name} style={{ marginBottom: "16px" }}>
                        <label style={labelStyle}>
                            {label} {field.required && <span style={{ color: "#ef4444" }}>*</span>}
                        </label>
                        <PhoneInput
                            value={formData[field.name] || ""}
                            onChange={(value) => handleChange(field.name, value)}
                            required={field.required}
                        />
                    </div>
                );

            case "country":
                return (
                    <div key={field.name} style={{ marginBottom: "16px" }}>
                        <label style={labelStyle}>
                            {label} {field.required && <span style={{ color: "#ef4444" }}>*</span>}
                        </label>
                        <CountrySelect
                            value={formData[field.name] || ""}
                            onChange={(value) => handleChange(field.name, value)}
                            required={field.required}
                        />
                    </div>
                );

            default:
                return (
                    <div key={field.name} style={{ marginBottom: "16px" }}>
                        <label style={labelStyle}>
                            {label} {field.required && <span style={{ color: "#ef4444" }}>*</span>}
                        </label>
                        <input
                            type="text"
                            name={field.name}
                            value={formData[field.name] || ""}
                            onChange={handleInputChange}
                            required={field.required}
                            style={commonInputStyle}
                            onFocus={(e) => {
                                e.target.style.borderColor = brandColor;
                                e.target.style.boxShadow = `0 0 0 3px ${brandColor}20`;
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = "#cbd5e1";
                                e.target.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.05)";
                            }}
                        />
                    </div>
                );
        }
    };

    return (
        <div style={{
            width: "100%",
            maxWidth: "420px",
            margin: "0 auto",
            padding: "32px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            border: "1px solid #e2e8f0",
        }}>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
                {config?.logo_url && (
                    <img
                        src={config.logo_url}
                        alt={config.tenant_name || "Logo"}
                        style={{ height: "48px", margin: "0 auto 16px" }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                )}
                <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>
                    {i18n.completeProfile.title}
                </h1>
                <p style={{ fontSize: "14px", color: "#64748b" }}>
                    {i18n.completeProfile.subtitle}
                </p>
            </div>

            {error && (
                <div style={{
                    padding: "12px",
                    fontSize: "14px",
                    color: "#ef4444",
                    backgroundColor: "#fef2f2",
                    borderRadius: "6px",
                    border: "1px solid #fecaca",
                    marginBottom: "16px",
                }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {missingFields.map(renderField)}

                <button
                    type="submit"
                    disabled={submitting}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                        height: "40px",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "white",
                        backgroundColor: brandColor,
                        border: "none",
                        cursor: submitting ? "not-allowed" : "pointer",
                        opacity: submitting ? 0.6 : 1,
                        marginTop: "8px",
                    }}
                >
                    {submitting ? i18n.completeProfile.submitting : i18n.completeProfile.submitButton}
                </button>

                {allowSkip && (
                    <button
                        type="button"
                        onClick={handleSkip}
                        disabled={submitting}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "100%",
                            height: "40px",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: 500,
                            color: "#64748b",
                            backgroundColor: "transparent",
                            border: "none",
                            cursor: submitting ? "not-allowed" : "pointer",
                            opacity: submitting ? 0.6 : 1,
                            marginTop: "8px",
                        }}
                    >
                        Saltar por ahora
                    </button>
                )}
            </form>
        </div>
    );
}


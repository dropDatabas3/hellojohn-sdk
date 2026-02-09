import React, { useState, useEffect, useMemo, useRef } from "react";
import { COUNTRIES, Country } from "../lib/countries";

interface CountrySelectProps {
    value?: string;
    onChange: (value: string) => void;
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;
}

/**
 * Country select dropdown with flag icons.
 * Uses flagcdn.com for flag images.
 * Value is the country name (not the code).
 */
export function CountrySelect({
    value = "",
    onChange,
    required,
    disabled,
    placeholder = "Seleccionar país..."
}: CountrySelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    const sortedCountries = useMemo(() => {
        return [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
    }, []);

    const filteredCountries = useMemo(() => {
        if (!search) return sortedCountries;
        const lower = search.toLowerCase();
        return sortedCountries.filter(
            c => c.name.toLowerCase().includes(lower) ||
                c.code.toLowerCase().includes(lower)
        );
    }, [sortedCountries, search]);

    const selectedCountry = useMemo(() => {
        if (!value) return null;
        return COUNTRIES.find(c => c.name === value || c.code === value);
    }, [value]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearch("");
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (country: Country) => {
        onChange(country.name);
        setIsOpen(false);
        setSearch("");
    };

    const commonInputStyle: React.CSSProperties = {
        display: "flex",
        height: "40px",
        width: "100%",
        borderRadius: "6px",
        border: "1px solid #e2e8f0",
        backgroundColor: "white",
        padding: "8px 12px",
        fontSize: "14px",
        outline: "none",
    };

    return (
        <div style={{ position: "relative" }} ref={dropdownRef}>
            {/* Trigger button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                style={{
                    ...commonInputStyle,
                    cursor: disabled ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    opacity: disabled ? 0.5 : 1,
                    textAlign: "left",
                }}
            >
                {selectedCountry ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <img
                            src={`https://flagcdn.com/w20/${selectedCountry.code.toLowerCase()}.png`}
                            srcSet={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png 2x`}
                            width="20"
                            height="15"
                            alt={selectedCountry.name}
                            style={{ objectFit: "contain", flexShrink: 0 }}
                        />
                        <span>{selectedCountry.name}</span>
                    </div>
                ) : (
                    <span style={{ color: "#94a3b8" }}>{placeholder}</span>
                )}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    marginTop: "4px",
                    maxHeight: "300px",
                    overflowY: "auto",
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    zIndex: 50,
                }}>
                    {/* Search */}
                    <div style={{ padding: "8px", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, backgroundColor: "white" }}>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar país..."
                            style={{
                                ...commonInputStyle,
                                height: "32px",
                            }}
                            autoFocus
                        />
                    </div>
                    {/* Options */}
                    <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                        {filteredCountries.map((country) => (
                            <div
                                key={country.code}
                                onClick={() => handleSelect(country)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "8px 12px",
                                    cursor: "pointer",
                                    backgroundColor: selectedCountry?.code === country.code ? "#f1f5f9" : "white",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = selectedCountry?.code === country.code ? "#f1f5f9" : "white")}
                            >
                                <img
                                    src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                                    srcSet={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png 2x`}
                                    width="20"
                                    height="15"
                                    alt={country.name}
                                    style={{ objectFit: "contain", flexShrink: 0 }}
                                />
                                <span style={{ fontSize: "14px" }}>{country.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Hidden input for form validation */}
            {required && (
                <input
                    type="hidden"
                    value={value}
                    required={required}
                />
            )}
        </div>
    );
}

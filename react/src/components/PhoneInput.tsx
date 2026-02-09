import React, { useState, useEffect, useMemo, useRef } from "react";
import { COUNTRIES, Country, getCountryByDialCode } from "../lib/countries";

interface PhoneInputProps {
    value?: string;
    onChange: (value: string) => void;
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;
}

/**
 * Phone input with country code selector and flags.
 * Uses flagcdn.com for flag images.
 */
export function PhoneInput({
    value = "",
    onChange,
    required,
    disabled,
    placeholder = "Número de teléfono"
}: PhoneInputProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Default to Argentina
    const defaultCountry = COUNTRIES.find((c) => c.code === "AR") || COUNTRIES[0];
    const [selectedCountry, setSelectedCountry] = useState<Country>(defaultCountry);

    const sortedCountries = useMemo(() => {
        return [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
    }, []);

    const filteredCountries = useMemo(() => {
        if (!search) return sortedCountries;
        const lower = search.toLowerCase();
        return sortedCountries.filter(
            c => c.name.toLowerCase().includes(lower) ||
                c.dial_code.includes(search) ||
                c.code.toLowerCase().includes(lower)
        );
    }, [sortedCountries, search]);

    // Parse incoming value to set country and number
    useEffect(() => {
        if (!value) {
            setPhoneNumber("");
            return;
        }

        const match = getCountryByDialCode(value);
        if (match) {
            setSelectedCountry(match);
            setPhoneNumber(value.slice(match.dial_code.length));
        } else {
            setPhoneNumber(value);
        }
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

    const handleCountrySelect = (country: Country) => {
        setSelectedCountry(country);
        setIsOpen(false);
        setSearch("");
        onChange(`${country.dial_code}${phoneNumber}`);
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const num = e.target.value.replace(/[^0-9]/g, "");
        setPhoneNumber(num);
        onChange(`${selectedCountry.dial_code}${num}`);
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
        <div style={{ display: "flex", gap: "8px" }} ref={dropdownRef}>
            {/* Country selector */}
            <div style={{ position: "relative" }}>
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    style={{
                        ...commonInputStyle,
                        width: "120px",
                        cursor: disabled ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        opacity: disabled ? 0.5 : 1,
                    }}
                >
                    <img
                        src={`https://flagcdn.com/w20/${selectedCountry.code.toLowerCase()}.png`}
                        srcSet={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png 2x`}
                        width="20"
                        height="15"
                        alt={selectedCountry.name}
                        style={{ objectFit: "contain", flexShrink: 0 }}
                    />
                    <span style={{ fontFamily: "monospace", fontSize: "13px" }}>
                        {selectedCountry.dial_code}
                    </span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9l6 6 6-6" />
                    </svg>
                </button>

                {/* Dropdown */}
                {isOpen && (
                    <div style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        marginTop: "4px",
                        width: "280px",
                        maxHeight: "300px",
                        overflowY: "auto",
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        zIndex: 50,
                    }}>
                        {/* Search */}
                        <div style={{ padding: "8px", borderBottom: "1px solid #e2e8f0" }}>
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
                                    onClick={() => handleCountrySelect(country)}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        padding: "8px 12px",
                                        cursor: "pointer",
                                        backgroundColor: country.code === selectedCountry.code ? "#f1f5f9" : "white",
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = country.code === selectedCountry.code ? "#f1f5f9" : "white")}
                                >
                                    <img
                                        src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                                        srcSet={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png 2x`}
                                        width="20"
                                        height="15"
                                        alt={country.name}
                                        style={{ objectFit: "contain", flexShrink: 0 }}
                                    />
                                    <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#64748b", width: "45px" }}>
                                        {country.dial_code}
                                    </span>
                                    <span style={{ fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {country.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Phone number input */}
            <input
                type="tel"
                value={phoneNumber}
                onChange={handleNumberChange}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                style={{
                    ...commonInputStyle,
                    flex: 1,
                    opacity: disabled ? 0.5 : 1,
                }}
            />
        </div>
    );
}

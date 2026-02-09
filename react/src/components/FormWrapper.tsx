import React, { useState, useEffect, useMemo } from "react";
import { Theme, ThemeName, getTheme, prefersDarkMode } from "../lib/themes";

export interface FormWrapperProps {
    children: React.ReactNode;
    /** Pre-built theme name or "auto" for system detection */
    theme?: ThemeName;
    /** Background image URL - displayed behind the form */
    backgroundImage?: string;
    /** Enable glassmorphism effect on the card */
    glassmorphism?: boolean;
    /** Enable animations */
    animations?: boolean;
    /** Custom style overrides */
    customStyles?: {
        primaryColor?: string;
        backgroundColor?: string;
        textColor?: string;
        borderRadius?: string;
        fontFamily?: string;
    };
    /** Full page mode - centers form and fills viewport */
    fullPage?: boolean;
}

/**
 * FormWrapper provides theming, background images, and glassmorphism for SDK forms.
 * 
 * @example
 * // Simple usage with theme
 * <FormWrapper theme="midnight">
 *   <SignInForm />
 * </FormWrapper>
 * 
 * @example
 * // With background image and glassmorphism
 * <FormWrapper theme="ocean" backgroundImage="/hero.jpg" glassmorphism fullPage>
 *   <SignInForm />
 * </FormWrapper>
 */
export function FormWrapper({
    children,
    theme: themeName = "minimal",
    backgroundImage,
    glassmorphism = false,
    animations = true,
    customStyles,
    fullPage = false,
}: FormWrapperProps) {
    const [mounted, setMounted] = useState(false);
    const [systemDark, setSystemDark] = useState(false);

    useEffect(() => {
        setMounted(true);
        setSystemDark(prefersDarkMode());

        // Listen for system theme changes
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    const theme: Theme = useMemo(() => {
        if (themeName === "auto") {
            return getTheme(systemDark ? "midnight" : "minimal");
        }
        return getTheme(themeName);
    }, [themeName, systemDark]);

    // Apply custom overrides
    const finalColors = useMemo(() => {
        const colors = { ...theme.colors };
        if (customStyles?.primaryColor) {
            colors.buttonPrimary = customStyles.primaryColor;
            colors.buttonPrimaryHover = customStyles.primaryColor;
            colors.inputFocus = customStyles.primaryColor;
            colors.accent = customStyles.primaryColor;
            colors.link = customStyles.primaryColor;
        }
        if (customStyles?.backgroundColor) {
            colors.cardBackground = customStyles.backgroundColor;
        }
        if (customStyles?.textColor) {
            colors.textPrimary = customStyles.textColor;
            colors.textSecondary = customStyles.textColor;
        }
        return colors;
    }, [theme.colors, customStyles]);

    const borderRadius = customStyles?.borderRadius || theme.styles.borderRadius;
    const fontFamily = customStyles?.fontFamily || theme.styles.fontFamily;

    // Container styles
    const containerStyle: React.CSSProperties = {
        position: fullPage ? "fixed" : "relative",
        inset: fullPage ? 0 : undefined,
        minHeight: fullPage ? "100vh" : undefined,
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: fullPage ? "20px" : undefined,
        background: backgroundImage ? undefined : (theme.colors.background.includes("gradient") ? theme.colors.background : theme.colors.backgroundSecondary),
        fontFamily,
        transition: animations ? theme.styles.transition : undefined,
    };

    // Background image styles
    const bgImageStyle: React.CSSProperties = backgroundImage ? {
        position: "absolute",
        inset: 0,
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        zIndex: 0,
    } : {};

    // Overlay for background image readability
    const overlayStyle: React.CSSProperties = backgroundImage ? {
        position: "absolute",
        inset: 0,
        background: theme.isDark
            ? "rgba(0, 0, 0, 0.6)"
            : "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(2px)",
        zIndex: 1,
    } : {};

    // Card styles with optional glassmorphism
    const cardStyle: React.CSSProperties = {
        position: "relative",
        zIndex: 2,
        width: "100%",
        maxWidth: "420px",
        background: glassmorphism
            ? (theme.isDark ? "rgba(15, 15, 26, 0.75)" : "rgba(255, 255, 255, 0.75)")
            : finalColors.cardBackground,
        backdropFilter: glassmorphism ? "blur(16px) saturate(180%)" : undefined,
        WebkitBackdropFilter: glassmorphism ? "blur(16px) saturate(180%)" : undefined,
        border: `1px solid ${glassmorphism ? "rgba(255, 255, 255, 0.18)" : finalColors.cardBorder}`,
        borderRadius,
        boxShadow: theme.styles.cardShadow,
        padding: "32px",
        transition: animations ? theme.styles.transition : undefined,
        opacity: mounted && animations ? 1 : (animations ? 0 : 1),
        transform: mounted || !animations ? "translateY(0)" : "translateY(10px)",
    };

    // Inject CSS variables for child components
    const cssVars: Record<string, string> = {
        "--hj-text-primary": finalColors.textPrimary,
        "--hj-text-secondary": finalColors.textSecondary,
        "--hj-text-muted": finalColors.textMuted,
        "--hj-input-bg": finalColors.inputBackground,
        "--hj-input-border": finalColors.inputBorder,
        "--hj-input-text": finalColors.inputText,
        "--hj-input-placeholder": finalColors.inputPlaceholder,
        "--hj-input-focus": finalColors.inputFocus,
        "--hj-btn-primary": finalColors.buttonPrimary,
        "--hj-btn-primary-hover": finalColors.buttonPrimaryHover,
        "--hj-btn-primary-text": finalColors.buttonPrimaryText,
        "--hj-btn-secondary": finalColors.buttonSecondary,
        "--hj-btn-secondary-hover": finalColors.buttonSecondaryHover,
        "--hj-btn-secondary-text": finalColors.buttonSecondaryText,
        "--hj-btn-secondary-border": finalColors.buttonSecondaryBorder,
        "--hj-error": finalColors.error,
        "--hj-error-bg": finalColors.errorBackground,
        "--hj-error-border": finalColors.errorBorder,
        "--hj-accent": finalColors.accent,
        "--hj-link": finalColors.link,
        "--hj-link-hover": finalColors.linkHover,
        "--hj-radius": borderRadius,
        "--hj-shadow": theme.styles.cardShadow,
        "--hj-transition": theme.styles.transition,
        "--hj-font": fontFamily,
    };

    return (
        <div style={{ ...containerStyle, ...cssVars as React.CSSProperties }}>
            {backgroundImage && <div style={bgImageStyle} />}
            {backgroundImage && <div style={overlayStyle} />}
            <div style={cardStyle}>
                {children}
            </div>
        </div>
    );
}

/**
 * Hook to get current theme colors and styles
 */
export function useTheme(themeName: ThemeName = "minimal"): Theme {
    const [systemDark, setSystemDark] = useState(false);

    useEffect(() => {
        setSystemDark(prefersDarkMode());
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    return useMemo(() => {
        if (themeName === "auto") {
            return getTheme(systemDark ? "midnight" : "minimal");
        }
        return getTheme(themeName);
    }, [themeName, systemDark]);
}

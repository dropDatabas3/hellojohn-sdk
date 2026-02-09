/**
 * HelloJohn SDK Theme System
 * 
 * Pre-built themes for authentication forms with dark/light mode support.
 * 
 * Usage:
 *   <SignIn theme="midnight" />
 *   <SignIn theme="auto" /> // Detects system preference
 */

export type ThemeName = "midnight" | "ocean" | "sunrise" | "forest" | "honey" | "minimal" | "auto";

export interface ThemeColors {
    // Backgrounds
    background: string;
    backgroundSecondary: string;
    cardBackground: string;
    cardBorder: string;

    // Text
    textPrimary: string;
    textSecondary: string;
    textMuted: string;

    // Inputs
    inputBackground: string;
    inputBorder: string;
    inputText: string;
    inputPlaceholder: string;
    inputFocus: string;

    // Buttons
    buttonPrimary: string;
    buttonPrimaryHover: string;
    buttonPrimaryText: string;
    buttonSecondary: string;
    buttonSecondaryHover: string;
    buttonSecondaryText: string;
    buttonSecondaryBorder: string;

    // States
    error: string;
    errorBackground: string;
    errorBorder: string;
    success: string;

    // Accents
    accent: string;
    accentHover: string;
    link: string;
    linkHover: string;

    // Shadows
    shadowColor: string;
}

export interface Theme {
    name: ThemeName;
    displayName: string;
    description: string;
    isDark: boolean;
    colors: ThemeColors;
    styles: {
        borderRadius: string;
        cardShadow: string;
        inputShadow: string;
        transition: string;
        fontFamily: string;
    };
}

// ============================================================================
// MIDNIGHT THEME - Elegant dark with purple/violet accents
// ============================================================================
export const midnightTheme: Theme = {
    name: "midnight",
    displayName: "Midnight",
    description: "Elegante tema oscuro con acentos púrpura",
    isDark: true,
    colors: {
        background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)",
        backgroundSecondary: "#0f0f1a",
        cardBackground: "rgba(26, 26, 46, 0.85)",
        cardBorder: "rgba(139, 92, 246, 0.2)",

        textPrimary: "#f8fafc",
        textSecondary: "#cbd5e1",
        textMuted: "#64748b",

        inputBackground: "rgba(15, 15, 26, 0.6)",
        inputBorder: "rgba(139, 92, 246, 0.3)",
        inputText: "#f8fafc",
        inputPlaceholder: "#64748b",
        inputFocus: "#8b5cf6",

        buttonPrimary: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
        buttonPrimaryHover: "linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)",
        buttonPrimaryText: "#ffffff",
        buttonSecondary: "rgba(139, 92, 246, 0.1)",
        buttonSecondaryHover: "rgba(139, 92, 246, 0.2)",
        buttonSecondaryText: "#a78bfa",
        buttonSecondaryBorder: "rgba(139, 92, 246, 0.3)",

        error: "#f87171",
        errorBackground: "rgba(248, 113, 113, 0.1)",
        errorBorder: "rgba(248, 113, 113, 0.3)",
        success: "#4ade80",

        accent: "#8b5cf6",
        accentHover: "#a78bfa",
        link: "#a78bfa",
        linkHover: "#c4b5fd",

        shadowColor: "rgba(139, 92, 246, 0.15)",
    },
    styles: {
        borderRadius: "12px",
        cardShadow: "0 8px 32px rgba(139, 92, 246, 0.15), 0 0 0 1px rgba(139, 92, 246, 0.1)",
        inputShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    },
};

// ============================================================================
// OCEAN THEME - Deep blues with soft gradients
// ============================================================================
export const oceanTheme: Theme = {
    name: "ocean",
    displayName: "Ocean",
    description: "Azules profundos con gradientes suaves",
    isDark: true,
    colors: {
        background: "linear-gradient(135deg, #0c1929 0%, #0f2942 50%, #1e3a5f 100%)",
        backgroundSecondary: "#0c1929",
        cardBackground: "rgba(15, 41, 66, 0.85)",
        cardBorder: "rgba(56, 189, 248, 0.2)",

        textPrimary: "#f0f9ff",
        textSecondary: "#bae6fd",
        textMuted: "#7dd3fc",

        inputBackground: "rgba(12, 25, 41, 0.6)",
        inputBorder: "rgba(56, 189, 248, 0.3)",
        inputText: "#f0f9ff",
        inputPlaceholder: "#7dd3fc",
        inputFocus: "#38bdf8",

        buttonPrimary: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
        buttonPrimaryHover: "linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)",
        buttonPrimaryText: "#ffffff",
        buttonSecondary: "rgba(56, 189, 248, 0.1)",
        buttonSecondaryHover: "rgba(56, 189, 248, 0.2)",
        buttonSecondaryText: "#38bdf8",
        buttonSecondaryBorder: "rgba(56, 189, 248, 0.3)",

        error: "#f87171",
        errorBackground: "rgba(248, 113, 113, 0.1)",
        errorBorder: "rgba(248, 113, 113, 0.3)",
        success: "#4ade80",

        accent: "#0ea5e9",
        accentHover: "#38bdf8",
        link: "#38bdf8",
        linkHover: "#7dd3fc",

        shadowColor: "rgba(56, 189, 248, 0.15)",
    },
    styles: {
        borderRadius: "16px",
        cardShadow: "0 8px 32px rgba(56, 189, 248, 0.15), 0 0 0 1px rgba(56, 189, 248, 0.1)",
        inputShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    },
};

// ============================================================================
// SUNRISE THEME - Warm with orange/coral tones
// ============================================================================
export const sunriseTheme: Theme = {
    name: "sunrise",
    displayName: "Sunrise",
    description: "Tonos cálidos naranja y coral",
    isDark: false,
    colors: {
        background: "linear-gradient(135deg, #fef3e2 0%, #fde7d0 50%, #fbd5b5 100%)",
        backgroundSecondary: "#fef3e2",
        cardBackground: "rgba(255, 255, 255, 0.9)",
        cardBorder: "rgba(251, 146, 60, 0.2)",

        textPrimary: "#1c1917",
        textSecondary: "#44403c",
        textMuted: "#78716c",

        inputBackground: "rgba(255, 255, 255, 0.8)",
        inputBorder: "rgba(251, 146, 60, 0.3)",
        inputText: "#1c1917",
        inputPlaceholder: "#a8a29e",
        inputFocus: "#f97316",

        buttonPrimary: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
        buttonPrimaryHover: "linear-gradient(135deg, #fb923c 0%, #f97316 100%)",
        buttonPrimaryText: "#ffffff",
        buttonSecondary: "rgba(251, 146, 60, 0.1)",
        buttonSecondaryHover: "rgba(251, 146, 60, 0.2)",
        buttonSecondaryText: "#ea580c",
        buttonSecondaryBorder: "rgba(251, 146, 60, 0.3)",

        error: "#dc2626",
        errorBackground: "rgba(220, 38, 38, 0.1)",
        errorBorder: "rgba(220, 38, 38, 0.3)",
        success: "#16a34a",

        accent: "#f97316",
        accentHover: "#fb923c",
        link: "#ea580c",
        linkHover: "#c2410c",

        shadowColor: "rgba(251, 146, 60, 0.15)",
    },
    styles: {
        borderRadius: "14px",
        cardShadow: "0 8px 32px rgba(251, 146, 60, 0.12), 0 0 0 1px rgba(251, 146, 60, 0.08)",
        inputShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    },
};

// ============================================================================
// MINIMAL THEME - Clean white with subtle borders (default)
// ============================================================================
export const minimalTheme: Theme = {
    name: "minimal",
    displayName: "Minimal",
    description: "Diseño limpio y minimalista",
    isDark: false,
    colors: {
        background: "#ffffff",
        backgroundSecondary: "#f8fafc",
        cardBackground: "#ffffff",
        cardBorder: "#e2e8f0",

        textPrimary: "#0f172a",
        textSecondary: "#334155",
        textMuted: "#64748b",

        inputBackground: "#ffffff",
        inputBorder: "#e2e8f0",
        inputText: "#0f172a",
        inputPlaceholder: "#94a3b8",
        inputFocus: "#0f172a",

        buttonPrimary: "#0f172a",
        buttonPrimaryHover: "#1e293b",
        buttonPrimaryText: "#ffffff",
        buttonSecondary: "#ffffff",
        buttonSecondaryHover: "#f8fafc",
        buttonSecondaryText: "#0f172a",
        buttonSecondaryBorder: "#e2e8f0",

        error: "#dc2626",
        errorBackground: "#fef2f2",
        errorBorder: "#fecaca",
        success: "#16a34a",

        accent: "#0f172a",
        accentHover: "#1e293b",
        link: "#0f172a",
        linkHover: "#334155",

        shadowColor: "rgba(0, 0, 0, 0.05)",
    },
    styles: {
        borderRadius: "8px",
        cardShadow: "0 1px 3px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)",
        inputShadow: "none",
        transition: "all 0.15s ease",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    },
};

// ============================================================================
// FOREST THEME - Fresh green with nature vibes
// ============================================================================
export const forestTheme: Theme = {
    name: "forest" as ThemeName,
    displayName: "Forest",
    description: "Verdes frescos con vibras naturales",
    isDark: false,
    colors: {
        background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d0 100%)",
        backgroundSecondary: "#ecfdf5",
        cardBackground: "rgba(255, 255, 255, 0.92)",
        cardBorder: "rgba(34, 197, 94, 0.25)",

        textPrimary: "#14532d",
        textSecondary: "#166534",
        textMuted: "#4ade80",

        inputBackground: "rgba(255, 255, 255, 0.85)",
        inputBorder: "rgba(34, 197, 94, 0.35)",
        inputText: "#14532d",
        inputPlaceholder: "#86efac",
        inputFocus: "#22c55e",

        buttonPrimary: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
        buttonPrimaryHover: "linear-gradient(135deg, #4ade80 0%, #22c55e 100%)",
        buttonPrimaryText: "#ffffff",
        buttonSecondary: "rgba(34, 197, 94, 0.1)",
        buttonSecondaryHover: "rgba(34, 197, 94, 0.2)",
        buttonSecondaryText: "#16a34a",
        buttonSecondaryBorder: "rgba(34, 197, 94, 0.3)",

        error: "#dc2626",
        errorBackground: "rgba(220, 38, 38, 0.1)",
        errorBorder: "rgba(220, 38, 38, 0.3)",
        success: "#16a34a",

        accent: "#22c55e",
        accentHover: "#4ade80",
        link: "#16a34a",
        linkHover: "#15803d",

        shadowColor: "rgba(34, 197, 94, 0.15)",
    },
    styles: {
        borderRadius: "14px",
        cardShadow: "0 8px 32px rgba(34, 197, 94, 0.12), 0 0 0 1px rgba(34, 197, 94, 0.08)",
        inputShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    },
};

// ============================================================================
// HONEY THEME - Warm yellow/gold tones
// ============================================================================
export const honeyTheme: Theme = {
    name: "honey" as ThemeName,
    displayName: "Honey",
    description: "Tonos amarillo dorado cálidos",
    isDark: false,
    colors: {
        background: "linear-gradient(135deg, #fefce8 0%, #fef08a 50%, #fde047 100%)",
        backgroundSecondary: "#fefce8",
        cardBackground: "rgba(255, 255, 255, 0.92)",
        cardBorder: "rgba(234, 179, 8, 0.25)",

        textPrimary: "#713f12",
        textSecondary: "#854d0e",
        textMuted: "#a16207",

        inputBackground: "rgba(255, 255, 255, 0.85)",
        inputBorder: "rgba(234, 179, 8, 0.35)",
        inputText: "#713f12",
        inputPlaceholder: "#ca8a04",
        inputFocus: "#eab308",

        buttonPrimary: "linear-gradient(135deg, #eab308 0%, #ca8a04 100%)",
        buttonPrimaryHover: "linear-gradient(135deg, #facc15 0%, #eab308 100%)",
        buttonPrimaryText: "#422006",
        buttonSecondary: "rgba(234, 179, 8, 0.1)",
        buttonSecondaryHover: "rgba(234, 179, 8, 0.2)",
        buttonSecondaryText: "#a16207",
        buttonSecondaryBorder: "rgba(234, 179, 8, 0.3)",

        error: "#dc2626",
        errorBackground: "rgba(220, 38, 38, 0.1)",
        errorBorder: "rgba(220, 38, 38, 0.3)",
        success: "#16a34a",

        accent: "#eab308",
        accentHover: "#facc15",
        link: "#ca8a04",
        linkHover: "#a16207",

        shadowColor: "rgba(234, 179, 8, 0.15)",
    },
    styles: {
        borderRadius: "14px",
        cardShadow: "0 8px 32px rgba(234, 179, 8, 0.12), 0 0 0 1px rgba(234, 179, 8, 0.08)",
        inputShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    },
};

// ============================================================================
// THEME UTILITIES
// ============================================================================

export const THEMES: Record<Exclude<ThemeName, "auto">, Theme> = {
    midnight: midnightTheme,
    ocean: oceanTheme,
    sunrise: sunriseTheme,
    forest: forestTheme,
    honey: honeyTheme,
    minimal: minimalTheme,
};

/**
 * Get theme by name. If "auto", detects system preference.
 */
export function getTheme(name: ThemeName): Theme {
    if (name === "auto") {
        if (typeof window !== "undefined") {
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            return prefersDark ? midnightTheme : minimalTheme;
        }
        return minimalTheme;
    }
    return THEMES[name] || minimalTheme;
}

/**
 * Check if system prefers dark mode
 */
export function prefersDarkMode(): boolean {
    if (typeof window !== "undefined") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
}

/**
 * Generate CSS variables from theme
 */
export function getThemeCSSVariables(theme: Theme): Record<string, string> {
    return {
        "--hj-bg": theme.colors.background,
        "--hj-bg-secondary": theme.colors.backgroundSecondary,
        "--hj-card-bg": theme.colors.cardBackground,
        "--hj-card-border": theme.colors.cardBorder,
        "--hj-text-primary": theme.colors.textPrimary,
        "--hj-text-secondary": theme.colors.textSecondary,
        "--hj-text-muted": theme.colors.textMuted,
        "--hj-input-bg": theme.colors.inputBackground,
        "--hj-input-border": theme.colors.inputBorder,
        "--hj-input-text": theme.colors.inputText,
        "--hj-input-placeholder": theme.colors.inputPlaceholder,
        "--hj-input-focus": theme.colors.inputFocus,
        "--hj-btn-primary": theme.colors.buttonPrimary,
        "--hj-btn-primary-hover": theme.colors.buttonPrimaryHover,
        "--hj-btn-primary-text": theme.colors.buttonPrimaryText,
        "--hj-error": theme.colors.error,
        "--hj-error-bg": theme.colors.errorBackground,
        "--hj-accent": theme.colors.accent,
        "--hj-link": theme.colors.link,
        "--hj-radius": theme.styles.borderRadius,
        "--hj-shadow": theme.styles.cardShadow,
        "--hj-transition": theme.styles.transition,
    };
}

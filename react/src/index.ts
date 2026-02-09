export * from "./context";
export * from "./hooks/useRole";
export * from "./components/Protect";
export * from "./components/AuthGuard";
export * from "./components/SignIn";
export * from "./components/SignUp";
export * from "./components/CompleteProfile";
export * from "./components/ForgotPassword";
export * from "./components/ResetPassword";
export * from "./components/EmailVerificationPending";
export * from "./components/PhoneInput";
export * from "./components/CountrySelect";
export * from "./components/FormWrapper";
export * from "./components/UserButton";
export * from "./components/UserProfile";
export * from "./components/MFAChallenge";
export * from "./components/MFASetup";

// Theme exports
export {
    type ThemeName,
    type Theme,
    type ThemeColors,
    THEMES,
    getTheme,
    prefersDarkMode,
    getThemeCSSVariables,
    midnightTheme,
    oceanTheme,
    sunriseTheme,
    forestTheme,
    honeyTheme,
    minimalTheme,
} from "./lib/themes";

// i18n exports
export { useI18n, t, en, es, type Locale, type DeepPartial } from "./i18n";

// Simple logout helper - just call byeJohn() to logout!
export { byeJohn } from "./helpers/logout";

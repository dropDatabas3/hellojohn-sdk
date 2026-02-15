import React from "react";
import { useI18n } from "../i18n";
import { useRoutes, useHJNavigate } from "../routing";

export interface SignUpButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Override register path. Defaults to routes.register from AuthProvider. */
    href?: string;
    /** Use SDK navigate function for SPA navigation. Default: true. */
    spa?: boolean;
}

/**
 * Dynamic sign-up button that reads register route from AuthProvider routing context.
 * Label is localized via i18n when children is omitted.
 */
export function SignUpButton({
    href,
    spa = true,
    onClick,
    type = "button",
    children,
    disabled,
    ...rest
}: SignUpButtonProps) {
    const i18n = useI18n();
    const routes = useRoutes();
    const navigate = useHJNavigate();
    const target = href || routes.register;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e);
        if (e.defaultPrevented || disabled) return;
        if (spa) {
            navigate(target);
            return;
        }
        if (typeof window !== "undefined") {
            window.location.href = target;
        }
    };

    return (
        <button type={type} onClick={handleClick} disabled={disabled} {...rest}>
            {children || i18n.signIn.signUpLink}
        </button>
    );
}


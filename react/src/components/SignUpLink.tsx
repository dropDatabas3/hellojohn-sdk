import React from "react";
import { useI18n } from "../i18n";
import { useRoutes, useHJNavigate } from "../routing";

export interface SignUpLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
    /** Override register path. Defaults to routes.register from AuthProvider. */
    href?: string;
    /** Use SDK navigate function for SPA navigation. Default: true. */
    spa?: boolean;
}

/**
 * Dynamic sign-up link that reads register route from AuthProvider routing context.
 *
 * @example
 * <SignUpLink>Register</SignUpLink>
 *
 * @example
 * <Button asChild>
 *   <SignUpLink>Register</SignUpLink>
 * </Button>
 */
export function SignUpLink({
    href,
    spa = true,
    onClick,
    children,
    ...rest
}: SignUpLinkProps) {
    const i18n = useI18n();
    const routes = useRoutes();
    const navigate = useHJNavigate();
    const target = href || routes.register;

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (e.defaultPrevented || !spa) return;
        e.preventDefault();
        navigate(target);
    };

    return (
        <a href={target} onClick={handleClick} {...rest}>
            {children || i18n.signIn.signUpLink}
        </a>
    );
}

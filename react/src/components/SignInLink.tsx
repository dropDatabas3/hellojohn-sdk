import React from "react";
import { useI18n } from "../i18n";
import { useRoutes, useHJNavigate } from "../routing";

export interface SignInLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
    /** Override login path. Defaults to routes.login from AuthProvider. */
    href?: string;
    /** Use SDK navigate function for SPA navigation. Default: true. */
    spa?: boolean;
}

/**
 * Dynamic sign-in link that reads login route from AuthProvider routing context.
 *
 * @example
 * <SignInLink>Sign in</SignInLink>
 *
 * @example
 * <Button asChild>
 *   <SignInLink>Sign in</SignInLink>
 * </Button>
 */
export function SignInLink({
    href,
    spa = true,
    onClick,
    children,
    ...rest
}: SignInLinkProps) {
    const i18n = useI18n();
    const routes = useRoutes();
    const navigate = useHJNavigate();
    const target = href || routes.login;

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (e.defaultPrevented || !spa) return;
        e.preventDefault();
        navigate(target);
    };

    return (
        <a href={target} onClick={handleClick} {...rest}>
            {children || i18n.signIn.submitButton}
        </a>
    );
}

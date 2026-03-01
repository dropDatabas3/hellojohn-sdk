from __future__ import annotations

from collections.abc import Callable

try:
    from fastapi import Depends, HTTPException, Security, status
    from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
except ImportError as exc:
    raise ImportError(
        "FastAPI is required for hellojohn.fastapi. Install it with: pip install hellojohn[fastapi]"
    ) from exc

from .claims import TokenClaims
from .exceptions import TokenExpiredError, TokenVerificationError
from .verifier import HelloJohnVerifier

_bearer_scheme = HTTPBearer(auto_error=True)


def require_auth(verifier: HelloJohnVerifier) -> Callable[..., TokenClaims]:
    """Build a FastAPI dependency that validates Bearer tokens."""

    def dependency(
        credentials: HTTPAuthorizationCredentials = Security(_bearer_scheme),
    ) -> TokenClaims:
        try:
            return verifier.verify(credentials.credentials)
        except TokenExpiredError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired",
                headers={"WWW-Authenticate": "Bearer"},
            ) from exc
        except TokenVerificationError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            ) from exc

    return dependency


def require_scope(verifier: HelloJohnVerifier, scope: str) -> Callable[..., TokenClaims]:
    """Build a FastAPI dependency that validates token plus required scope."""

    def dependency(claims: TokenClaims = Depends(require_auth(verifier))) -> TokenClaims:
        if not claims.has_scope(scope):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required scope: {scope}",
            )
        return claims

    return dependency


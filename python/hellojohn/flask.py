from __future__ import annotations

import functools
from collections.abc import Callable
from typing import Any, ParamSpec, TypeVar, cast

try:
    from flask import g, jsonify, request
except ImportError as exc:
    raise ImportError(
        "Flask is required for hellojohn.flask. Install it with: pip install hellojohn[flask]"
    ) from exc

from .claims import TokenClaims
from .exceptions import TokenExpiredError, TokenVerificationError
from .verifier import HelloJohnVerifier

P = ParamSpec("P")
R = TypeVar("R")


def require_auth(verifier: HelloJohnVerifier) -> Callable[[Callable[P, R]], Callable[P, Any]]:
    """Flask decorator that validates Bearer tokens and stores claims in flask.g."""

    def decorator(func: Callable[P, R]) -> Callable[P, Any]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> Any:
            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                return jsonify({"error": "unauthorized", "message": "Missing Bearer token"}), 401

            token = auth_header[7:]
            try:
                claims = verifier.verify(token)
                g.hj_claims = claims
            except TokenExpiredError:
                return jsonify({"error": "token_expired", "message": "Token has expired"}), 401
            except TokenVerificationError:
                return jsonify({"error": "invalid_token", "message": "Invalid token"}), 401

            return func(*args, **kwargs)

        return wrapper

    return decorator


def require_scope(
    verifier: HelloJohnVerifier,
    scope: str,
) -> Callable[[Callable[P, R]], Callable[P, Any]]:
    """Flask decorator that validates token plus required scope."""

    def decorator(func: Callable[P, R]) -> Callable[P, Any]:
        @functools.wraps(func)
        @require_auth(verifier)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> Any:
            claims = cast(TokenClaims, getattr(g, "hj_claims", None))
            if claims is None or not claims.has_scope(scope):
                return jsonify({"error": "insufficient_scope", "required_scope": scope}), 403
            return func(*args, **kwargs)

        return wrapper

    return decorator


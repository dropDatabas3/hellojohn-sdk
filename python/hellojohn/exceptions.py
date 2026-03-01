class HelloJohnError(Exception):
    """Base exception for all SDK errors."""


class TokenVerificationError(HelloJohnError):
    """Raised when a JWT cannot be verified."""


class TokenExpiredError(TokenVerificationError):
    """Raised when a JWT is expired."""


class InsufficientScopeError(HelloJohnError):
    """Raised when a token does not include the required scope."""

    def __init__(self, required_scope: str) -> None:
        self.required_scope = required_scope
        super().__init__(f"Required scope: {required_scope}")


class JWKSFetchError(HelloJohnError):
    """Raised when JWKS cannot be fetched or parsed."""


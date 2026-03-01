from __future__ import annotations

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from hellojohn.claims import TokenClaims
from hellojohn.exceptions import TokenExpiredError, TokenVerificationError
from hellojohn.fastapi import require_auth, require_scope


class _OkVerifier:
    def verify(self, token: str) -> TokenClaims:
        assert token == "good-token"
        return TokenClaims(
            sub="user_1",
            iss="https://auth.acme.com",
            aud=["api"],
            exp=9999999999,
            iat=1,
            tid="acme",
            email="john@example.com",
            roles=["admin"],
            scopes=["admin:read"],
        )


class _InvalidVerifier:
    def verify(self, _token: str) -> TokenClaims:
        raise TokenVerificationError("invalid")


class _ExpiredVerifier:
    def verify(self, _token: str) -> TokenClaims:
        raise TokenExpiredError("expired")


def test_fastapi_require_auth_success() -> None:
    app = FastAPI()
    verifier = _OkVerifier()

    @app.get("/profile")
    def profile(claims: TokenClaims = Depends(require_auth(verifier))):
        return {"sub": claims.sub, "email": claims.email}

    client = TestClient(app)
    resp = client.get("/profile", headers={"Authorization": "Bearer good-token"})

    assert resp.status_code == 200
    assert resp.json()["sub"] == "user_1"


def test_fastapi_require_auth_invalid_token() -> None:
    app = FastAPI()
    verifier = _InvalidVerifier()

    @app.get("/profile")
    def profile(claims: TokenClaims = Depends(require_auth(verifier))):
        return {"sub": claims.sub}

    client = TestClient(app)
    resp = client.get("/profile", headers={"Authorization": "Bearer bad-token"})

    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid token"


def test_fastapi_require_auth_expired_token() -> None:
    app = FastAPI()
    verifier = _ExpiredVerifier()

    @app.get("/profile")
    def profile(claims: TokenClaims = Depends(require_auth(verifier))):
        return {"sub": claims.sub}

    client = TestClient(app)
    resp = client.get("/profile", headers={"Authorization": "Bearer expired-token"})

    assert resp.status_code == 401
    assert resp.json()["detail"] == "Token expired"


def test_fastapi_require_scope_forbidden() -> None:
    class _NoScopeVerifier:
        def verify(self, _token: str) -> TokenClaims:
            return TokenClaims(
                sub="user_1",
                iss="https://auth.acme.com",
                aud=["api"],
                exp=9999999999,
                iat=1,
                tid="acme",
                scopes=["profile:read"],
            )

    app = FastAPI()
    verifier = _NoScopeVerifier()

    @app.get("/admin")
    def admin(claims: TokenClaims = Depends(require_scope(verifier, "admin:read"))):
        return {"sub": claims.sub}

    client = TestClient(app)
    resp = client.get("/admin", headers={"Authorization": "Bearer good-token"})

    assert resp.status_code == 403
    assert resp.json()["detail"] == "Required scope: admin:read"


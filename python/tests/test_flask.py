from __future__ import annotations

from flask import Flask, g, jsonify

from hellojohn.claims import TokenClaims
from hellojohn.exceptions import TokenExpiredError, TokenVerificationError
from hellojohn.flask import require_auth, require_scope


def _claims(scopes: list[str] | None = None) -> TokenClaims:
    return TokenClaims(
        sub="user_1",
        iss="https://auth.acme.com",
        aud=["api"],
        exp=9999999999,
        iat=1,
        tid="acme",
        email="john@example.com",
        roles=["admin"],
        scopes=scopes or [],
    )


def test_flask_require_auth_success() -> None:
    class _Verifier:
        def verify(self, token: str) -> TokenClaims:
            assert token == "valid-token"
            return _claims(["admin:read"])

    app = Flask(__name__)
    verifier = _Verifier()

    @app.get("/profile")
    @require_auth(verifier)
    def profile():
        return jsonify({"sub": g.hj_claims.sub, "email": g.hj_claims.email})

    client = app.test_client()
    resp = client.get("/profile", headers={"Authorization": "Bearer valid-token"})

    assert resp.status_code == 200
    assert resp.get_json()["sub"] == "user_1"


def test_flask_require_auth_missing_header() -> None:
    class _Verifier:
        def verify(self, _token: str) -> TokenClaims:
            return _claims()

    app = Flask(__name__)
    verifier = _Verifier()

    @app.get("/profile")
    @require_auth(verifier)
    def profile():
        return jsonify({"ok": True})

    client = app.test_client()
    resp = client.get("/profile")

    assert resp.status_code == 401
    assert resp.get_json()["error"] == "unauthorized"


def test_flask_require_auth_invalid_token() -> None:
    class _Verifier:
        def verify(self, _token: str) -> TokenClaims:
            raise TokenVerificationError("bad token")

    app = Flask(__name__)
    verifier = _Verifier()

    @app.get("/profile")
    @require_auth(verifier)
    def profile():
        return jsonify({"ok": True})

    client = app.test_client()
    resp = client.get("/profile", headers={"Authorization": "Bearer invalid-token"})

    assert resp.status_code == 401
    assert resp.get_json()["error"] == "invalid_token"


def test_flask_require_auth_expired_token() -> None:
    class _Verifier:
        def verify(self, _token: str) -> TokenClaims:
            raise TokenExpiredError("expired")

    app = Flask(__name__)
    verifier = _Verifier()

    @app.get("/profile")
    @require_auth(verifier)
    def profile():
        return jsonify({"ok": True})

    client = app.test_client()
    resp = client.get("/profile", headers={"Authorization": "Bearer expired-token"})

    assert resp.status_code == 401
    assert resp.get_json()["error"] == "token_expired"


def test_flask_require_scope() -> None:
    class _Verifier:
        def verify(self, _token: str) -> TokenClaims:
            return _claims(["profile:read"])

    app = Flask(__name__)
    verifier = _Verifier()

    @app.get("/admin")
    @require_scope(verifier, "admin:read")
    def admin():
        return jsonify({"ok": True})

    client = app.test_client()
    resp = client.get("/admin", headers={"Authorization": "Bearer valid-token"})

    assert resp.status_code == 403
    assert resp.get_json()["error"] == "insufficient_scope"


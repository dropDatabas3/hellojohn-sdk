from __future__ import annotations

import json
import time
from typing import Any

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from jwt.algorithms import OKPAlgorithm

from hellojohn import HelloJohnVerifier, TokenClaims
from hellojohn.exceptions import JWKSFetchError, TokenExpiredError, TokenVerificationError


class _FakeResponse:
    def __init__(self, payload: dict[str, Any], status_code: int = 200) -> None:
        self._payload = payload
        self.status_code = status_code

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("error", request=None, response=None)

    def json(self) -> dict[str, Any]:
        return self._payload


def _issue_token(
    private_key: Ed25519PrivateKey,
    *,
    expires_in_seconds: int = 3600,
    kid: str = "kid-1",
) -> str:
    now = int(time.time())
    payload = {
        "sub": "user_123",
        "iss": "https://auth.acme.com",
        "aud": ["api"],
        "exp": now + expires_in_seconds,
        "iat": now,
        "tid": "acme",
        "email": "john@example.com",
        "roles": ["admin"],
        "scopes": ["admin:read", "profile:read"],
    }
    return jwt.encode(payload, private_key, algorithm="EdDSA", headers={"kid": kid, "alg": "EdDSA"})


def test_verify_success_and_token_claims(monkeypatch: pytest.MonkeyPatch) -> None:
    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key()
    key_data = json.loads(OKPAlgorithm.to_jwk(public_key))
    key_data["kid"] = "kid-1"
    key_data["alg"] = "EdDSA"

    token = _issue_token(private_key, kid="kid-1")

    def fake_get(url: str, timeout: float) -> _FakeResponse:
        assert url.endswith("/.well-known/jwks.json")
        assert timeout == 10.0
        return _FakeResponse({"keys": [key_data]})

    monkeypatch.setattr(httpx, "get", fake_get)

    verifier = HelloJohnVerifier(domain="https://auth.acme.com", tenant="acme")
    claims = verifier.verify(token)

    assert isinstance(claims, TokenClaims)
    assert claims.sub == "user_123"
    assert claims.email == "john@example.com"
    assert claims.has_scope("admin:read")
    assert claims.has_role("admin")


def test_verify_uses_cache_before_ttl(monkeypatch: pytest.MonkeyPatch) -> None:
    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key()
    key_data = json.loads(OKPAlgorithm.to_jwk(public_key))
    key_data["kid"] = "kid-1"
    key_data["alg"] = "EdDSA"
    token = _issue_token(private_key, kid="kid-1")

    fetch_count = {"count": 0}

    def fake_get(url: str, timeout: float) -> _FakeResponse:
        fetch_count["count"] += 1
        return _FakeResponse({"keys": [key_data]})

    monkeypatch.setattr(httpx, "get", fake_get)

    verifier = HelloJohnVerifier(domain="https://auth.acme.com", tenant="acme", cache_ttl_seconds=900)
    verifier.verify(token)
    verifier.verify(token)

    assert fetch_count["count"] == 1


def test_verify_raises_token_expired(monkeypatch: pytest.MonkeyPatch) -> None:
    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key()
    key_data = json.loads(OKPAlgorithm.to_jwk(public_key))
    key_data["kid"] = "kid-1"
    key_data["alg"] = "EdDSA"
    token = _issue_token(private_key, expires_in_seconds=-1, kid="kid-1")

    monkeypatch.setattr(httpx, "get", lambda *_args, **_kwargs: _FakeResponse({"keys": [key_data]}))

    verifier = HelloJohnVerifier(domain="https://auth.acme.com", tenant="acme")
    with pytest.raises(TokenExpiredError):
        verifier.verify(token)


def test_verify_fails_when_jwks_unavailable(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_get(*_args: Any, **_kwargs: Any) -> _FakeResponse:
        raise httpx.ConnectError("network down")

    monkeypatch.setattr(httpx, "get", fake_get)

    verifier = HelloJohnVerifier(domain="https://auth.acme.com", tenant="acme")
    with pytest.raises(JWKSFetchError):
        verifier.verify("Bearer fake.jwt.token")


def test_verify_invalid_token(monkeypatch: pytest.MonkeyPatch) -> None:
    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key()
    key_data = json.loads(OKPAlgorithm.to_jwk(public_key))
    key_data["kid"] = "kid-1"
    key_data["alg"] = "EdDSA"

    monkeypatch.setattr(httpx, "get", lambda *_args, **_kwargs: _FakeResponse({"keys": [key_data]}))

    verifier = HelloJohnVerifier(domain="https://auth.acme.com", tenant="acme")
    with pytest.raises(TokenVerificationError):
        verifier.verify("not-a-jwt")


def test_verifier_init_does_not_fetch_jwks(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_get(*_args: Any, **_kwargs: Any) -> _FakeResponse:
        raise AssertionError("JWKS fetch should not occur during __init__")

    monkeypatch.setattr(httpx, "get", fake_get)

    # Must not raise: fail-safe means no JWKS I/O during initialization.
    HelloJohnVerifier(domain="https://auth.acme.com", tenant="acme")

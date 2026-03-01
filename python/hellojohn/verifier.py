from __future__ import annotations

import threading
import time
from typing import Any

import httpx
import jwt
from jwt import PyJWK

from .claims import TokenClaims
from .exceptions import JWKSFetchError, TokenExpiredError, TokenVerificationError


class HelloJohnVerifier:
    """
    Verifies HelloJohn JWTs using JWKS.

    JWKS is cached in memory with TTL and refreshed in background when stale.
    """

    ALLOWED_ALGORITHMS = {"EdDSA", "RS256", "RS384", "RS512"}

    def __init__(
        self,
        domain: str,
        tenant: str,
        cache_ttl_seconds: int = 900,
        http_timeout_seconds: float = 10.0,
    ) -> None:
        self._domain = domain.rstrip("/")
        self._tenant = tenant
        self._cache_ttl = cache_ttl_seconds
        self._http_timeout = http_timeout_seconds
        self._jwks_url = f"{self._domain}/.well-known/jwks.json"

        self._jwks_cache: list[dict[str, Any]] = []
        self._cache_fetched_at: float = 0.0
        self._lock = threading.RLock()

        self._refresh_timer: threading.Timer | None = None
        self._refresh_in_progress = False

    def verify(self, token: str) -> TokenClaims:
        if token.startswith("Bearer "):
            token = token[7:]

        keys = self._get_jwks_for_verify()
        if not keys:
            raise TokenVerificationError("No JWKS keys available for verification")

        header = self._get_unverified_header(token)
        preferred_kid = header.get("kid")

        ordered_keys: list[dict[str, Any]]
        if isinstance(preferred_kid, str) and preferred_kid:
            matching = [item for item in keys if item.get("kid") == preferred_kid]
            others = [item for item in keys if item.get("kid") != preferred_kid]
            ordered_keys = [*matching, *others]
        else:
            ordered_keys = keys

        for key_data in ordered_keys:
            try:
                algorithm = str(key_data.get("alg", header.get("alg", "EdDSA")))
                if algorithm not in self.ALLOWED_ALGORITHMS:
                    continue

                jwk = PyJWK.from_dict(key_data)
                payload = jwt.decode(
                    token,
                    jwk.key,
                    algorithms=[algorithm],
                    options={
                        "verify_exp": True,
                        "verify_iat": True,
                        "verify_aud": False,
                        "require": ["sub", "exp", "iat", "iss"],
                    },
                )
                return TokenClaims.from_dict(payload)
            except jwt.ExpiredSignatureError as exc:
                raise TokenExpiredError("Token has expired") from exc
            except jwt.InvalidTokenError:
                continue
            except ValueError:
                continue

        raise TokenVerificationError("Could not verify token with any available key")

    def close(self) -> None:
        with self._lock:
            if self._refresh_timer is not None:
                self._refresh_timer.cancel()
                self._refresh_timer = None

    def __del__(self) -> None:
        self.close()

    def _get_unverified_header(self, token: str) -> dict[str, Any]:
        try:
            header = jwt.get_unverified_header(token)
            if isinstance(header, dict):
                return header
        except jwt.InvalidTokenError:
            pass
        return {}

    def _get_jwks_for_verify(self) -> list[dict[str, Any]]:
        with self._lock:
            if not self._jwks_cache:
                keys = self._fetch_jwks()
                self._jwks_cache = keys
                self._cache_fetched_at = time.monotonic()
                return keys

            age = time.monotonic() - self._cache_fetched_at
            if age < self._cache_ttl:
                return list(self._jwks_cache)

            # Use stale cache while refreshing in background.
            self._schedule_background_refresh()
            return list(self._jwks_cache)

    def _schedule_background_refresh(self) -> None:
        if self._refresh_in_progress:
            return

        self._refresh_in_progress = True

        def run_refresh() -> None:
            try:
                keys = self._fetch_jwks()
                with self._lock:
                    self._jwks_cache = keys
                    self._cache_fetched_at = time.monotonic()
            except JWKSFetchError:
                # Keep stale cache until a future refresh succeeds.
                pass
            finally:
                with self._lock:
                    self._refresh_in_progress = False
                    self._refresh_timer = None

        self._refresh_timer = threading.Timer(0.01, run_refresh)
        self._refresh_timer.daemon = True
        self._refresh_timer.start()

    def _fetch_jwks(self) -> list[dict[str, Any]]:
        try:
            response = httpx.get(self._jwks_url, timeout=self._http_timeout)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise JWKSFetchError(f"Failed to fetch JWKS from {self._jwks_url}: {exc}") from exc

        try:
            data = response.json()
        except ValueError as exc:
            raise JWKSFetchError(f"Invalid JWKS JSON from {self._jwks_url}") from exc

        keys_raw = data.get("keys", [])
        if not isinstance(keys_raw, list):
            raise JWKSFetchError(f"JWKS at {self._jwks_url} returned invalid keys field")

        keys: list[dict[str, Any]] = []
        for item in keys_raw:
            if isinstance(item, dict):
                keys.append(item)

        if not keys:
            raise JWKSFetchError(f"JWKS at {self._jwks_url} returned empty keys")

        return keys


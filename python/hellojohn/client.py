from __future__ import annotations

from typing import Any

import httpx

from .exceptions import HelloJohnError


class HelloJohnClient:
    """M2M client credentials helper for HelloJohn service-to-service access."""

    def __init__(
        self,
        domain: str,
        tenant: str,
        client_id: str,
        client_secret: str,
        http_timeout_seconds: float = 10.0,
    ) -> None:
        self._domain = domain.rstrip("/")
        self._tenant = tenant
        self._client_id = client_id
        self._client_secret = client_secret
        self._timeout = http_timeout_seconds
        self._token_url = f"{self._domain}/v2/auth/token"

    def get_access_token(self, scopes: list[str] | None = None) -> str:
        payload: dict[str, Any] = {
            "grant_type": "client_credentials",
            "client_id": self._client_id,
            "client_secret": self._client_secret,
            "tenant_id": self._tenant,
        }
        if scopes:
            payload["scope"] = " ".join(scopes)

        try:
            response = httpx.post(self._token_url, json=payload, timeout=self._timeout)
            response.raise_for_status()
            data = response.json()
        except httpx.HTTPError as exc:
            raise HelloJohnError(f"Failed to get access token: {exc}") from exc
        except ValueError as exc:
            raise HelloJohnError("Failed to decode token endpoint response") from exc

        token = data.get("access_token")
        if not isinstance(token, str) or not token:
            raise HelloJohnError("Response missing access_token field")

        return token


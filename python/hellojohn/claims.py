from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


def _to_str_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [item for item in value if isinstance(item, str)]
    if isinstance(value, str) and value.strip():
        return [value]
    return []


@dataclass(slots=True)
class TokenClaims:
    """Typed JWT claims used by HelloJohn middleware integrations."""

    sub: str
    iss: str
    aud: list[str]
    exp: int
    iat: int
    tid: str
    email: str = ""
    name: str = ""
    roles: list[str] = field(default_factory=list)
    scopes: list[str] = field(default_factory=list)
    extra: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "TokenClaims":
        known_keys = {
            "sub",
            "iss",
            "aud",
            "exp",
            "iat",
            "tid",
            "email",
            "name",
            "roles",
            "scope",
            "scopes",
        }
        extra = {key: value for key, value in payload.items() if key not in known_keys}

        aud_raw = payload.get("aud", [])
        aud = _to_str_list(aud_raw)

        roles_raw = payload.get("roles", [])
        roles = _to_str_list(roles_raw)

        scopes_raw = payload.get("scopes", payload.get("scope", []))
        if isinstance(scopes_raw, str):
            scopes = [chunk for chunk in scopes_raw.split() if chunk]
        else:
            scopes = _to_str_list(scopes_raw)

        return cls(
            sub=str(payload.get("sub", "")),
            iss=str(payload.get("iss", "")),
            aud=aud,
            exp=int(payload.get("exp", 0) or 0),
            iat=int(payload.get("iat", 0) or 0),
            tid=str(payload.get("tid", "")),
            email=str(payload.get("email", "")),
            name=str(payload.get("name", "")),
            roles=roles,
            scopes=scopes,
            extra=extra,
        )

    def has_scope(self, scope: str) -> bool:
        return scope in self.scopes

    def has_role(self, role: str) -> bool:
        return role in self.roles


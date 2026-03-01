from fastapi import Depends, FastAPI

from hellojohn import HelloJohnVerifier, TokenClaims
from hellojohn.fastapi import require_auth

app = FastAPI(title="HelloJohn Python Quickstart")
verifier = HelloJohnVerifier(domain="http://localhost:8080", tenant="default")


@app.get("/api/public")
def public() -> dict[str, str]:
    return {"message": "Public endpoint"}


@app.get("/api/profile")
def profile(claims: TokenClaims = Depends(require_auth(verifier))) -> dict[str, object]:
    return {"user_id": claims.sub, "email": claims.email, "roles": claims.roles}


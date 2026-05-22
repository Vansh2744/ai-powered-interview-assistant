import httpx
from jose import jwt, JWTError
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
from dotenv import load_dotenv

load_dotenv()

CLERK_JWKS_URL = os.getenv("CLERK_JWKS_URL")
security = HTTPBearer()


def verify_token(token: str) -> dict:
    """Core verification logic — shared by both HTTP and WebSocket auth."""
    try:
        jwks = httpx.get(CLERK_JWKS_URL).json()

        unverified_header = jwt.get_unverified_header(token)
        token_kid = unverified_header.get("kid")

        rsa_key = None
        for key in jwks["keys"]:
            if key["kid"] == token_kid:
                rsa_key = key
                break

        if rsa_key is None:
            raise HTTPException(status_code=401, detail="No matching key found in JWKS")

        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            options={"verify_aud": False}
        )
        return payload

    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"JWKS fetch failed: {str(e)}")


def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """For regular HTTP endpoints — extracts token from Authorization header."""
    return verify_token(credentials.credentials)


async def get_current_user_ws(token: str) -> dict:
    """For WebSocket endpoints — accepts raw token string from query param."""
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")
    return verify_token(token)
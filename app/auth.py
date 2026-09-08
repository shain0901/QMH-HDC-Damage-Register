"""
Session handling (JWT in an httpOnly cookie) and role-based permission checks.

Roles: admin, editor, reporter_repairer, repairer — see ROLE_CAPS below for exactly
what each can do. Change capabilities in one place here, not per-endpoint.
"""
import datetime
import secrets
from typing import Optional

import jwt
from fastapi import Cookie, Depends, HTTPException, Request, Response

from app.config import settings

COOKIE_NAME = "qmh_session"
SESSION_DAYS = 30
MAGIC_LINK_MINUTES = 15

ROLES = ("admin", "editor", "reporter_repairer", "repairer")

# Capability matrix — the single source of truth for what each role can do.
ROLE_CAPS = {
    "admin":             dict(create_incident=True,  edit_full=True,  edit_repair=True,  delete=True,  manage_zones=True,  manage_users=True),
    "editor":            dict(create_incident=True,  edit_full=True,  edit_repair=True,  delete=False, manage_zones=True,  manage_users=False),
    "reporter_repairer": dict(create_incident=True,  edit_full=False, edit_repair=True,  delete=False, manage_zones=False, manage_users=False),
    "repairer":          dict(create_incident=False, edit_full=False, edit_repair=True,  delete=False, manage_zones=False, manage_users=False),
}


def can(role: str, capability: str) -> bool:
    return ROLE_CAPS.get(role, {}).get(capability, False)


def new_token() -> str:
    return secrets.token_urlsafe(32)


def issue_session_cookie(response: Response, user: dict) -> None:
    payload = {
        "sub": str(user["id"]),
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=SESSION_DAYS),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=SESSION_DAYS * 24 * 3600,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME, path="/")


class CurrentUser:
    def __init__(self, id: str, email: str, name: str, role: str):
        self.id = id
        self.email = email
        self.name = name
        self.role = role

    def can(self, capability: str) -> bool:
        return can(self.role, capability)


def _decode(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None


def get_current_user(request: Request, qmh_session: Optional[str] = Cookie(default=None)) -> CurrentUser:
    token = qmh_session
    if not token:
        # Fallback for API clients that can't rely on cookies (rare) — Authorization: Bearer <jwt>
        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not signed in.")
    data = _decode(token)
    if not data:
        raise HTTPException(status_code=401, detail="Session expired — please sign in again.")
    return CurrentUser(id=data["sub"], email=data["email"], name=data["name"], role=data["role"])


def require(*capabilities: str):
    """FastAPI dependency factory: user = Depends(require('edit_full'))

    Requires the caller be signed in AND have every listed capability. With no
    capabilities given, it's just "signed in" (any role)."""

    def checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        for cap in capabilities:
            if not user.can(cap):
                raise HTTPException(status_code=403, detail=f"Your role ({user.role}) can't do this.")
        return user

    return checker

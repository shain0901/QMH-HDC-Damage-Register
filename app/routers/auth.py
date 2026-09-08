import datetime

from fastapi import APIRouter, Depends, HTTPException, Response

from app.auth import (
    MAGIC_LINK_MINUTES,
    CurrentUser,
    clear_session_cookie,
    get_current_user,
    issue_session_cookie,
    new_token,
)
from app.db.connection import get_conn
from app.email import send_magic_link
from app.schemas import MeOut, RequestLinkIn, VerifyIn
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/request-link")
def request_link(body: RequestLinkIn):
    email = body.email.lower().strip()
    with get_conn() as conn:
        row = conn.execute(
            "select id, name, active from users where lower(email) = %s", (email,)
        ).fetchone()
        # Always return the same response whether or not the email is registered —
        # don't let this endpoint be used to find out who has an account.
        if not row or not row["active"]:
            return {"ok": True}

        token = new_token()
        expires = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=MAGIC_LINK_MINUTES)
        conn.execute(
            "insert into magic_links (token, email, expires_at) values (%s, %s, %s)",
            (token, email, expires),
        )
        link = f"{settings.app_base_url}/auth/callback?token={token}"
        send_magic_link(email, row["name"], link)
    return {"ok": True}


@router.post("/verify", response_model=MeOut)
def verify(body: VerifyIn, response: Response):
    with get_conn() as conn:
        row = conn.execute(
            "select token, email, expires_at, used_at from magic_links where token = %s",
            (body.token,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=400, detail="That sign-in link isn't valid. Request a new one.")
        if row["used_at"] is not None:
            raise HTTPException(status_code=400, detail="That sign-in link has already been used. Request a new one.")
        if row["expires_at"] < datetime.datetime.now(datetime.timezone.utc):
            raise HTTPException(status_code=400, detail="That sign-in link has expired. Request a new one.")

        conn.execute("update magic_links set used_at = now() where token = %s", (body.token,))

        user = conn.execute(
            "select id, email, name, role, active from users where lower(email) = %s",
            (row["email"],),
        ).fetchone()
        if not user or not user["active"]:
            raise HTTPException(status_code=403, detail="This account is no longer active.")

        conn.execute("update users set last_login_at = now() where id = %s", (user["id"],))

    issue_session_cookie(response, user)
    return MeOut(id=str(user["id"]), email=user["email"], name=user["name"], role=user["role"])


@router.get("/me", response_model=MeOut)
def me(user: CurrentUser = Depends(get_current_user)):
    return MeOut(id=user.id, email=user.email, name=user.name, role=user.role)


@router.post("/logout")
def logout(response: Response):
    clear_session_cookie(response)
    return {"ok": True}

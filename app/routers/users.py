from fastapi import APIRouter, Depends, HTTPException

from app.auth import ROLES, CurrentUser, require
from app.db.connection import get_conn
from app.schemas import UserIn, UserOut

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(user: CurrentUser = Depends(require("manage_users"))):
    with get_conn() as conn:
        rows = conn.execute(
            "select id, email, name, role, active, created_at, last_login_at from users order by name"
        ).fetchall()
    return [UserOut(**{**r, "id": str(r["id"])}) for r in rows]


@router.post("", response_model=UserOut)
def add_user(body: UserIn, user: CurrentUser = Depends(require("manage_users"))):
    if body.role not in ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {', '.join(ROLES)}")
    with get_conn() as conn:
        dupe = conn.execute("select 1 from users where lower(email) = %s", (body.email.lower(),)).fetchone()
        if dupe:
            raise HTTPException(status_code=409, detail="A user with that email already exists.")
        row = conn.execute(
            "insert into users (email, name, role) values (%s,%s,%s) "
            "returning id, email, name, role, active, created_at, last_login_at",
            (body.email.lower(), body.name.strip(), body.role),
        ).fetchone()
    return UserOut(**{**row, "id": str(row["id"])})


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: str, body: UserIn, user: CurrentUser = Depends(require("manage_users"))):
    if body.role not in ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {', '.join(ROLES)}")
    with get_conn() as conn:
        row = conn.execute(
            "update users set name = %s, role = %s where id = %s "
            "returning id, email, name, role, active, created_at, last_login_at",
            (body.name.strip(), body.role, user_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found.")
    return UserOut(**{**row, "id": str(row["id"])})


@router.post("/{user_id}/deactivate", response_model=UserOut)
def deactivate_user(user_id: str, user: CurrentUser = Depends(require("manage_users"))):
    if user_id == user.id:
        raise HTTPException(status_code=400, detail="You can't deactivate your own account.")
    with get_conn() as conn:
        row = conn.execute(
            "update users set active = false where id = %s "
            "returning id, email, name, role, active, created_at, last_login_at",
            (user_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found.")
    return UserOut(**{**row, "id": str(row["id"])})


@router.post("/{user_id}/reactivate", response_model=UserOut)
def reactivate_user(user_id: str, user: CurrentUser = Depends(require("manage_users"))):
    with get_conn() as conn:
        row = conn.execute(
            "update users set active = true where id = %s "
            "returning id, email, name, role, active, created_at, last_login_at",
            (user_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found.")
    return UserOut(**{**row, "id": str(row["id"])})

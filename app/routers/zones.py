from fastapi import APIRouter, Depends, HTTPException

from app.auth import CurrentUser, get_current_user, require
from app.db.connection import get_conn
from app.schemas import BuildingOut, ZoneIn, ZoneOut

router = APIRouter(prefix="/api", tags=["zones"])


@router.get("/buildings", response_model=list[BuildingOut])
def list_buildings(user: CurrentUser = Depends(get_current_user)):
    with get_conn() as conn:
        buildings = conn.execute(
            "select id, name from buildings order by sort_order, name"
        ).fetchall()
        zones = conn.execute(
            "select id, building_id, label, color from zones order by sort_order, label"
        ).fetchall()
    by_building: dict[str, list] = {}
    for z in zones:
        by_building.setdefault(str(z["building_id"]), []).append(
            ZoneOut(id=str(z["id"]), label=z["label"], color=z["color"])
        )
    return [
        BuildingOut(id=str(b["id"]), name=b["name"], zones=by_building.get(str(b["id"]), []))
        for b in buildings
    ]


@router.post("/buildings/{building_id}/zones", response_model=ZoneOut)
def add_zone(building_id: str, body: ZoneIn, user: CurrentUser = Depends(require("manage_zones"))):
    label = body.label.strip()
    if not label:
        raise HTTPException(status_code=400, detail="Zone label can't be empty.")
    with get_conn() as conn:
        exists = conn.execute(
            "select 1 from buildings where id = %s", (building_id,)
        ).fetchone()
        if not exists:
            raise HTTPException(status_code=404, detail="Building not found.")
        dupe = conn.execute(
            "select 1 from zones where building_id = %s and label = %s", (building_id, label)
        ).fetchone()
        if dupe:
            raise HTTPException(status_code=409, detail="A zone with that label already exists on this building.")
        row = conn.execute(
            "insert into zones (building_id, label, color) values (%s, %s, %s) returning id, label, color",
            (building_id, label, body.color),
        ).fetchone()
    return ZoneOut(id=str(row["id"]), label=row["label"], color=row["color"])


@router.patch("/zones/{zone_id}", response_model=ZoneOut)
def rename_zone(zone_id: str, body: ZoneIn, user: CurrentUser = Depends(require("manage_zones"))):
    label = body.label.strip()
    if not label:
        raise HTTPException(status_code=400, detail="Zone label can't be empty.")
    with get_conn() as conn:
        row = conn.execute(
            "update zones set label = %s, color = %s where id = %s returning id, label, color",
            (label, body.color, zone_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Zone not found.")
    return ZoneOut(id=str(row["id"]), label=row["label"], color=row["color"])


@router.delete("/zones/{zone_id}")
def delete_zone(zone_id: str, user: CurrentUser = Depends(require("manage_zones"))):
    with get_conn() as conn:
        row = conn.execute("delete from zones where id = %s returning id", (zone_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Zone not found.")
    # Past incidents keep their location on record (see schema.sql) — this only
    # removes the zone from the picker/map going forward.
    return {"ok": True}

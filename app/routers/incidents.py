import csv
import datetime
import io
import random
import string

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.auth import CurrentUser, get_current_user, require
from app.db.connection import get_conn
from app.schemas import IncidentIn, IncidentLocationOut, IncidentOut, IncidentPatch, PhotoOut

router = APIRouter(prefix="/api/incidents", tags=["incidents"])

REF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I — easier to read out loud


def _ref_code(date_found: datetime.date) -> str:
    suffix = "".join(random.choice(REF_CHARS) for _ in range(4))
    return f"HS-{date_found.strftime('%Y%m%d')}-{suffix}"


def _load_incidents(conn, where: str = "", params: tuple = ()) -> list[IncidentOut]:
    rows = conn.execute(
        f"""
        select i.*, coalesce(u.name, i.reported_by_name) as reported_by_name
        from incidents i
        left join users u on u.id = i.reported_by_user
        {where}
        order by i.date_found desc, i.time_found desc, i.created_at desc
        limit 1000
        """,
        params,
    ).fetchall()
    if not rows:
        return []
    ids = tuple(r["id"] for r in rows)
    locs = conn.execute(
        "select incident_id, zone_id, building_name, zone_label, zone_color "
        "from incident_locations where incident_id = any(%s)",
        (list(ids),),
    ).fetchall()
    photos = conn.execute(
        "select incident_id, id, blob_url, filename, uploaded_at "
        "from incident_photos where incident_id = any(%s) order by uploaded_at",
        (list(ids),),
    ).fetchall()
    locs_by_incident: dict = {}
    for l in locs:
        locs_by_incident.setdefault(str(l["incident_id"]), []).append(
            IncidentLocationOut(
                zone_id=str(l["zone_id"]) if l["zone_id"] else "",
                building=l["building_name"],
                zone_label=l["zone_label"],
                zone_color=l["zone_color"],
            )
        )
    photos_by_incident: dict = {}
    for p in photos:
        photos_by_incident.setdefault(str(p["incident_id"]), []).append(
            PhotoOut(id=str(p["id"]), blob_url=p["blob_url"], filename=p["filename"], uploaded_at=p["uploaded_at"])
        )
    out = []
    for r in rows:
        rid = str(r["id"])
        out.append(IncidentOut(
            id=rid, ref_code=r["ref_code"], date_found=r["date_found"], time_found=r["time_found"],
            reported_by_name=r["reported_by_name"], contact=r["contact"], damage_type=r["damage_type"],
            police_status=r["police_status"], police_number=r["police_number"], notes=r["notes"],
            repair_status=r["repair_status"], repair_contractor=r["repair_contractor"],
            repair_date=r["repair_date"], created_at=r["created_at"], updated_at=r["updated_at"],
            locations=locs_by_incident.get(rid, []), photos=photos_by_incident.get(rid, []),
        ))
    return out


@router.get("", response_model=list[IncidentOut])
def list_incidents(user: CurrentUser = Depends(get_current_user)):
    with get_conn() as conn:
        return _load_incidents(conn)


@router.post("", response_model=IncidentOut)
def create_incident(body: IncidentIn, user: CurrentUser = Depends(require("create_incident"))):
    if not body.locations:
        raise HTTPException(status_code=400, detail="Select at least one zone.")
    with get_conn() as conn:
        zone_ids = [loc.zone_id for loc in body.locations]
        zones = conn.execute(
            """
            select z.id, z.label, z.color, b.name as building_name
            from zones z join buildings b on b.id = z.building_id
            where z.id = any(%s)
            """,
            (zone_ids,),
        ).fetchall()
        found_ids = {str(z["id"]) for z in zones}
        missing = [zid for zid in zone_ids if zid not in found_ids]
        if missing:
            raise HTTPException(status_code=404, detail="One or more selected zones no longer exist.")

        ref_code = _ref_code(body.date_found)
        for _ in range(5):
            dupe = conn.execute("select 1 from incidents where ref_code = %s", (ref_code,)).fetchone()
            if not dupe:
                break
            ref_code = _ref_code(body.date_found)

        row = conn.execute(
            """
            insert into incidents
                (ref_code, date_found, time_found, reported_by_user, reported_by_name, contact,
                 damage_type, police_status, police_number, notes)
            values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            returning *
            """,
            (ref_code, body.date_found, body.time_found, user.id, user.name, body.contact,
             body.damage_type, body.police_status, body.police_number, body.notes),
        ).fetchone()

        zones_by_id = {str(z["id"]): z for z in zones}
        for zid in zone_ids:
            z = zones_by_id[zid]
            conn.execute(
                "insert into incident_locations (incident_id, zone_id, building_name, zone_label, zone_color) "
                "values (%s,%s,%s,%s,%s)",
                (row["id"], z["id"], z["building_name"], z["label"], z["color"]),
            )

        incidents = _load_incidents(conn, "where i.id = %s", (row["id"],))
    return incidents[0]


@router.get("/export.csv")
def export_csv(user: CurrentUser = Depends(get_current_user)):
    with get_conn() as conn:
        incidents = _load_incidents(conn)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Reference", "Locations", "Date", "Time", "Reported by", "Contact", "Damage type",
                "Police status", "Police number", "Repair status", "Repair contractor", "Repair date", "Notes", "Photos"])
    for i in incidents:
        loc_str = "; ".join(f"{l.building}: {l.zone_label}" for l in i.locations)
        photo_str = "; ".join(p.blob_url for p in i.photos)
        w.writerow([i.ref_code, loc_str, i.date_found, i.time_found, i.reported_by_name, i.contact or "",
                    i.damage_type, i.police_status, i.police_number or "", i.repair_status,
                    i.repair_contractor or "", i.repair_date or "", i.notes, photo_str])
    buf.seek(0)
    filename = f"qmh-damage-register-{datetime.date.today().isoformat()}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.patch("/{incident_id}", response_model=IncidentOut)
def patch_incident(incident_id: str, body: IncidentPatch, user: CurrentUser = Depends(get_current_user)):
    full_fields = {"police_status", "police_number", "damage_type", "notes"}
    repair_fields = {"repair_status", "repair_contractor", "repair_date"}

    patch = body.model_dump(exclude_unset=True)
    if not patch:
        raise HTTPException(status_code=400, detail="Nothing to update.")

    allowed = set()
    if user.can("edit_full"):
        allowed |= full_fields | repair_fields
    if user.can("edit_repair"):
        allowed |= repair_fields
    disallowed = set(patch) - allowed
    if disallowed:
        raise HTTPException(status_code=403, detail=f"Your role can't change: {', '.join(sorted(disallowed))}")

    set_clause = ", ".join(f"{k} = %s" for k in patch)
    values = list(patch.values()) + [incident_id]
    with get_conn() as conn:
        row = conn.execute(
            f"update incidents set {set_clause}, updated_at = now() where id = %s returning id",
            values,
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Incident not found.")
        incidents = _load_incidents(conn, "where i.id = %s", (incident_id,))
    return incidents[0]


@router.delete("/{incident_id}")
def delete_incident(incident_id: str, user: CurrentUser = Depends(require("delete"))):
    with get_conn() as conn:
        row = conn.execute("delete from incidents where id = %s returning id", (incident_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Incident not found.")
    return {"ok": True}

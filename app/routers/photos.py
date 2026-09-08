from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import CurrentUser, get_current_user
from app.db.connection import get_conn
from app.schemas import PhotoOut

router = APIRouter(prefix="/api/incidents", tags=["photos"])


class AttachPhotoIn(BaseModel):
    blob_url: str
    filename: str


@router.post("/{incident_id}/photos", response_model=PhotoOut)
def attach_photo(incident_id: str, body: AttachPhotoIn, user: CurrentUser = Depends(get_current_user)):
    # Anyone signed in can attach a photo to an incident (that's the whole point — the person on
    # site taking the photo may be any role). The upload itself already required a valid session,
    # see api/blob-upload-url.js.
    with get_conn() as conn:
        exists = conn.execute("select 1 from incidents where id = %s", (incident_id,)).fetchone()
        if not exists:
            raise HTTPException(status_code=404, detail="Incident not found.")
        row = conn.execute(
            "insert into incident_photos (incident_id, blob_url, filename, uploaded_by) "
            "values (%s,%s,%s,%s) returning id, blob_url, filename, uploaded_at",
            (incident_id, body.blob_url, body.filename, user.id),
        ).fetchone()
    return PhotoOut(id=str(row["id"]), blob_url=row["blob_url"], filename=row["filename"], uploaded_at=row["uploaded_at"])

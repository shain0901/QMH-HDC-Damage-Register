import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class RequestLinkIn(BaseModel):
    email: EmailStr


class VerifyIn(BaseModel):
    token: str


class MeOut(BaseModel):
    id: str
    email: str
    name: str
    role: str


class UserIn(BaseModel):
    email: EmailStr
    name: str
    role: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    active: bool
    created_at: datetime.datetime
    last_login_at: Optional[datetime.datetime] = None


class ZoneIn(BaseModel):
    label: str
    color: Optional[str] = None


class ZoneOut(BaseModel):
    id: str
    label: str
    color: Optional[str] = None


class BuildingOut(BaseModel):
    id: str
    name: str
    zones: list[ZoneOut] = []


class IncidentLocationIn(BaseModel):
    zone_id: str


class IncidentIn(BaseModel):
    locations: list[IncidentLocationIn]
    date_found: datetime.date
    time_found: datetime.time
    contact: Optional[str] = None
    damage_type: str
    police_status: str = "Not yet filed"
    police_number: Optional[str] = None
    notes: str


class IncidentPatch(BaseModel):
    police_status: Optional[str] = None
    police_number: Optional[str] = None
    repair_status: Optional[str] = None
    repair_contractor: Optional[str] = None
    repair_date: Optional[datetime.date] = None
    damage_type: Optional[str] = None
    notes: Optional[str] = None


class PhotoOut(BaseModel):
    id: str
    blob_url: str
    filename: str
    uploaded_at: datetime.datetime


class IncidentLocationOut(BaseModel):
    zone_id: str
    building: str
    zone_label: str
    zone_color: Optional[str] = None


class IncidentOut(BaseModel):
    id: str
    ref_code: str
    date_found: datetime.date
    time_found: datetime.time
    reported_by_name: str
    contact: Optional[str] = None
    damage_type: str
    police_status: str
    police_number: Optional[str] = None
    notes: str
    repair_status: str
    repair_contractor: Optional[str] = None
    repair_date: Optional[datetime.date] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    locations: list[IncidentLocationOut] = []
    photos: list[PhotoOut] = []

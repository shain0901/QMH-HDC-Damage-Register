from fastapi import FastAPI

from app.routers import auth, incidents, photos, users, zones

app = FastAPI(title="QMH Damage Register API")

app.include_router(auth.router)
app.include_router(zones.router)
app.include_router(incidents.router)
app.include_router(photos.router)
app.include_router(users.router)


@app.get("/api/health")
def health():
    return {"ok": True}

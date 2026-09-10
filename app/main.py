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

# Serves the built React frontend (frontend/dist, produced by vercel.json's buildCommand) at every
# path that isn't one of the /api/* routes above — API routes always take priority regardless of
# where this line sits. fallback="index.html" makes client-side (React Router) navigation work: a
# direct browser hit on e.g. /incidents/123 falls back to index.html instead of 404ing, so the SPA's
# own router can take over. Vercel promotes this directory to its CDN at build time.
app.frontend("/", directory="frontend/dist", fallback="index.html")
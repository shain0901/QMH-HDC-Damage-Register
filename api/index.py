# Vercel's Python runtime auto-detects an ASGI app named `app` in this file and serves it as a
# serverless function. All /api/* traffic (except /api/blob-upload-url, its own Node function —
# see vercel.json) is routed here; FastAPI's own routers (app/routers/*.py) handle the rest.
from app.main import app  # noqa: F401

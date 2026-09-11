"""Vercel serverless entry-point (repo root).

Adds the backend directory to sys.path so that `from app.main import app`
resolves correctly regardless of whether the Vercel Root Directory is set to
the repo root or to `backend/`.
"""
import sys
import os
import traceback

# Ensure the backend package is importable from the repo root
_backend_dir = os.path.join(os.path.dirname(__file__), "..", "backend")
if os.path.isdir(_backend_dir) and _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

try:
    from app.main import app  # noqa: F401 – Vercel picks up `app`
except Exception:
    from fastapi import FastAPI
    from fastapi.responses import PlainTextResponse

    app = FastAPI()
    _tb = traceback.format_exc()

    @app.get("/{path:path}")
    async def _startup_error(path: str = ""):
        return PlainTextResponse(
            f"Backend failed to start.\n\n{_tb}",
            status_code=500,
        )

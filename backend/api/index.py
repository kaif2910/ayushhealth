"""Vercel serverless entry-point.

Wraps the FastAPI import in a try/except so that, if something crashes at
import time, we still get a meaningful error page instead of a bare 500.
"""

import traceback

try:
    from app.main import app  # noqa: F401 – Vercel picks up `app`
except Exception:
    # Return the real traceback so we can debug on the live URL
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

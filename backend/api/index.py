from fastapi import FastAPI
from fastapi.responses import JSONResponse
import sys
import os

try:
    from app.main import app
except Exception as e:
    import traceback
    app = FastAPI()
    err = traceback.format_exc()
    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"])
    def catch_all(path: str):
        return JSONResponse(status_code=500, content={"error": err, "sys_path": sys.path, "cwd": os.getcwd()})

import traceback

try:
    from app.main import app
except Exception as e:
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    app = FastAPI()
    
    error_trace = traceback.format_exc()
    
    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"])
    def catch_all(path: str):
        return JSONResponse(status_code=500, content={"error": "Startup crash", "trace": error_trace})

import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models import Practitioner

JWT_SECRET = os.getenv("JWT_SECRET", "sih26047-demo-secret-change-for-production")
JWT_ALGORITHM = "HS256"
DEMO_PIN = os.getenv("DEMO_PRACTITIONER_PIN", "26047")
security = HTTPBearer(auto_error=False)


def create_access_token(practitioner: Practitioner) -> str:
    payload = {
        "sub": str(practitioner.id),
        "name": practitioner.name,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def authenticate_practitioner(db: Session, practitioner_id: int, pin: str) -> Practitioner | None:
    if pin != DEMO_PIN:
        return None
    return db.get(Practitioner, practitioner_id)


def current_practitioner(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> Practitioner:
    if not credentials:
        raise HTTPException(status_code=401, detail="Practitioner authentication required")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        practitioner_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    practitioner = db.get(Practitioner, practitioner_id)
    if not practitioner:
        raise HTTPException(status_code=401, detail="Practitioner not found")
    return practitioner

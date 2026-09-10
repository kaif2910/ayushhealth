import hashlib
import secrets
from datetime import datetime, timedelta
import jwt
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .database import get_db
from .models import Patient
from .auth import JWT_SECRET, JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 12 # 12 hours

security = HTTPBearer()

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()
    return f"{salt}:{h}"

def verify_password(password: str, stored: str) -> bool:
    if not stored: return False
    try:
        salt, h = stored.split(':')
        return hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex() == h
    except Exception:
        return False

def create_patient_token(patient: Patient) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"sub": f"patient:{patient.id}", "exp": expire}
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def current_patient(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        sub = payload.get("sub")
        if not sub or not sub.startswith("patient:"):
            raise HTTPException(status_code=401, detail="Invalid token")
        patient_id = int(sub.split(":")[1])
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise HTTPException(status_code=401, detail="Patient not found")
        return patient
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

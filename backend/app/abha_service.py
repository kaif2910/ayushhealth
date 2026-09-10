import random
from sqlalchemy.orm import Session
from .models import Patient

def generate_unique_abha(db: Session) -> str:
    for _ in range(10):
        parts = [
            "91",
            str(random.randint(1000, 9999)),
            str(random.randint(1000, 9999)),
            str(random.randint(1000, 9999))
        ]
        candidate = "-".join(parts)
        if not db.query(Patient).filter(Patient.abha_id == candidate).first():
            return candidate
    raise Exception("Could not generate a unique ABHA ID")

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from . import schemas, models
from .database import get_db
from .patient_auth import hash_password, verify_password, create_patient_token, current_patient
from .abha_service import generate_unique_abha
from .email_service import send_abha_email

router = APIRouter(prefix="/patient-auth", tags=["patient-auth"])

@router.post("/register", response_model=schemas.PatientTokenResponse)
def register(patient_in: schemas.PatientRegister, db: Session = Depends(get_db)):
    if db.query(models.Patient).filter(models.Patient.email == patient_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(models.Patient).filter(models.Patient.contact == patient_in.contact).first():
        raise HTTPException(status_code=400, detail="Mobile number already registered")
        
    db_patient = models.Patient(
        name=patient_in.name,
        email=patient_in.email,
        password_hash=hash_password(patient_in.password),
        age=patient_in.age,
        gender=patient_in.gender,
        contact=patient_in.contact,
        preferred_language=patient_in.preferred_language,
        date_of_birth=patient_in.date_of_birth,
        blood_group=patient_in.blood_group,
        address=patient_in.address,
        city=patient_in.city,
        emergency_contact=patient_in.emergency_contact,
        existing_diseases=patient_in.existing_diseases,
        chronic_conditions=patient_in.chronic_conditions,
        current_medicines=patient_in.current_medicines,
        previous_medical_history=patient_in.previous_medical_history,
        previous_surgeries=patient_in.previous_surgeries,
        family_medical_history=patient_in.family_medical_history,
        registered_at=datetime.utcnow(),
        role='patient'
    )
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    
    token = create_patient_token(db_patient)
    return {"access_token": token, "patient": db_patient}

@router.post("/login", response_model=schemas.PatientTokenResponse)
def login(login_req: schemas.PatientLoginRequest, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(
        (models.Patient.email == login_req.identifier) | 
        (models.Patient.abha_id == login_req.identifier)
    ).first()
    
    if not patient or not verify_password(login_req.password, patient.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
        
    token = create_patient_token(patient)
    return {"access_token": token, "patient": patient}

@router.get("/me", response_model=schemas.PatientProfileOut)
def get_me(patient: models.Patient = Depends(current_patient)):
    return patient

@router.post("/abha/generate", response_model=schemas.AbhaGenerateResponse)
def generate_abha(patient: models.Patient = Depends(current_patient), db: Session = Depends(get_db)):
    if patient.abha_id:
        return {
            "abha_number": patient.abha_id,
            "patient_name": patient.name,
            "email": patient.email,
            "registration_date": patient.registered_at.isoformat() if patient.registered_at else "",
            "email_sent": False,
            "email_note": "ABHA ID already exists."
        }
        
    abha = generate_unique_abha(db)
    patient.abha_id = abha
    
    # Save to the new AbhaRegistry table
    registry = models.AbhaRegistry(
        patient_id=patient.id,
        abha_number=abha,
        patient_name=patient.name
    )
    db.add(registry)
    db.commit()
    db.refresh(patient)
    
    email_sent = False
    email_note = None
    if patient.email:
        success, error = send_abha_email(patient.email, patient.name, abha)
        email_sent = success
        email_note = error
        
        log = models.EmailLog(
            patient_id=patient.id,
            email=patient.email,
            email_type="abha_generation",
            status="sent" if success else "failed",
            sent_at=datetime.utcnow() if success else None,
            error_message=error or ""
        )
        db.add(log)
        db.commit()
        
    return {
        "abha_number": abha,
        "patient_name": patient.name,
        "email": patient.email or "",
        "registration_date": patient.registered_at.isoformat() if patient.registered_at else "",
        "email_sent": email_sent,
        "email_note": email_note
    }

@router.post("/abha/resend-email")
def resend_abha_email(patient: models.Patient = Depends(current_patient), db: Session = Depends(get_db)):
    if not patient.abha_id:
        raise HTTPException(status_code=400, detail="Patient does not have an ABHA ID")
    if not patient.email:
        raise HTTPException(status_code=400, detail="Patient does not have an email registered")
        
    success, error = send_abha_email(patient.email, patient.name, patient.abha_id)
    
    log = models.EmailLog(
        patient_id=patient.id,
        email=patient.email,
        email_type="abha_resend",
        status="sent" if success else "failed",
        sent_at=datetime.utcnow() if success else None,
        error_message=error or ""
    )
    db.add(log)
    db.commit()
    
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {error}")
        
    return {"message": "Email sent successfully"}

from .email_service import send_password_reset_email
import random
import string

@router.post("/forgot-password")
def forgot_password(request: schemas.PasswordResetRequest, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.email == request.email).first()
    if not patient:
        # Return 200 even if not found to prevent email enumeration
        return {"message": "If that email is registered, a new password has been sent."}
        
    # Generate random 8 char password
    chars = string.ascii_letters + string.digits
    new_pass = ''.join(random.choice(chars) for _ in range(8))
    
    patient.password_hash = hash_password(new_pass)
    db.commit()
    
    success, error = send_password_reset_email(patient.email, patient.name, new_pass)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send email.")
        
    return {"message": "If that email is registered, a new password has been sent."}

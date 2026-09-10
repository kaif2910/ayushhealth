from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from . import schemas, models
from .database import get_db
from .auth import current_practitioner
from .patient_auth import current_patient

router = APIRouter(tags=["consultations"])

def log_audit(db: Session, user_id: int, user_type: str, action: str, target_patient_id: int = None):
    log = models.AuditLog(
        user_id=user_id,
        user_type=user_type,
        action=action,
        target_patient_id=target_patient_id,
        timestamp=datetime.utcnow()
    )
    db.add(log)
    db.commit()

@router.get("/doctor/search-patient", response_model=schemas.DoctorPatientSearchResult)
def search_patient(abha: str, practitioner = Depends(current_practitioner), db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.abha_id == abha).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    log_audit(db, practitioner.id, 'practitioner', 'search_patient', patient.id)
    
    case_sheets = db.query(models.CaseSheet).filter(models.CaseSheet.patient_id == patient.id).order_by(models.CaseSheet.created_at.desc()).all()
    consultations = db.query(models.Consultation).filter(models.Consultation.patient_id == patient.id).order_by(models.Consultation.created_at.desc()).all()
    prescriptions = db.query(models.Prescription).filter(models.Prescription.patient_id == patient.id).order_by(models.Prescription.created_at.desc()).all()
    
    for c in consultations:
        p = db.query(models.Practitioner).filter(models.Practitioner.id == c.practitioner_id).first()
        c.practitioner_name = p.name if p else "Unknown"
        
    for p in prescriptions:
        prac = db.query(models.Practitioner).filter(models.Practitioner.id == p.practitioner_id).first()
        p.practitioner_name = prac.name if prac else "Unknown"
        
    return {
        "patient": patient,
        "case_sheets": case_sheets,
        "consultations": consultations,
        "prescriptions": prescriptions
    }

@router.get("/doctor/patients/{patient_id}", response_model=schemas.DoctorPatientSearchResult)
def get_patient_profile(patient_id: int, practitioner = Depends(current_practitioner), db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    log_audit(db, practitioner.id, 'practitioner', 'view_patient', patient.id)
    
    case_sheets = db.query(models.CaseSheet).filter(models.CaseSheet.patient_id == patient.id).order_by(models.CaseSheet.created_at.desc()).all()
    consultations = db.query(models.Consultation).filter(models.Consultation.patient_id == patient.id).order_by(models.Consultation.created_at.desc()).all()
    prescriptions = db.query(models.Prescription).filter(models.Prescription.patient_id == patient.id).order_by(models.Prescription.created_at.desc()).all()
    
    for c in consultations:
        p = db.query(models.Practitioner).filter(models.Practitioner.id == c.practitioner_id).first()
        c.practitioner_name = p.name if p else "Unknown"
        
    for p in prescriptions:
        prac = db.query(models.Practitioner).filter(models.Practitioner.id == p.practitioner_id).first()
        p.practitioner_name = prac.name if prac else "Unknown"
        
    return {
        "patient": patient,
        "case_sheets": case_sheets,
        "consultations": consultations,
        "prescriptions": prescriptions
    }

@router.post("/consultations", response_model=schemas.ConsultationOut)
def create_consultation(c_in: schemas.ConsultationCreate, practitioner = Depends(current_practitioner), db: Session = Depends(get_db)):
    consultation = models.Consultation(
        patient_id=c_in.patient_id,
        practitioner_id=practitioner.id,
        consultation_date=datetime.utcnow(),
        symptoms=c_in.symptoms,
        diagnosis=c_in.diagnosis,
        doctor_notes=c_in.doctor_notes,
        follow_up_date=c_in.follow_up_date
    )
    db.add(consultation)
    db.commit()
    db.refresh(consultation)
    
    consultation.practitioner_name = practitioner.name
    log_audit(db, practitioner.id, 'practitioner', 'create_consultation', c_in.patient_id)
    return consultation

@router.get("/patients/{patient_id}/consultations", response_model=list[schemas.ConsultationOut])
def get_consultations(patient_id: int, db: Session = Depends(get_db)):
    # Can be called by patient or doctor, simplistic access for hackathon
    consultations = db.query(models.Consultation).filter(models.Consultation.patient_id == patient_id).order_by(models.Consultation.created_at.desc()).all()
    for c in consultations:
        p = db.query(models.Practitioner).filter(models.Practitioner.id == c.practitioner_id).first()
        c.practitioner_name = p.name if p else "Unknown"
    return consultations

@router.post("/prescriptions", response_model=schemas.PrescriptionOut)
def create_prescription(p_in: schemas.PrescriptionCreate, practitioner = Depends(current_practitioner), db: Session = Depends(get_db)):
    prescription = models.Prescription(
        consultation_id=p_in.consultation_id,
        patient_id=p_in.patient_id,
        practitioner_id=practitioner.id,
        medicine_name=p_in.medicine_name,
        dosage=p_in.dosage,
        frequency=p_in.frequency,
        duration=p_in.duration,
        instructions=p_in.instructions,
        start_date=p_in.start_date,
        end_date=p_in.end_date
    )
    db.add(prescription)
    db.commit()
    db.refresh(prescription)
    
    prescription.practitioner_name = practitioner.name
    log_audit(db, practitioner.id, 'practitioner', 'create_prescription', p_in.patient_id)
    
    # Send email notification
    patient = db.query(models.Patient).filter(models.Patient.id == p_in.patient_id).first()
    if patient and patient.email:
        from .email_service import send_prescription_email
        send_prescription_email(
            patient_email=patient.email,
            patient_name=patient.name,
            medicine_name=p_in.medicine_name,
            dosage=p_in.dosage,
            frequency=p_in.frequency,
            duration=p_in.duration,
            instructions=p_in.instructions
        )
        
    return prescription

from fastapi.responses import Response

@router.get("/prescriptions/{prescription_id}/pdf")
def get_prescription_pdf(prescription_id: int, db: Session = Depends(get_db)):
    prescription = db.query(models.Prescription).filter(models.Prescription.id == prescription_id).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
        
    patient = db.query(models.Patient).filter(models.Patient.id == prescription.patient_id).first()
    practitioner = db.query(models.Practitioner).filter(models.Practitioner.id == prescription.practitioner_id).first()
    
    from .pdf_service import generate_prescription_pdf
    pdf_bytes = generate_prescription_pdf(prescription, patient, practitioner)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=prescription_{prescription.id}.pdf"}
    )

@router.get("/patients/{patient_id}/prescriptions", response_model=list[schemas.PrescriptionOut])
def get_prescriptions(patient_id: int, db: Session = Depends(get_db)):
    prescriptions = db.query(models.Prescription).filter(models.Prescription.patient_id == patient_id).order_by(models.Prescription.created_at.desc()).all()
    for p in prescriptions:
        prac = db.query(models.Practitioner).filter(models.Practitioner.id == p.practitioner_id).first()
        p.practitioner_name = prac.name if prac else "Unknown"
    return prescriptions

@router.get("/patients/{patient_id}/timeline")
def get_patient_timeline(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    events = []
    if patient.registered_at:
        events.append({
            "type": "registration",
            "date": patient.registered_at.isoformat(),
            "title": "Patient Registered",
            "description": "Patient account created in the system."
        })
        
    cases = db.query(models.CaseSheet).filter(models.CaseSheet.patient_id == patient_id, models.CaseSheet.status != 'draft').all()
    for c in cases:
        events.append({
            "type": "case_sheet",
            "date": c.submitted_at.isoformat() if c.submitted_at else c.created_at.isoformat(),
            "title": "Intake Submitted",
            "description": c.chief_complaint_raw
        })
        
    consultations = db.query(models.Consultation).filter(models.Consultation.patient_id == patient_id).all()
    for c in consultations:
        prac = db.query(models.Practitioner).filter(models.Practitioner.id == c.practitioner_id).first()
        pname = prac.name if prac else "Doctor"
        events.append({
            "type": "consultation",
            "date": c.consultation_date.isoformat(),
            "title": f"Consultation with {pname}",
            "description": f"Diagnosis: {c.diagnosis}" if c.diagnosis else "Consultation recorded."
        })
        
    prescriptions = db.query(models.Prescription).filter(models.Prescription.patient_id == patient_id).all()
    for p in prescriptions:
        events.append({
            "type": "prescription",
            "date": p.created_at.isoformat(),
            "title": "Prescription Added",
            "description": f"{p.medicine_name} - {p.dosage}"
        })
        
    # Sort events by date descending
    events.sort(key=lambda x: x["date"], reverse=True)
    return events

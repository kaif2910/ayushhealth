from app.database import SessionLocal
from app.models import Patient, CaseSheet, Document, Consultation, Prescription, EmailLog, AuditLog
from sqlalchemy import select

db = SessionLocal()

fake_names = ['Aarav Nair', 'Savitri Rao', 'Ananya Deshmukh', 'Kabir Iyer']

patients = db.query(Patient).filter(Patient.name.in_(fake_names)).all()

for p in patients:
    # Delete related documents and cases
    cases = db.query(CaseSheet).filter(CaseSheet.patient_id == p.id).all()
    for c in cases:
        db.query(Document).filter(Document.case_sheet_id == c.id).delete()
    
    db.query(CaseSheet).filter(CaseSheet.patient_id == p.id).delete()
    db.query(Consultation).filter(Consultation.patient_id == p.id).delete()
    db.query(Prescription).filter(Prescription.patient_id == p.id).delete()
    db.query(EmailLog).filter(EmailLog.patient_id == p.id).delete()
    db.query(AuditLog).filter(AuditLog.target_patient_id == p.id).delete()

    db.delete(p)

db.commit()
print("Fake records removed successfully!")

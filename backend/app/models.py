from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    gender: Mapped[str] = mapped_column(String(40), nullable=False)
    contact: Mapped[str] = mapped_column(String(80), nullable=False)
    abha_id: Mapped[str | None] = mapped_column(String(20), nullable=True, unique=True)
    preferred_language: Mapped[str] = mapped_column(String(40), default="English")
    
    email: Mapped[str | None] = mapped_column(String(160), nullable=True, unique=True)
    password_hash: Mapped[str | None] = mapped_column(String(256), nullable=True)
    date_of_birth: Mapped[str | None] = mapped_column(String(20), nullable=True)
    blood_group: Mapped[str | None] = mapped_column(String(10), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True, default='')
    city: Mapped[str | None] = mapped_column(String(100), nullable=True, default='')
    emergency_contact: Mapped[str | None] = mapped_column(String(80), nullable=True, default='')
    existing_diseases: Mapped[str | None] = mapped_column(Text, nullable=True, default='')
    chronic_conditions: Mapped[str | None] = mapped_column(Text, nullable=True, default='')
    current_medicines: Mapped[str | None] = mapped_column(Text, nullable=True, default='')
    previous_medical_history: Mapped[str | None] = mapped_column(Text, nullable=True, default='')
    previous_surgeries: Mapped[str | None] = mapped_column(Text, nullable=True, default='')
    family_medical_history: Mapped[str | None] = mapped_column(Text, nullable=True, default='')
    role: Mapped[str] = mapped_column(String(20), default='patient')
    registered_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    case_sheets: Mapped[list["CaseSheet"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    consultations: Mapped[list["Consultation"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    prescriptions: Mapped[list["Prescription"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )


class CaseSheet(Base):
    __tablename__ = "case_sheets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    chief_complaint_raw: Mapped[str] = mapped_column(Text, default="")
    chief_complaint_structured: Mapped[dict] = mapped_column(JSON, default=dict)
    duration: Mapped[str] = mapped_column(String(120), default="")
    severity: Mapped[str] = mapped_column(String(20), default="moderate")
    history: Mapped[dict] = mapped_column(JSON, default=dict)
    lifestyle: Mapped[dict] = mapped_column(JSON, default=dict)
    prakriti_assessment: Mapped[dict] = mapped_column(JSON, default=dict)
    nadi_notes: Mapped[str] = mapped_column(Text, default="")
    tongue_notes: Mapped[str] = mapped_column(Text, default="")
    ai_summary: Mapped[str] = mapped_column(Text, default="")
    fhir_export: Mapped[dict] = mapped_column(JSON, default=dict)

    # Operational MVP fields used for autosave/resume and practitioner queue.
    status: Mapped[str] = mapped_column(String(24), default="draft", index=True)
    current_step: Mapped[int] = mapped_column(Integer, default=1)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    patient: Mapped[Patient] = relationship(back_populates="case_sheets")
    documents: Mapped[list["Document"]] = relationship(
        back_populates="case_sheet", cascade="all, delete-orphan"
    )


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    case_sheet_id: Mapped[int] = mapped_column(
        ForeignKey("case_sheets.id"), nullable=False, index=True
    )
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    ocr_text: Mapped[str] = mapped_column(Text, default="")
    document_type: Mapped[str] = mapped_column(String(60), default="other")

    case_sheet: Mapped[CaseSheet] = relationship(back_populates="documents")


class Practitioner(Base):
    __tablename__ = "practitioners"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    specialization: Mapped[str] = mapped_column(String(160), nullable=False)
    clinic_id: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    
    consultations: Mapped[list["Consultation"]] = relationship(
        back_populates="practitioner", cascade="all, delete-orphan"
    )
    prescriptions: Mapped[list["Prescription"]] = relationship(
        back_populates="practitioner", cascade="all, delete-orphan"
    )


class Consultation(Base):
    __tablename__ = "consultations"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False, index=True)
    practitioner_id: Mapped[int] = mapped_column(ForeignKey("practitioners.id"), nullable=False, index=True)
    consultation_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    symptoms: Mapped[str] = mapped_column(Text, default="")
    diagnosis: Mapped[str] = mapped_column(Text, default="")
    doctor_notes: Mapped[str] = mapped_column(Text, default="")
    follow_up_date: Mapped[str] = mapped_column(String(40), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    patient: Mapped[Patient] = relationship(back_populates="consultations")
    practitioner: Mapped[Practitioner] = relationship(back_populates="consultations")
    prescriptions: Mapped[list["Prescription"]] = relationship(
        back_populates="consultation", cascade="all, delete-orphan"
    )

class Prescription(Base):
    __tablename__ = "prescriptions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    consultation_id: Mapped[int] = mapped_column(ForeignKey("consultations.id"), nullable=False, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False, index=True)
    practitioner_id: Mapped[int] = mapped_column(ForeignKey("practitioners.id"), nullable=False, index=True)
    medicine_name: Mapped[str] = mapped_column(String(200), nullable=False)
    dosage: Mapped[str] = mapped_column(String(100), default="")
    frequency: Mapped[str] = mapped_column(String(100), default="")
    duration: Mapped[str] = mapped_column(String(100), default="")
    instructions: Mapped[str] = mapped_column(Text, default="")
    start_date: Mapped[str] = mapped_column(String(40), default="")
    end_date: Mapped[str] = mapped_column(String(40), default="")
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    patient: Mapped[Patient] = relationship(back_populates="prescriptions")
    practitioner: Mapped[Practitioner] = relationship(back_populates="prescriptions")
    consultation: Mapped[Consultation] = relationship(back_populates="prescriptions")

class EmailLog(Base):
    __tablename__ = "email_logs"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(160), nullable=False)
    email_type: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    error_message: Mapped[str] = mapped_column(Text, default="")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False)
    user_type: Mapped[str] = mapped_column(String(20), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    target_patient_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    ip_address: Mapped[str] = mapped_column(String(60), default="")

class AbhaRegistry(Base):
    __tablename__ = 'abha_registry'
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey('patients.id'), nullable=False)
    abha_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    patient_name: Mapped[str] = mapped_column(String(160), nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

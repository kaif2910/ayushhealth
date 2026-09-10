from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class PatientCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    age: int = Field(ge=0, le=120)
    gender: str = Field(min_length=1, max_length=40)
    contact: str = Field(min_length=5, max_length=80)
    abha_id: str | None = None
    preferred_language: str = "English"


class PatientOut(PatientCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    case_sheet_id: int
    file_url: str
    ocr_text: str
    document_type: str
    extracted_metadata: dict[str, Any] | None = None
    processing_note: str | None = None


class CaseSheetCreate(BaseModel):
    patient_id: int


class CaseSheetPatch(BaseModel):
    chief_complaint_raw: str | None = None
    chief_complaint_structured: dict[str, Any] | None = None
    duration: str | None = None
    severity: Literal["mild", "moderate", "severe"] | None = None
    history: dict[str, Any] | None = None
    lifestyle: dict[str, Any] | None = None
    prakriti_assessment: dict[str, Any] | None = None
    nadi_notes: str | None = None
    tongue_notes: str | None = None
    ai_summary: str | None = None
    fhir_export: dict[str, Any] | None = None
    status: Literal["draft", "submitted", "reviewed"] | None = None
    current_step: int | None = Field(default=None, ge=1, le=6)


class CaseSheetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    patient_id: int
    created_at: datetime
    chief_complaint_raw: str
    chief_complaint_structured: dict[str, Any]
    duration: str
    severity: str
    history: dict[str, Any]
    lifestyle: dict[str, Any]
    prakriti_assessment: dict[str, Any]
    nadi_notes: str
    tongue_notes: str
    ai_summary: str
    fhir_export: dict[str, Any]
    status: str
    current_step: int
    submitted_at: datetime | None
    patient: PatientOut | None = None
    documents: list[DocumentOut] = Field(default_factory=list)


class AIStructureResult(BaseModel):
    chief_complaint: str
    duration: str
    severity: Literal["mild", "moderate", "severe"]
    associated_symptoms: list[str]
    possible_red_flags: list[str]


class ABHAVerifyRequest(BaseModel):
    abha_id: str
    patient_name: str | None = None


class ABHAVerifyResponse(BaseModel):
    verified: bool
    name: str
    abha_address: str


class PractitionerLogin(BaseModel):
    practitioner_id: int = 1
    pin: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    practitioner: dict[str, Any]


class QueueItem(BaseModel):
    case_sheet_id: int
    patient_id: int
    patient_name: str
    age: int
    chief_complaint: str
    submitted_at: datetime | None
    dominant_dosha: str | None = None

# ---- New schemas below ----

class PatientRegister(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    email: str
    password: str = Field(min_length=6)
    age: int = Field(ge=0, le=120)
    gender: str
    contact: str = Field(min_length=5, max_length=80)
    preferred_language: str = 'English'
    date_of_birth: str | None = None
    blood_group: str | None = None
    address: str = ''
    city: str = ''
    emergency_contact: str = ''
    existing_diseases: str = ''
    chronic_conditions: str = ''
    current_medicines: str = ''
    previous_medical_history: str = ''
    previous_surgeries: str = ''
    family_medical_history: str = ''

class PatientLoginRequest(BaseModel):
    identifier: str
    password: str

class PatientProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str | None = None
    age: int
    gender: str
    contact: str
    abha_id: str | None = None
    preferred_language: str
    date_of_birth: str | None = None
    blood_group: str | None = None
    address: str | None = None
    city: str | None = None
    emergency_contact: str | None = None
    existing_diseases: str | None = None
    chronic_conditions: str | None = None
    current_medicines: str | None = None
    previous_medical_history: str | None = None
    previous_surgeries: str | None = None
    family_medical_history: str | None = None
    registered_at: datetime | None = None

class PatientTokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    patient: PatientProfileOut

class AbhaGenerateResponse(BaseModel):
    abha_number: str
    patient_name: str
    email: str
    registration_date: str
    email_sent: bool
    email_note: str | None = None

class ConsultationCreate(BaseModel):
    patient_id: int
    symptoms: str = ''
    diagnosis: str = ''
    doctor_notes: str = ''
    follow_up_date: str = ''

class ConsultationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    patient_id: int
    practitioner_id: int
    consultation_date: datetime
    symptoms: str
    diagnosis: str
    doctor_notes: str
    follow_up_date: str
    created_at: datetime
    practitioner_name: str | None = None

class PrescriptionCreate(BaseModel):
    consultation_id: int
    patient_id: int
    medicine_name: str
    dosage: str = ''
    frequency: str = ''
    duration: str = ''
    instructions: str = ''
    start_date: str = ''
    end_date: str = ''

class PrescriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    consultation_id: int
    patient_id: int
    practitioner_id: int
    medicine_name: str
    dosage: str
    frequency: str
    duration: str
    instructions: str
    start_date: str
    end_date: str
    status: str
    created_at: datetime
    practitioner_name: str | None = None

class DoctorPatientSearchResult(BaseModel):
    patient: PatientProfileOut
    case_sheets: list[CaseSheetOut] = Field(default_factory=list)
    consultations: list[ConsultationOut] = Field(default_factory=list)
    prescriptions: list[PrescriptionOut] = Field(default_factory=list)

class PasswordResetRequest(BaseModel):
    email: str

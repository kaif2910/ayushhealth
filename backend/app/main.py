import asyncio
import re
from dotenv import load_dotenv
load_dotenv()
import shutil
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, selectinload

from .ai_service import classify_ocr_text, generate_case_summary, structure_case_sheet
from .auth import authenticate_practitioner, create_access_token, current_practitioner
from .database import get_db
from .fhir import build_fhir_bundle
from .models import CaseSheet, Document, Patient, Practitioner
from .ocr_service import extract_ocr_text
from .schemas import (
    ABHAVerifyRequest,
    ABHAVerifyResponse,
    CaseSheetCreate,
    CaseSheetOut,
    CaseSheetPatch,
    PatientCreate,
    PatientOut,
    PractitionerLogin,
    QueueItem,
    TokenResponse,
)
from .speech_service import transcribe_audio
from .patient_routes import router as patient_router
from .consultation_routes import router as consultation_router

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="AYUSH Patient Case-Taking Software API",
    version="1.0.0-demo",
    description="SIH26047 hackathon MVP. Synthetic/demo data only; AI features are decision-support, not diagnosis.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(patient_router)
app.include_router(consultation_router)


@app.get("/")
def root():
    return {
        "name": "AYUSH Patient Case-Taking Software",
        "problem_statement": "SIH26047",
        "status": "ok",
        "disclaimer": "Hackathon demo using synthetic data; AI is decision-support only.",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/auth/login", response_model=TokenResponse)
def login(payload: PractitionerLogin, db: Session = Depends(get_db)):
    practitioner = authenticate_practitioner(db, payload.practitioner_id, payload.pin)
    if not practitioner:
        raise HTTPException(status_code=401, detail="Invalid demo practitioner credentials")
    return TokenResponse(
        access_token=create_access_token(practitioner),
        practitioner={
            "id": practitioner.id,
            "name": practitioner.name,
            "specialization": practitioner.specialization,
            "clinic_id": practitioner.clinic_id,
        },
    )


@app.get("/auth/me")
def me(practitioner: Practitioner = Depends(current_practitioner)):
    return {
        "id": practitioner.id,
        "name": practitioner.name,
        "specialization": practitioner.specialization,
        "clinic_id": practitioner.clinic_id,
    }


@app.post("/patients", response_model=PatientOut, status_code=201)
def create_patient(payload: PatientCreate, db: Session = Depends(get_db)):
    if payload.abha_id:
        if not re.fullmatch(r"\d{2}-\d{4}-\d{4}-\d{4}", payload.abha_id):
            raise HTTPException(status_code=422, detail="ABHA ID must match XX-XXXX-XXXX-XXXX")
        
        # Check if patient with this ABHA ID already exists
        existing_patient = db.query(Patient).filter(Patient.abha_id == payload.abha_id).first()
        if existing_patient:
            return existing_patient
            
    patient = Patient(**payload.model_dump())
    db.add(patient)
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=f"Could not create patient: {exc}")
    db.refresh(patient)
    return patient


@app.get("/patients/{patient_id}", response_model=PatientOut)
def get_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@app.get("/patients/{patient_id}/case-sheets", response_model=list[CaseSheetOut])
def patient_case_sheets(
    patient_id: int,
    _practitioner: Practitioner = Depends(current_practitioner),
    db: Session = Depends(get_db),
):
    stmt = (
        select(CaseSheet)
        .options(selectinload(CaseSheet.patient), selectinload(CaseSheet.documents))
        .where(CaseSheet.patient_id == patient_id)
        .order_by(desc(CaseSheet.created_at))
    )
    return list(db.scalars(stmt).all())


@app.post("/case-sheets", response_model=CaseSheetOut, status_code=201)
def create_case_sheet(payload: CaseSheetCreate, db: Session = Depends(get_db)):
    if not db.get(Patient, payload.patient_id):
        raise HTTPException(status_code=404, detail="Patient not found")
    case = CaseSheet(patient_id=payload.patient_id)
    db.add(case)
    db.commit()
    db.refresh(case)
    stmt = (
        select(CaseSheet)
        .options(selectinload(CaseSheet.patient), selectinload(CaseSheet.documents))
        .where(CaseSheet.id == case.id)
    )
    return db.scalar(stmt)


@app.get("/case-sheets/{case_id}", response_model=CaseSheetOut)
def get_case_sheet(case_id: int, db: Session = Depends(get_db)):
    stmt = (
        select(CaseSheet)
        .options(selectinload(CaseSheet.patient), selectinload(CaseSheet.documents))
        .where(CaseSheet.id == case_id)
    )
    case = db.scalar(stmt)
    if not case:
        raise HTTPException(status_code=404, detail="Case sheet not found")
    return case


@app.patch("/case-sheets/{case_id}", response_model=CaseSheetOut)
def patch_case_sheet(case_id: int, payload: CaseSheetPatch, db: Session = Depends(get_db)):
    case = db.get(CaseSheet, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case sheet not found")
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(case, field, value)
    if updates.get("status") == "submitted" and case.submitted_at is None:
        case.submitted_at = datetime.utcnow()
    db.add(case)
    db.commit()
    stmt = (
        select(CaseSheet)
        .options(selectinload(CaseSheet.patient), selectinload(CaseSheet.documents))
        .where(CaseSheet.id == case.id)
    )
    return db.scalar(stmt)


@app.post("/abha/verify", response_model=ABHAVerifyResponse)
async def verify_abha(payload: ABHAVerifyRequest, db: Session = Depends(get_db)):
    if not re.fullmatch(r"\d{2}-\d{4}-\d{4}-\d{4}", payload.abha_id):
        raise HTTPException(status_code=422, detail="ABHA ID must match XX-XXXX-XXXX-XXXX")
    await asyncio.sleep(0.3)
    matched = db.scalar(select(Patient).where(Patient.abha_id == payload.abha_id))
    name = matched.name if matched else (payload.patient_name.strip() if payload.patient_name else "AYUSH Demo Patient")
    slug = re.sub(r"[^a-z0-9]+", ".", name.lower()).strip(".") or "patient"
    return ABHAVerifyResponse(verified=True, name=name, abha_address=f"{slug}@abdm")


@app.post("/case-sheets/{case_id}/ai-structure")
def ai_structure(case_id: int, db: Session = Depends(get_db)):
    case = db.get(CaseSheet, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case sheet not found")
    return structure_case_sheet(db, case)


@app.post("/case-sheets/{case_id}/transcribe")
async def transcribe(case_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not db.get(CaseSheet, case_id):
        raise HTTPException(status_code=404, detail="Case sheet not found")
    suffix = Path(file.filename or "audio.webm").suffix or ".webm"
    tmp_path = UPLOAD_DIR / f"voice-{case_id}-{uuid.uuid4().hex}{suffix}"
    with tmp_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    text, note = transcribe_audio(tmp_path)
    try:
        tmp_path.unlink(missing_ok=True)
    except OSError:
        pass
    return {"text": text, "processing_note": note, "ai_generated": False}


@app.post("/case-sheets/{case_id}/documents", response_model=dict)
async def upload_document(case_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    case = db.get(CaseSheet, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case sheet not found")
    original = Path(file.filename or "document").name
    suffix = Path(original).suffix.lower()
    if suffix not in {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff"}:
        raise HTTPException(status_code=415, detail="Only PDF and image documents are supported")
    safe_name = f"case-{case_id}-{uuid.uuid4().hex[:10]}{suffix}"
    destination = UPLOAD_DIR / safe_name
    with destination.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    ocr_text, ocr_note = extract_ocr_text(destination)
    classification = classify_ocr_text(ocr_text) if ocr_text else {
        "document_type": "other",
        "medications": [],
        "dates": [],
        "ai_generated": False,
        "provider": None,
        "processing_note": ocr_note,
    }
    note = ocr_note or classification.get("processing_note")
    doc = Document(
        case_sheet_id=case_id,
        file_url=f"/uploads/{safe_name}",
        ocr_text=ocr_text,
        document_type=classification["document_type"],
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return {
        "id": doc.id,
        "case_sheet_id": doc.case_sheet_id,
        "file_url": doc.file_url,
        "ocr_text": doc.ocr_text,
        "document_type": doc.document_type,
        "extracted_metadata": {
            "medications": classification.get("medications", []),
            "dates": classification.get("dates", []),
        },
        "ai_generated": classification.get("ai_generated", False),
        "processing_note": note,
    }


@app.get("/case-sheets/{case_id}/summary")
def case_summary(
    case_id: int,
    _practitioner: Practitioner = Depends(current_practitioner),
    db: Session = Depends(get_db),
):
    stmt = (
        select(CaseSheet)
        .options(selectinload(CaseSheet.patient), selectinload(CaseSheet.documents))
        .where(CaseSheet.id == case_id)
    )
    case = db.scalar(stmt)
    if not case:
        raise HTTPException(status_code=404, detail="Case sheet not found")
    # Seeded cases already contain summaries. Avoid repeated LLM calls in a live demo.
    if case.ai_summary:
        fallback_prefix = "[MANUAL REVIEW FALLBACK]\n"
        is_fallback = case.ai_summary.startswith(fallback_prefix)
        return {
            "summary": case.ai_summary.removeprefix(fallback_prefix),
            "ai_generated": not is_fallback,
            "provider": None if is_fallback else "seeded-or-previously-generated",
            "label": "AI-generated summary — verify before use" if not is_fallback else "Processing unavailable — review intake manually",
            "processing_note": "LLM was unavailable when this summary was prepared; deterministic intake highlights are shown." if is_fallback else None,
        }
    result = generate_case_summary(db, case)
    result["label"] = "AI-generated summary — verify before use" if result.get("ai_generated") else "Processing unavailable — review intake manually"
    return result


@app.get("/case-sheets/{case_id}/fhir")
def case_fhir(
    case_id: int,
    _practitioner: Practitioner = Depends(current_practitioner),
    db: Session = Depends(get_db),
):
    stmt = select(CaseSheet).options(selectinload(CaseSheet.patient)).where(CaseSheet.id == case_id)
    case = db.scalar(stmt)
    if not case:
        raise HTTPException(status_code=404, detail="Case sheet not found")
    bundle = build_fhir_bundle(case)
    case.fhir_export = bundle
    db.add(case)
    db.commit()
    return bundle


@app.get("/practitioners/{practitioner_id}/queue", response_model=list[QueueItem])
def practitioner_queue(
    practitioner_id: int,
    practitioner: Practitioner = Depends(current_practitioner),
    db: Session = Depends(get_db),
):
    if practitioner.id != practitioner_id:
        raise HTTPException(status_code=403, detail="Cannot view another practitioner's queue in this demo")
    stmt = (
        select(CaseSheet)
        .options(selectinload(CaseSheet.patient))
        .where(CaseSheet.status == "submitted")
        .order_by(desc(CaseSheet.submitted_at), desc(CaseSheet.created_at))
    )
    cases = db.scalars(stmt).all()
    return [
        QueueItem(
            case_sheet_id=case.id,
            patient_id=case.patient_id,
            patient_name=case.patient.name,
            age=case.patient.age,
            chief_complaint=(case.chief_complaint_structured or {}).get(
                "chief_complaint", case.chief_complaint_raw
            ),
            submitted_at=case.submitted_at or case.created_at,
            dominant_dosha=(case.prakriti_assessment or {}).get("dominant_dosha"),
        )
        for case in cases
    ]

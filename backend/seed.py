"""Seed fictional demo data for SIH26047.

Run inside the backend container:
    python seed.py

The script is idempotent: it clears existing demo records first.
All names, identifiers, contact details, complaints, and documents are fictional.
"""
from datetime import datetime, timedelta
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload

from app.ai_service import generate_case_summary, structure_case_sheet
from app.database import Base, SessionLocal, engine
from app.fhir import build_fhir_bundle
from app.models import CaseSheet, Document, Patient, Practitioner
from app.ocr_service import extract_ocr_text

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def make_prescription_image(path: Path) -> None:
    image = Image.new("RGB", (1200, 800), "white")
    draw = ImageDraw.Draw(image)
    try:
        title_font = ImageFont.truetype("DejaVuSans-Bold.ttf", 40)
        body_font = ImageFont.truetype("DejaVuSans.ttf", 30)
    except OSError:
        title_font = body_font = ImageFont.load_default()
    lines = [
        ("FICTIONAL DEMO PRESCRIPTION", title_font),
        ("Patient: Ananya Deshmukh (Synthetic Persona)", body_font),
        ("Date: 04/09/2026", body_font),
        ("Complaint: itchy dry skin patches", body_font),
        ("Rx", title_font),
        ("1. DemoCalm lotion - apply externally twice daily", body_font),
        ("2. DemoCet 5 mg - one tablet at night for 5 days", body_font),
        ("For SIH26047 demonstration only - NOT A REAL PRESCRIPTION", body_font),
    ]
    y = 55
    for text, font in lines:
        draw.text((60, y), text, fill="black", font=font)
        y += 80 if font == title_font else 65
    image.save(path)


def add_case(
    db,
    patient: Patient,
    *,
    days_ago: int,
    complaint: str,
    duration: str,
    severity: str,
    history: dict,
    lifestyle: dict,
    prakriti: dict,
    nadi: str = "",
    tongue: str = "",
) -> CaseSheet:
    created = datetime.utcnow() - timedelta(days=days_ago)
    case = CaseSheet(
        patient_id=patient.id,
        created_at=created,
        submitted_at=created + timedelta(minutes=12),
        chief_complaint_raw=complaint,
        duration=duration,
        severity=severity,
        history=history,
        lifestyle=lifestyle,
        prakriti_assessment=prakriti,
        nadi_notes=nadi,
        tongue_notes=tongue,
        status="submitted",
        current_step=6,
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    return case


def hydrate_ai_and_fhir(db, case_id: int) -> None:
    stmt = (
        select(CaseSheet)
        .options(selectinload(CaseSheet.patient), selectinload(CaseSheet.documents))
        .where(CaseSheet.id == case_id)
    )
    case = db.scalar(stmt)
    structure_case_sheet(db, case)
    # Refresh relationships after commit in the AI helper.
    case = db.scalar(stmt.execution_options(populate_existing=True))
    generate_case_summary(db, case)
    case = db.scalar(stmt.execution_options(populate_existing=True))
    case.fhir_export = build_fhir_bundle(case)
    db.add(case)
    db.commit()


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        db.execute(delete(Document))
        db.execute(delete(CaseSheet))
        db.execute(delete(Patient))
        db.execute(delete(Practitioner))
        db.commit()

        practitioner = Practitioner(
            id=1,
            name="Dr. Meera Kulkarni",
            specialization="Ayurveda — Kayachikitsa",
            clinic_id="AYUSH-DEMO-01",
        )
        db.add(practitioner)
        db.commit()

        # Persona A: young adult, digestive complaint, Pitta dominant.
        aarav = Patient(
            name="Aarav Nair",
            age=24,
            gender="male",
            contact="9000000101",
            abha_id="91-1001-2001-3001",
            preferred_language="English",
        )
        db.add(aarav)
        db.commit(); db.refresh(aarav)
        c1 = add_case(
            db,
            aarav,
            days_ago=0,
            complaint="Burning sensation after meals with sour belching and occasional upper-abdominal discomfort, worse after spicy food.",
            duration="3 weeks",
            severity="moderate",
            history={
                "past_illness": "No major past illness reported",
                "allergies": "No known allergies reported",
                "current_medications": "Occasional over-the-counter antacid, name not recalled",
                "family_history": "Father reports recurring acidity",
                "voice_input_used": False,
            },
            lifestyle={
                "diet": "Frequent spicy food; irregular lunch timing",
                "sleep": "6-7 hours",
                "stress": "Moderate exam-related stress",
                "habits": "2 cups tea daily; no tobacco reported",
            },
            prakriti={"vata_score": 2, "pitta_score": 8, "kapha_score": 2, "dominant_dosha": "Pitta"},
            nadi="Demo intake note: pulse assessment to be confirmed by practitioner.",
            tongue="Patient reports occasional coating in the morning; practitioner to verify.",
        )

        # Persona B: elderly joint pain, marked as voice-input sourced, Vata dominant.
        savitri = Patient(
            name="Savitri Rao",
            age=68,
            gender="female",
            contact="9000000102",
            abha_id="91-1002-2002-3002",
            preferred_language="Hindi",
        )
        db.add(savitri)
        db.commit(); db.refresh(savitri)
        c2 = add_case(
            db,
            savitri,
            days_ago=0,
            complaint="My knees feel stiff and painful, especially in the morning and when I get up after sitting for a long time. Walking slowly helps a little.",
            duration="about 8 months",
            severity="moderate",
            history={
                "past_illness": "History of age-related blood pressure monitoring; no recent hospitalisation reported",
                "allergies": "No known medicine allergy reported",
                "current_medications": "Patient will show current medicine strip to doctor",
                "family_history": "Not known",
                "voice_input_used": True,
            },
            lifestyle={
                "diet": "Home-cooked vegetarian meals",
                "sleep": "Light sleep with 1-2 awakenings",
                "stress": "Low",
                "habits": "Short morning walk when comfortable",
            },
            prakriti={"vata_score": 9, "pitta_score": 2, "kapha_score": 1, "dominant_dosha": "Vata"},
            nadi="Not assessed during self-intake.",
            tongue="Not assessed during self-intake.",
        )

        # Persona C: skin condition + uploaded synthetic prescription image.
        ananya = Patient(
            name="Ananya Deshmukh",
            age=31,
            gender="female",
            contact="9000000103",
            abha_id=None,
            preferred_language="English",
        )
        db.add(ananya)
        db.commit(); db.refresh(ananya)
        c3 = add_case(
            db,
            ananya,
            days_ago=1,
            complaint="Dry itchy reddish patches on both forearms that flare after heat and sweating. No breathing difficulty or facial swelling reported.",
            duration="6 weeks",
            severity="mild",
            history={
                "past_illness": "Seasonal skin sensitivity reported",
                "allergies": "No confirmed drug allergy",
                "current_medications": "Using a lotion and short antihistamine course from a prior consultation; uploaded document attached",
                "family_history": "Mother has sensitive skin",
                "voice_input_used": False,
            },
            lifestyle={
                "diet": "Mixed diet",
                "sleep": "7 hours",
                "stress": "Moderate work stress",
                "habits": "Exercises 3 times a week",
            },
            prakriti={"vata_score": 3, "pitta_score": 6, "kapha_score": 3, "dominant_dosha": "Pitta"},
            tongue="Not assessed during self-intake.",
        )
        prescription_path = UPLOAD_DIR / "seed-fictional-prescription-ananya.png"
        make_prescription_image(prescription_path)
        ocr_text, note = extract_ocr_text(prescription_path)
        if not ocr_text:
            ocr_text = (
                "FICTIONAL DEMO PRESCRIPTION\nPatient: Ananya Deshmukh\nDate: 04/09/2026\n"
                "Rx: DemoCalm lotion twice daily; DemoCet 5 mg at night for 5 days.\n"
                "NOT A REAL PRESCRIPTION"
            )
        db.add(
            Document(
                case_sheet_id=c3.id,
                file_url="/uploads/seed-fictional-prescription-ananya.png",
                ocr_text=ocr_text + (f"\n[OCR note: {note}]" if note else ""),
                document_type="prescription",
            )
        )
        db.commit()

        # Persona D: repeat patient with two visits for multi-visit history.
        kabir = Patient(
            name="Kabir Iyer",
            age=42,
            gender="male",
            contact="9000000104",
            abha_id="91-1004-2004-3004",
            preferred_language="English",
        )
        db.add(kabir)
        db.commit(); db.refresh(kabir)
        c4_old = add_case(
            db,
            kabir,
            days_ago=75,
            complaint="Intermittent difficulty falling asleep during a period of increased work pressure, with restlessness at night.",
            duration="1 month",
            severity="moderate",
            history={
                "past_illness": "No major past illness reported",
                "allergies": "No known allergies reported",
                "current_medications": "None reported",
                "family_history": "No relevant family history reported",
                "voice_input_used": False,
            },
            lifestyle={
                "diet": "Late dinners on workdays",
                "sleep": "5-6 hours with delayed sleep onset",
                "stress": "High at work",
                "habits": "3 cups coffee/tea daily",
            },
            prakriti={"vata_score": 7, "pitta_score": 3, "kapha_score": 2, "dominant_dosha": "Vata"},
        )
        c4_new = add_case(
            db,
            kabir,
            days_ago=3,
            complaint="Sleep has improved compared with the previous visit, but I still wake early on stressful workdays and feel tired the next morning.",
            duration="2 weeks",
            severity="mild",
            history={
                "past_illness": "Prior intake for sleep difficulty 75 days ago",
                "allergies": "No known allergies reported",
                "current_medications": "None reported",
                "family_history": "No relevant family history reported",
                "voice_input_used": False,
            },
            lifestyle={
                "diet": "Earlier dinner most days",
                "sleep": "6-7 hours; occasional early waking",
                "stress": "Moderate",
                "habits": "Reduced evening caffeine",
            },
            prakriti={"vata_score": 6, "pitta_score": 3, "kapha_score": 3, "dominant_dosha": "Vata"},
        )

        for case in [c1, c2, c3, c4_old, c4_new]:
            hydrate_ai_and_fhir(db, case.id)

        print("Seed complete: 4 fictional patient personas, 5 submitted case sheets, 1 synthetic prescription image.")
        print("Demo practitioner login: practitioner_id=1, PIN=26047")
    finally:
        db.close()


if __name__ == "__main__":
    main()

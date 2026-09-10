import json
import re
from typing import Any

from pydantic import ValidationError
from sqlalchemy.orm import Session

from . import llm_client
from .models import CaseSheet
from .schemas import AIStructureResult


def _extract_json(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object found")
    return json.loads(cleaned[start : end + 1])


def _fallback_structure(case: CaseSheet) -> AIStructureResult:
    history_values = [str(v).strip() for v in (case.history or {}).values() if str(v).strip()]
    raw = case.chief_complaint_raw.strip() or "Chief complaint not provided"
    associated = []
    if history_values:
        associated = ["Relevant history recorded for manual review"]
    return AIStructureResult(
        chief_complaint=raw,
        duration=case.duration or "Not specified",
        severity=case.severity if case.severity in {"mild", "moderate", "severe"} else "moderate",
        associated_symptoms=associated,
        possible_red_flags=[],
    )


def structure_case_sheet(db: Session, case: CaseSheet) -> dict[str, Any]:
    history_text = json.dumps(case.history or {}, ensure_ascii=False)
    prompt = f"""
Convert the following patient-provided intake into structured clinical intake data.
This is decision-support only. Do NOT diagnose, recommend treatment, or invent facts.
Return ONLY valid JSON, with no markdown and no prose outside the JSON.

Required schema exactly:
{{
  "chief_complaint": "string",
  "duration": "string",
  "severity": "mild|moderate|severe",
  "associated_symptoms": ["string"],
  "possible_red_flags": ["string"]
}}

Patient chief complaint: {case.chief_complaint_raw}
Patient-provided duration: {case.duration}
Patient-selected severity: {case.severity}
Patient-provided history JSON: {history_text}

For red flags, only list items explicitly supported by the supplied text. If none are explicit, return [].
""".strip()

    last_error = None
    for attempt in range(2):
        try:
            suffix = "\nPrevious response was invalid JSON. Return only schema-valid JSON." if attempt else ""
            response = llm_client.generate_text(prompt + suffix)
            parsed = _extract_json(response.text)
            validated = AIStructureResult.model_validate(parsed)
            case.chief_complaint_structured = validated.model_dump()
            db.add(case)
            db.commit()
            db.refresh(case)
            return {
                "structured": validated.model_dump(),
                "ai_generated": True,
                "provider": response.provider,
                "processing_note": None,
            }
        except (llm_client.LLMUnavailable, ValueError, json.JSONDecodeError, ValidationError) as exc:
            last_error = str(exc)
            if isinstance(exc, llm_client.LLMUnavailable):
                break

    fallback = _fallback_structure(case)
    case.chief_complaint_structured = fallback.model_dump()
    db.add(case)
    db.commit()
    db.refresh(case)
    return {
        "structured": fallback.model_dump(),
        "ai_generated": False,
        "provider": None,
        "processing_note": f"AI processing unavailable; raw patient data preserved for manual review. {last_error or ''}".strip(),
    }


def generate_case_summary(db: Session, case: CaseSheet) -> dict[str, Any]:
    payload = {
        "patient": {
            "age": case.patient.age,
            "gender": case.patient.gender,
            "preferred_language": case.patient.preferred_language,
        },
        "complaint": case.chief_complaint_structured or {"raw": case.chief_complaint_raw},
        "history": case.history or {},
        "lifestyle": case.lifestyle or {},
        "prakriti": case.prakriti_assessment or {},
        "nadi_notes": case.nadi_notes,
        "tongue_notes": case.tongue_notes,
        "documents": [
            {"type": d.document_type, "ocr_text": d.ocr_text[:1500]} for d in case.documents
        ],
    }
    prompt = f"""
Create 3-5 concise bullet-point clinical intake highlights from the JSON below.
This is NOT a diagnosis. Do not infer disease, prescribe, or recommend treatment.
Prioritize: chief complaint/duration/severity, explicit red flags, medications/allergies,
important past/family history, and Prakriti/Dosha assessment as recorded.
Return plain text bullets only, each starting with '- '.

CASE JSON:
{json.dumps(payload, ensure_ascii=False)}
""".strip()
    try:
        response = llm_client.generate_text(prompt)
        bullets = "\n".join(
            line.strip() for line in response.text.splitlines() if line.strip()
        )
        if not bullets:
            raise llm_client.LLMUnavailable("Empty summary")
        case.ai_summary = bullets
        db.add(case)
        db.commit()
        db.refresh(case)
        return {"summary": bullets, "ai_generated": True, "provider": response.provider}
    except llm_client.LLMUnavailable as exc:
        structured = case.chief_complaint_structured or {}
        dominant = (case.prakriti_assessment or {}).get("dominant_dosha", "Not recorded")
        history = case.history or {}
        meds = history.get("current_medications") or "None recorded"
        allergies = history.get("allergies") or "None recorded"
        bullets = "\n".join(
            [
                f"- Chief complaint: {structured.get('chief_complaint', case.chief_complaint_raw or 'Not recorded')} ({case.duration or 'duration not recorded'}, {case.severity}).",
                f"- Associated symptoms: {', '.join(structured.get('associated_symptoms', [])) or 'None explicitly recorded'}.",
                f"- Medications: {meds}; allergies: {allergies}.",
                f"- Recorded Prakriti/Dosha pattern: {dominant}.",
            ]
        )
        case.ai_summary = "[MANUAL REVIEW FALLBACK]\n" + bullets
        db.add(case)
        db.commit()
        db.refresh(case)
        return {
            "summary": bullets,
            "ai_generated": False,
            "provider": None,
            "processing_note": f"AI summary unavailable; deterministic intake highlights shown for manual review. {exc}",
        }


def classify_ocr_text(ocr_text: str) -> dict[str, Any]:
    prompt = f"""
Classify the OCR text from a patient-uploaded medical document.
Return ONLY valid JSON with this exact shape:
{{"document_type":"prescription|lab_report|discharge_summary|other","medications":["string"],"dates":["string"]}}
Do not diagnose and do not invent information. Extract only what is present.

OCR TEXT:
{ocr_text[:9000]}
""".strip()
    try:
        response = llm_client.generate_text(prompt)
        parsed = _extract_json(response.text)
        document_type = parsed.get("document_type", "other")
        if document_type not in {"prescription", "lab_report", "discharge_summary", "other"}:
            document_type = "other"
        return {
            "document_type": document_type,
            "medications": list(parsed.get("medications") or []),
            "dates": list(parsed.get("dates") or []),
            "ai_generated": True,
            "provider": response.provider,
            "processing_note": None,
        }
    except Exception as exc:
        lower = ocr_text.lower()
        if any(word in lower for word in ["rx", "tablet", "capsule", "prescription"]):
            doc_type = "prescription"
        elif any(word in lower for word in ["haemoglobin", "hemoglobin", "reference range", "laboratory"]):
            doc_type = "lab_report"
        elif "discharge" in lower:
            doc_type = "discharge_summary"
        else:
            doc_type = "other"
        dates = re.findall(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b", ocr_text)
        return {
            "document_type": doc_type,
            "medications": [],
            "dates": dates[:10],
            "ai_generated": False,
            "provider": None,
            "processing_note": f"AI document classification unavailable; basic local classification used. {exc}",
        }

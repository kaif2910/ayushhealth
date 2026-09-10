from datetime import datetime, timezone
from typing import Any

from .models import CaseSheet


def _gender(value: str) -> str:
    normalized = (value or "unknown").lower()
    if normalized in {"male", "female", "other", "unknown"}:
        return normalized
    return "unknown"


def build_fhir_bundle(case: CaseSheet) -> dict[str, Any]:
    patient = case.patient
    structured = case.chief_complaint_structured or {}
    prakriti = case.prakriti_assessment or {}

    identifiers = []
    if patient.abha_id:
        identifiers.append(
            {
                "system": "https://healthid.ndhm.gov.in",
                "value": patient.abha_id,
            }
        )

    patient_resource = {
        "resourceType": "Patient",
        "id": f"patient-{patient.id}",
        "identifier": identifiers,
        "name": [{"text": patient.name}],
        "gender": _gender(patient.gender),
        "telecom": [{"system": "phone", "value": patient.contact}],
        "extension": [
            {
                "url": "https://example.org/fhir/StructureDefinition/patient-age-years",
                "valueInteger": patient.age,
            },
            {
                "url": "https://example.org/fhir/StructureDefinition/preferred-language",
                "valueString": patient.preferred_language,
            },
        ],
    }

    complaint = structured.get("chief_complaint") or case.chief_complaint_raw or "Not recorded"
    condition_resource = {
        "resourceType": "Condition",
        "id": f"condition-{case.id}",
        "subject": {"reference": f"Patient/patient-{patient.id}"},
        "code": {"text": complaint},
        "note": [
            {
                "text": f"Patient-reported complaint; duration: {case.duration or 'not recorded'}; severity: {case.severity}. This is intake data, not a diagnosis."
            }
        ],
    }

    observation_resource = {
        "resourceType": "Observation",
        "id": f"prakriti-{case.id}",
        "status": "final",
        "code": {"text": "AYUSH Prakriti/Dosha self-assessment"},
        "subject": {"reference": f"Patient/patient-{patient.id}"},
        "effectiveDateTime": (case.submitted_at or case.created_at).replace(tzinfo=timezone.utc).isoformat(),
        "component": [
            {"code": {"text": "Vata score"}, "valueInteger": int(prakriti.get("vata_score", 0) or 0)},
            {"code": {"text": "Pitta score"}, "valueInteger": int(prakriti.get("pitta_score", 0) or 0)},
            {"code": {"text": "Kapha score"}, "valueInteger": int(prakriti.get("kapha_score", 0) or 0)},
            {"code": {"text": "Dominant Dosha"}, "valueString": str(prakriti.get("dominant_dosha", "Not recorded"))},
        ],
        "note": [{"text": "Patient/assistant-entered decision-support assessment; not a diagnosis."}],
    }

    now = datetime.now(timezone.utc).isoformat()
    return {
        "resourceType": "Bundle",
        "id": f"case-sheet-{case.id}",
        "type": "collection",
        "timestamp": now,
        "meta": {"tag": [{"display": "SIH26047 hackathon demonstration bundle"}]},
        "entry": [
            {"fullUrl": f"urn:uuid:patient-{patient.id}", "resource": patient_resource},
            {"fullUrl": f"urn:uuid:condition-{case.id}", "resource": condition_resource},
            {"fullUrl": f"urn:uuid:prakriti-{case.id}", "resource": observation_resource},
        ],
    }

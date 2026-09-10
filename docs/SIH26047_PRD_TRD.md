# Patient Case-Taking Software — PRD & TRD
**SIH26047 · Ministry of Ayush · Track: Software · Theme: MedTech / BioTech / HealthTech**

---

## Part 1 — Product Requirements Document (PRD)

### 1.1 Problem Statement

India's digital health backbone (ABDM — Ayushman Bharat Digital Mission) has built national infrastructure: ABHA health IDs, the Health Information Exchange, and FHIR-based interoperability standards. But a **"first-mile" gap** remains — there is no efficient, patient-facing platform that captures structured case history and digitizes supporting documents *before* the clinical encounter begins, especially for AYUSH (Ayurveda, Yoga & Naturopathy, Unani, Siddha, Homeopathy) consultations.

Today, AYUSH practitioners spend the first several minutes of every consultation manually asking and writing down the same structured information — demographics, chief complaints, history, and system-specific parameters like Prakriti (constitution) and Dosha imbalance — instead of spending that time on diagnosis and treatment.

### 1.2 Vision

A self-service digital intake platform — think airport self-check-in, but for AYUSH clinical intake — that lets a patient (or a clinic assistant) complete structured, AI-assisted case-taking before seeing the doctor, and hands the practitioner a clean, structured, ABDM-compatible case sheet in seconds.

### 1.3 Target Users

| User | Need |
|---|---|
| Patient | Fill intake quickly, in their own language, without needing to know medical terminology |
| AYUSH Practitioner (doctor) | Walk into the consultation with a structured, pre-digested case sheet |
| Clinic Receptionist/Assistant | Help patients who can't self-serve (elderly, low-literacy, no smartphone) |
| Clinic Admin | See intake volume, common complaint patterns |

### 1.4 Goals & Success Metrics

- Reduce average manual case-history-taking time per patient by a target amount (state a number in your pitch, e.g. "from ~8 minutes to under 2 minutes of doctor time")
- 100% of completed intakes produce a structured, doctor-readable case sheet with no missing mandatory fields
- Support at least 2 languages (English + 1 regional language) end-to-end
- Demonstrate a working FHIR-formatted export for at least one patient record

### 1.5 Scope

**In scope (hackathon MVP):**
- Patient self-intake wizard (web, mobile-responsive)
- AYUSH-specific structured questionnaire (Prakriti/Dosha, chief complaint, history)
- AI-assisted free-text → structured field conversion
- Voice input (speech-to-text) for intake
- Document upload + OCR for old prescriptions/reports
- Doctor dashboard with AI-summarized case sheet
- FHIR-formatted case sheet export (stub-level acceptable)

**Out of scope (mention as future work, don't attempt to build):**
- Real ABHA ID government API integration (mock/sandbox only)
- Actual diagnosis or treatment recommendation (explicitly decision-support only, never diagnostic)
- Full multi-clinic, multi-tenant production hardening
- Payment/billing integration

### 1.6 Feature List (prioritized)

**Must-have (MVP)**
1. Multi-step patient intake form — demographics, chief complaint, history, lifestyle
2. AYUSH-specific fields — Prakriti/Dosha questionnaire, Nadi/pulse notes, tongue examination notes
3. AI symptom-to-structured-data conversion from free text
4. Doctor-facing dashboard with auto-summarized case sheet
5. Document upload + OCR for old prescriptions/reports

**Strong differentiators**
6. Voice-based intake (speech-to-text) for low-literacy/elderly patients
7. Multilingual support (Hindi + regional language) via LLM translation
8. FHIR-formatted output for ABDM/health-ID interoperability
9. AI-generated Dosha-imbalance pattern summary (clearly labeled decision support, not diagnosis)
10. Progress-saving so patients can pause and resume

**Nice-to-have (stretch)**
11. QR-code handoff of case sheet between reception and doctor's room
12. Offline-first mode for low-connectivity clinics
13. Multi-visit trend view for repeat patients
14. Clinic admin analytics dashboard

### 1.7 Risks / Responsible-AI Notes

- AI output must always be labeled as **decision support**, never diagnosis — surface this in the UI itself, not just in the pitch.
- OCR/voice accuracy on regional languages and handwritten prescriptions may be inconsistent — have a manual-correction fallback in the UI.
- Patient health data is sensitive — even in a hackathon demo, avoid using any real patient data; use synthetic personas only.

---

## Part 2 — Technical Requirements Document (TRD)

### 2.1 Architecture Overview

```
[Patient Web/Mobile UI] --> [Backend API] --> [PostgreSQL: structured data]
        |                        |
        |                        --> [LLM API: text-to-structured-JSON]
        |                        --> [Speech-to-Text API: voice intake]
        |                        --> [OCR API: document digitization]
        |                        --> [FHIR export module]
        |
[Doctor Dashboard UI] <-- [Backend API] <-- [Case Sheet Summary Service]
```

### 2.2 Tech Stack — $0 / Free-Tier Build

Every layer below can be run at zero cost for a hackathon build. No layer requires a paid subscription or card-backed trial.

| Layer | Choice | Cost | Notes |
|---|---|---|---|
| Frontend | React (Vite) + Tailwind CSS | Free | Mobile-responsive multi-step wizard |
| Alternative frontend | Flutter | Free | If one codebase for web + mobile app is preferred |
| Backend | Python FastAPI | Free | Most AI/NLP tooling is Python-native |
| Database | PostgreSQL via **Supabase** or **Neon** | Free tier | Hosted Postgres, no card required |
| LLM | **Google Gemini API** (free tier) or **Groq** (free, fast inference) | Free | Free-text → structured JSON, multilingual translation, case summarization. Use Anthropic's one-time new-account credit or any hackathon-sponsor Claude credits as a bonus, not a dependency |
| Speech-to-Text | **faster-whisper** (runs locally, pip install) or browser **Web Speech API** | Free | Voice-based intake; no external API call needed |
| OCR | **Tesseract** via `pytesseract` | Free | Runs locally, open source, digitizes old prescriptions/reports |
| Auth | JWT-based; mock ABHA ID lookup (fake JSON response) | Free | Real ABHA integration out of scope for MVP |
| Interoperability | FHIR (JSON resources) | Free | Patient, Condition, Observation resources at minimum — no library license cost |
| Deployment | **Vercel/Netlify** (frontend) + **Render/Railway** free tier (backend) | Free | Free tiers may spin down when idle — warm up 5-10 min before your demo slot |
| AI coding tool | Claude Code / Cursor free tier; GitHub Student Developer Pack (if eligible) | Free | Used to scaffold and iterate on the codebase itself |

### 2.3 Data Model (core entities)

```
Patient
  - id, name, age, gender, contact, abha_id (mock), preferred_language

CaseSheet
  - id, patient_id, created_at
  - chief_complaint (raw text + structured JSON)
  - duration, severity
  - history (past illness, family history, allergies, current medications)
  - lifestyle (diet, sleep, stress, habits)
  - prakriti_assessment (Vata/Pitta/Kapha scores)
  - nadi_notes, tongue_notes
  - ai_summary (doctor-facing highlights)
  - fhir_export (JSON blob)

Document
  - id, case_sheet_id, file_url, ocr_text, document_type

Practitioner
  - id, name, specialization, clinic_id
```

### 2.4 AI Pipeline Detail

1. **Text/voice intake → structured JSON**
   Prompt an LLM with the case-sheet schema and the patient's free-text (or transcribed) input; require strict JSON output matching schema fields. Validate the JSON server-side before saving.

2. **OCR pipeline**
   Uploaded document → OCR text extraction → LLM pass to classify document type and extract key fields (medication names, dates, prior diagnoses if disclosed by patient).

3. **Doctor-facing summary**
   LLM pass over the full structured case sheet → 3-5 bullet clinical highlight summary, explicitly labeled "AI-generated summary — verify before use."

4. **FHIR export**
   Map structured CaseSheet fields to FHIR `Patient`, `Condition`, and `Observation` resources; export as downloadable/transmittable JSON.

### 2.5 API Endpoints (indicative)

```
POST   /patients                     Create patient record
POST   /case-sheets                  Create new case sheet (draft)
PATCH  /case-sheets/:id              Update case sheet (autosave/progress)
POST   /case-sheets/:id/ai-structure Convert free text -> structured JSON
POST   /case-sheets/:id/documents    Upload + OCR a document
GET    /case-sheets/:id/summary      Get AI-generated doctor summary
GET    /case-sheets/:id/fhir         Get FHIR-formatted export
GET    /practitioners/:id/queue      Doctor dashboard: pending case sheets
```

### 2.6 Non-functional Requirements

- Mobile-responsive UI (patients likely fill this on phones)
- Graceful degradation if AI API call fails (fall back to raw text field, don't block submission)
- Basic input validation and sanitization on all patient-submitted data
- No real patient data used in demo — synthetic personas only

---

## Part 3 — CLI AI Coding Prompts (for Claude Code / Cursor / similar)

Use these prompts in sequence with your CLI coding agent. Run them from an empty project folder, one at a time, reviewing output before moving to the next.

### Prompt 1 — Project scaffold

```
Scaffold a full-stack web app called "AYUSH Patient Case-Taking Software".

Frontend: React + Vite + Tailwind CSS, in a /frontend folder.
Backend: Python FastAPI, in a /backend folder, with SQLAlchemy and PostgreSQL.

Set up:
- Basic project structure and folder layout for both frontend and backend
- A docker-compose.yml that runs postgres, backend, and frontend together
- A README with setup instructions, noting that Postgres runs locally/via
  Supabase or Neon free tier, the LLM calls use a free-tier provider
  (Gemini or Groq), and OCR/speech-to-text run locally with no API key
  needed
- .env.example files for both frontend and backend with placeholders for
  DATABASE_URL and LLM_API_KEY (Gemini or Groq key — no OCR key needed
  since Tesseract runs locally)

Do not implement business logic yet — just the skeleton and dev environment.
```

### Prompt 2 — Data model

```
In the FastAPI backend, create SQLAlchemy models for:

- Patient: id, name, age, gender, contact, abha_id (nullable), preferred_language
- CaseSheet: id, patient_id (FK), created_at, chief_complaint_raw (text),
  chief_complaint_structured (JSON), duration, severity, history (JSON),
  lifestyle (JSON), prakriti_assessment (JSON), nadi_notes (text),
  tongue_notes (text), ai_summary (text), fhir_export (JSON)
- Document: id, case_sheet_id (FK), file_url, ocr_text, document_type
- Practitioner: id, name, specialization, clinic_id

Generate Alembic migrations for these models and Pydantic schemas for
request/response validation.
```

### Prompt 3 — Patient intake wizard (frontend)

```
Build a multi-step patient intake form in the React frontend with these steps:

1. Demographics (name, age, gender, contact, preferred language)
2. Chief complaint (free-text box + voice input button, with duration and
   severity fields)
3. AYUSH assessment (a Prakriti/Dosha questionnaire — generate 12 simple
   yes/no or multiple-choice questions covering Vata, Pitta, and Kapha
   characteristics, and compute a rough dominant-dosha score client-side)
4. Medical history (past illness, allergies, current medications, family
   history — all optional free text)
5. Document upload (drag-and-drop, accepts images/PDFs)
6. Review & submit

Requirements:
- Progress indicator across all steps
- Autosave draft to backend on each step transition (PATCH /case-sheets/:id)
- Mobile-responsive, large touch targets
- Support English and Hindi via a language toggle (use i18n, stub Hindi
  strings for now)
```

### Prompt 4 — AI structuring endpoint

```
In the FastAPI backend, implement POST /case-sheets/{id}/ai-structure.

It should:
1. Take the case sheet's raw free-text fields (chief_complaint_raw, history
   free text)
2. Call an LLM using a free-tier provider — the Google Gemini API
   (google-generativeai SDK) or Groq (groq SDK, OpenAI-compatible), reading
   LLM_API_KEY from env — with a prompt that instructs it to return ONLY
   valid JSON matching this schema: { "chief_complaint": str,
   "duration": str, "severity": "mild"|"moderate"|"severe",
   "associated_symptoms": [str], "possible_red_flags": [str] }
3. Parse and validate the JSON response server-side (retry once on parse
   failure)
4. Save the structured result to chief_complaint_structured
5. Return the structured JSON to the caller

Include error handling: if the LLM call fails, save the raw text as-is and
return a flag indicating AI structuring was skipped, without blocking the
save.
```

### Prompt 5 — OCR document pipeline

```
In the FastAPI backend, implement POST /case-sheets/{id}/documents.

It should:
1. Accept a file upload (image or PDF)
2. Store the file locally (or in a free-tier bucket like Supabase Storage)
   and record file_url on the Document model
3. Run OCR on the file using pytesseract (free, runs locally — install
   tesseract-ocr as a system dependency); for PDFs, extract text per page
   first using pdf2image + pytesseract
4. Pass the OCR text to the free-tier LLM (Gemini/Groq) to classify
   document_type (e.g.
   "prescription", "lab_report", "discharge_summary", "other") and extract
   any medication names or dates mentioned
5. Save ocr_text and document_type on the Document record
6. Return the Document record including extracted fields
```

### Prompt 6 — Doctor dashboard

```
Build a doctor-facing dashboard page in the React frontend at /dashboard.

It should:
- Call GET /practitioners/{id}/queue to list pending case sheets
- For each case sheet in the list, show patient name, age, chief complaint
  (truncated), and time submitted
- Clicking a case sheet opens a detail view that calls
  GET /case-sheets/{id}/summary and displays:
  - The AI-generated summary at the top, in a highlighted box labeled
    "AI-generated summary — verify before use"
  - Full structured case sheet fields below (demographics, complaint,
    history, Prakriti/Dosha scores, uploaded documents with OCR text)
- Add a button "Export FHIR" that calls GET /case-sheets/{id}/fhir and
  downloads the JSON
```

### Prompt 7 — FHIR export

```
In the FastAPI backend, implement GET /case-sheets/{id}/fhir.

Map the case sheet's structured data into FHIR R4 JSON resources:
- Patient resource (from the linked Patient record)
- Condition resource (from chief_complaint_structured)
- Observation resources (one each for Prakriti/Dosha assessment, and any
  vitals if present)

Bundle these into a single FHIR Bundle resource of type "collection" and
return it as the response. This does not need to pass full FHIR validation —
it needs to be structurally correct and clearly demonstrate ABDM
interoperability intent for a hackathon demo.
```

### Prompt 8 — Seed data for demo

```
Write a seed script that creates 4 realistic synthetic patient personas
with full case sheets, covering:
1. A young adult with digestive complaints (Pitta-dominant)
2. An elderly patient with joint pain, submitted via voice input
   (Vata-dominant)
3. A patient with a skin condition and an uploaded prescription image
   attached
4. A repeat patient with two case sheets from different dates, to
   demonstrate the multi-visit trend view

Use only synthetic/fictional data — no real patient information. Run the
AI-structuring and FHIR export pipeline on each so the demo has fully
populated data ready to present.
```

---

### How to use this document

1. Skim the PRD with your team first — agree on scope before anyone writes code.
2. Use the TRD as the shared reference for schema and API contracts, so frontend and backend work don't drift apart.
3. Run the CLI prompts in order, reviewing generated code after each step rather than queuing all 8 blindly — catch schema mismatches early.
4. Keep the "Responsible AI" notes (1.7) visible in your pitch — judges evaluating a healthcare-adjacent submission will look for this explicitly.
5. The stack in section 2.2 is deliberately chosen so the entire build costs $0 — no card-backed trials, no paid tiers required. If you later get Anthropic/AWS/GCP hackathon-sponsor credits, treat them as an upgrade, not a dependency, so the project still runs if credits run out mid-hackathon.

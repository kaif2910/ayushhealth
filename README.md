# AYUSH Patient Case-Taking Software — SIH26047

A complete hackathon MVP for **Smart India Hackathon problem statement SIH26047 (Ministry of Ayush)**. The product addresses the pre-consultation “first-mile” gap: patients or clinic assistants complete structured AYUSH intake before the practitioner encounter, and the doctor receives a reviewable case sheet with voice/OCR assistance, AI structuring, and a demo FHIR export.

> **Responsible-AI boundary:** This software is a hackathon demonstration using fictional patient personas only. AI-generated content is decision-support for intake review, never diagnosis or treatment advice. Every AI/OCR feature has a manual-review fallback.

The product and API choices follow the included PRD/TRD in `docs/SIH26047_PRD_TRD.md`.

## What is included

- React + Vite + Tailwind CSS frontend
- FastAPI + SQLAlchemy backend
- PostgreSQL + Alembic migration
- Six-step mobile-responsive patient intake wizard with autosave
- English/Hindi UI shell and preferred-language capture
- Mock ABHA format verification (`XX-XXXX-XXXX-XXXX`) with simulated delay; **no ABDM endpoint is called**
- Swappable LLM client: Gemini or Groq through one module
- Strict JSON AI structuring with one retry and deterministic fallback
- Browser audio recording + local `faster-whisper` transcription
- Image/PDF upload + local Tesseract OCR (`pdf2image` for PDFs)
- LLM document classification + medication/date extraction response, with local heuristic fallback
- JWT-protected practitioner dashboard
- AI-generated 3–5 bullet summary with explicit verification label, and non-AI fallback if the LLM is unavailable
- Prakriti/Dosha score visualization
- FHIR R4-style `Bundle` containing `Patient`, `Condition`, and `Observation`
- ABHA ID exported under identifier system `https://healthid.ndhm.gov.in`
- Multi-visit history view for repeat patients
- Seed script with **4 fictional personas / 5 submitted case sheets** and a generated synthetic prescription image

## Project structure

```text
SIH26047_AYUSH_Project/
├── .env.example
├── docker-compose.yml
├── README.md
├── docs/
│   └── SIH26047_PRD_TRD.md
├── backend/
│   ├── alembic/
│   │   └── versions/0001_initial.py
│   ├── app/
│   │   ├── ai_service.py
│   │   ├── auth.py
│   │   ├── database.py
│   │   ├── fhir.py
│   │   ├── llm_client.py
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── ocr_service.py
│   │   ├── schemas.py
│   │   └── speech_service.py
│   ├── Dockerfile
│   ├── requirements.txt
│   └── seed.py
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── api.js
    │   ├── App.jsx
    │   ├── i18n.js
    │   └── main.jsx
    ├── Dockerfile
    └── package.json
```

## Fastest local setup — Docker Compose

### Prerequisites

- Docker Desktop / Docker Engine with Docker Compose v2
- Internet access for the initial container image/package download
- Optional: a free Gemini or Groq API key. The demo still runs without it using clearly labeled deterministic/manual-review fallbacks.

### 1) Configure environment

From the project root:

```bash
cp .env.example .env
```

Edit `.env` if you want live LLM features:

```env
DATABASE_URL=postgresql+psycopg2://ayush:ayush@postgres:5432/ayush_case_taking
LLM_API_KEY=YOUR_FREE_GEMINI_OR_GROQ_KEY
```

The `.env.example` intentionally contains only the two requested variables. The app defaults to Gemini. To switch provider without changing code, set an optional shell/Compose variable before startup:

```bash
export LLM_PROVIDER=groq   # macOS/Linux
# PowerShell: $env:LLM_PROVIDER="groq"
```

Use `gemini` or `groq`. If `LLM_API_KEY` is blank, patient submission and doctor review still work; the UI clearly shows that AI processing is unavailable and preserves raw data.

### 2) Build and start all services

```bash
docker compose up --build -d
```

The backend container automatically runs:

```bash
alembic upgrade head
```

### 3) Seed the fictional demo dataset

```bash
docker compose exec backend python seed.py
```

Expected output includes:

```text
Seed complete: 4 fictional patient personas, 5 submitted case sheets, 1 synthetic prescription image.
Demo practitioner login: practitioner_id=1, PIN=26047
```

### 4) Open the app

- Frontend: `http://localhost:5173`
- FastAPI docs: `http://localhost:8000/docs`
- Backend health: `http://localhost:8000/health`

Practitioner demo login:

```text
Practitioner ID: 1
PIN: 26047
```

### 5) Stop the demo

```bash
docker compose down
```

To also remove database/upload volumes and reseed from a completely clean state:

```bash
docker compose down -v
```

## Voice input notes

The browser records with `MediaRecorder` and posts the audio to `POST /case-sheets/{id}/transcribe`. The backend runs `faster-whisper` locally on CPU.

The first use of faster-whisper may download the free Whisper `tiny` model into the backend container/cache. This is not a paid API call, but it does require network access for the first model download. If model download/transcription fails, the patient can type the complaint manually and submission remains available.

## OCR notes

The backend Docker image installs:

- `tesseract-ocr`
- `poppler-utils`
- `ffmpeg`

Images are OCR’d directly. PDFs are rendered with `pdf2image` and OCR’d page by page. OCR text is always presented for manual comparison against the uploaded original. Failed OCR never blocks submission.

## LLM provider switching

The only provider-specific logic lives in `backend/app/llm_client.py`.

Default:

```bash
LLM_PROVIDER=gemini
```

Alternative:

```bash
LLM_PROVIDER=groq
```

The backend reads `LLM_API_KEY` for either provider. Model names have sensible free-tier defaults and can optionally be overridden through `GEMINI_MODEL` or `GROQ_MODEL` shell variables without modifying the application.

## Main API endpoints

```text
POST   /auth/login
GET    /auth/me
POST   /patients
GET    /patients/{id}
GET    /patients/{id}/case-sheets
POST   /case-sheets
GET    /case-sheets/{id}
PATCH  /case-sheets/{id}
POST   /abha/verify
POST   /case-sheets/{id}/ai-structure
POST   /case-sheets/{id}/transcribe
POST   /case-sheets/{id}/documents
GET    /case-sheets/{id}/summary
GET    /case-sheets/{id}/fhir
GET    /practitioners/{id}/queue
```

Practitioner-facing queue, summary, FHIR, and multi-visit history endpoints use the JWT bearer token obtained from `/auth/login`.

## Seed personas

All seed data is explicitly fictional.

1. **Aarav Nair** — young adult with digestive complaints; Pitta-dominant self-assessment.
2. **Savitri Rao** — elderly patient with knee stiffness/pain; Vata-dominant; record marks the chief complaint as having been submitted through the voice-input workflow.
3. **Ananya Deshmukh** — skin complaint; generated synthetic prescription image stored in the upload folder with OCR text.
4. **Kabir Iyer** — repeat patient with two case sheets on different dates for the longitudinal visit-history view.

During seeding, every case runs through the same structuring, summary, and FHIR helper pipeline. With a configured LLM key, those AI stages use the selected provider. Without a key, deterministic, clearly labeled fallback output is stored so the dashboard is populated immediately.

## FHIR demo mapping

`GET /case-sheets/{id}/fhir` returns a FHIR R4-shaped collection Bundle containing:

- `Patient` — demographics and optional ABHA identifier
- `Condition` — patient-reported chief complaint, explicitly documented as intake data rather than a diagnosis
- `Observation` — Prakriti/Dosha scores and dominant dosha

The ABHA identifier uses:

```text
https://healthid.ndhm.gov.in
```

This is intentionally demonstration-level interoperability and is not a full ABDM production integration or a full FHIR validation implementation.

## What is deliberately mocked/simplified

- **ABHA:** format validation + simulated response only. No real ABDM credentials or endpoints.
- **Authentication:** real signed JWT tokens, but a seeded single-practitioner demo PIN rather than production IAM/password/MFA/roles.
- **FHIR:** structurally correct demo Bundle; not submitted to a live ABDM/HIE gateway and not validated against every Indian profile.
- **AI:** free-tier Gemini/Groq adapter. If no key/network is available, deterministic fallback preserves demo usability.
- **Speech:** local Whisper; first model download can be slow on a fresh machine and regional-language accuracy depends on the chosen model.
- **OCR:** local Tesseract; handwriting and poor scans can be unreliable, so original documents remain viewable.
- **Storage:** local Docker volume for documents, not production object storage.
- **Security/operations:** production consent, encryption/key management, audit logging, multi-tenancy, retention policies, rate limits, and regulatory hardening are outside the hackathon MVP.

## Suggested 30-second hackathon pitch

> “ABDM has created the digital health backbone, but the consultation still begins with manual case-taking. SIH26047 closes that first-mile gap. Our patient completes a mobile-friendly AYUSH intake before meeting the doctor, optionally by voice and by uploading prior documents. The system structures the story, captures Prakriti/Dosha context, and gives the practitioner a reviewable pre-consultation case sheet. AI is clearly decision-support only, and failures never block care. We then export the intake as a FHIR R4-shaped bundle with an ABHA identifier to demonstrate how this can plug into the ABDM ecosystem.”

## Deployment direction after the hackathon

The local architecture is ready to split into:

- Frontend: Vercel or Netlify
- Backend: Render or Railway
- Database: Supabase or Neon PostgreSQL
- Uploaded documents: replace the local volume with a controlled object-storage bucket

For production, also add patient/practitioner identity, consent, encryption at rest, audit trails, fine-grained authorization, secure secret management, data retention/deletion controls, and formal ABDM/FHIR profile validation.

import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CloudUpload,
  FileText,
  LoaderCircle,
  Mic,
  MicOff,
  Save,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, uploadFile } from '../api'
import ProgressBar from '../components/ProgressBar'
import AINotice from '../components/AINotice'

const initialForm = {
  name: '', age: '', gender: '', contact: '', preferred_language: 'English', abha_id: '',
  chief_complaint_raw: '', duration: '', severity: 'moderate',
  past_illness: '', allergies: '', current_medications: '', family_history: '',
  diet: '', sleep: '', stress: '', habits: '', nadi_notes: '', tongue_notes: '',
}

function SectionTitle({ eyebrow, title, text }) {
  return (
    <div className="mb-7">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">{eyebrow}</div>
      <h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">{title}</h2>
      {text && <p className="mt-2 max-w-3xl text-slate-600">{text}</p>}
    </div>
  )
}

export default function IntakeWizard() {
  const { t, i18n } = useTranslation()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(initialForm)
  const [patientId, setPatientId] = useState(null)
  const [caseId, setCaseId] = useState(null)
  const [abhaVerified, setAbhaVerified] = useState(false)
  const [abhaResult, setAbhaResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [documents, setDocuments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadNote, setUploadNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [aiResult, setAiResult] = useState(null)

  const stepLabels = ['Demographics', 'Complaint', 'History', 'Documents', 'Review']
  const isHindi = i18n.language === 'hi'

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
    if (name === 'abha_id') {
      setAbhaVerified(false)
      setAbhaResult(null)
    }
  }

  function validateCurrentStep() {
    if (step === 1) {
      if (!form.name.trim() || !form.age || !form.gender || !form.contact.trim()) return 'Please complete name, age, gender and contact.'
      if (Number(form.age) < 0 || Number(form.age) > 120) return 'Please enter a valid age.'
      if (form.abha_id && !abhaVerified) return 'Please verify the entered ABHA ID, or clear it to continue without ABHA.'
    }
    if (step === 2 && (!form.chief_complaint_raw.trim() || !form.duration.trim())) return 'Please describe the complaint and its duration.'
    return ''
  }

  function casePatch(targetStep) {
    return {
      chief_complaint_raw: form.chief_complaint_raw,
      duration: form.duration,
      severity: form.severity,
      history: {
        past_illness: form.past_illness,
        allergies: form.allergies,
        current_medications: form.current_medications,
        family_history: form.family_history,
      },
      lifestyle: {
        diet: form.diet,
        sleep: form.sleep,
        stress: form.stress,
        habits: form.habits,
      },
      nadi_notes: form.nadi_notes,
      tongue_notes: form.tongue_notes,
      current_step: targetStep,
    }
  }

  async function ensureDraft() {
    if (patientId && caseId) return { patientId, caseId }
    const patient = await api('/patients', {
      method: 'POST',
      body: JSON.stringify({
        name: form.name.trim(),
        age: Number(form.age),
        gender: form.gender,
        contact: form.contact.trim(),
        preferred_language: form.preferred_language,
        abha_id: abhaVerified ? form.abha_id : null,
      }),
    })
    const createdCase = await api('/case-sheets', {
      method: 'POST',
      body: JSON.stringify({ patient_id: patient.id }),
    })
    setPatientId(patient.id)
    setCaseId(createdCase.id)
    return { patientId: patient.id, caseId: createdCase.id }
  }

  async function autosave(targetStep) {
    const ids = await ensureDraft()
    await api(`/case-sheets/${ids.caseId}`, {
      method: 'PATCH',
      body: JSON.stringify(casePatch(targetStep)),
    })
    setSaveMessage(`Draft saved · Case #${ids.caseId}`)
    return ids.caseId
  }

  async function next() {
    const validation = validateCurrentStep()
    if (validation) { setError(validation); return }
    setBusy(true); setError('')
    try {
      await autosave(Math.min(step + 1, 5))
      setStep((s) => Math.min(s + 1, 5))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function back() {
    setError('')
    if (caseId) {
      try { await autosave(Math.max(step - 1, 1)) } catch (err) { setSaveMessage(`Autosave unavailable: ${err.message}`) }
    }
    setStep((current) => Math.max(current - 1, 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function verifyABHA() {
    setBusy(true); setError(''); setAbhaResult(null)
    try {
      const result = await api('/abha/verify', {
        method: 'POST',
        body: JSON.stringify({ abha_id: form.abha_id, patient_name: form.name || null }),
      })
      setAbhaVerified(result.verified)
      setAbhaResult(result)
    } catch (err) {
      setAbhaVerified(false)
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }



  async function handleFiles(fileList) {
    if (!caseId) return
    const selected = Array.from(fileList || [])
    if (!selected.length) return
    setUploading(true); setUploadNote('')
    for (const file of selected) {
      try {
        const result = await uploadFile(`/case-sheets/${caseId}/documents`, file)
        setDocuments((current) => [...current, { ...result, originalName: file.name }])
        if (result.processing_note) setUploadNote(result.processing_note)
      } catch (err) {
        setUploadNote(`A file could not be processed: ${err.message}. Other intake data is still safe.`)
      }
    }
    setUploading(false)
  }

  async function submit() {
    setBusy(true); setError('')
    try {
      const id = await autosave(6)
      const structured = await api(`/case-sheets/${id}/ai-structure`, { method: 'POST' })
      setAiResult(structured)
      await api(`/case-sheets/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'submitted', current_step: 6 }) })
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (submitted) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="panel p-7 text-center sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-8 w-8" /></div>
          <h1 className="mt-5 text-3xl font-black text-slate-950">Case sheet submitted</h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">Your structured intake has been saved as Case #{caseId}. The practitioner can now review it before the consultation.</p>
          <div className="mt-6 text-left">
            <AINotice available={aiResult?.ai_generated !== false}>
              {aiResult?.ai_generated
                ? 'AI structuring completed. The practitioner must verify all AI-generated fields before use.'
                : (aiResult?.processing_note || 'AI processing was unavailable. Raw patient text was preserved and submission was not blocked.')}
            </AINotice>
          </div>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/" className="btn-secondary">Return home</Link>
            <Link to="/dashboard" className="btn-primary">Open doctor dashboard</Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="panel p-5 sm:p-8">
        <ProgressBar step={step} labels={stepLabels} />
        {saveMessage && <div className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-700"><Save className="h-4 w-4" /> {saveMessage}</div>}

        <div className="mt-8">
          {step === 1 && (
            <>
              <SectionTitle eyebrow="Step 1" title={t('demographics')} text="Tell us the basic information the practitioner needs before the consultation." />
              <div className="grid gap-5 md:grid-cols-2">
                <label><span className="field-label">{t('name')} *</span><input className="field" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Rohan Patil" /></label>
                <label><span className="field-label">{t('age')} *</span><input className="field" type="number" min="0" max="120" value={form.age} onChange={(e) => update('age', e.target.value)} placeholder="32" /></label>
                <label><span className="field-label">{t('gender')} *</span><select className="field" value={form.gender} onChange={(e) => update('gender', e.target.value)}><option value="">Select</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option><option value="unknown">Prefer not to say</option></select></label>
                <label><span className="field-label">{t('contact')} *</span><input className="field" value={form.contact} onChange={(e) => update('contact', e.target.value)} placeholder="10-digit mobile number" /></label>
                <label><span className="field-label">{t('preferredLanguage')}</span><select className="field" value={form.preferred_language} onChange={(e) => update('preferred_language', e.target.value)}><option>English</option><option>Hindi</option><option>Marathi</option><option>Tamil</option><option>Telugu</option><option>Kannada</option></select></label>
                <div>
                  <span className="field-label">{t('abha')}</span>
                  <div className="flex gap-2"><input className="field" value={form.abha_id} onChange={(e) => update('abha_id', e.target.value)} placeholder="91-1234-5678-9012" /><button type="button" className="btn-secondary shrink-0" onClick={verifyABHA} disabled={!form.abha_id || busy}><ShieldCheck className="h-4 w-4" /> {t('verify')}</button></div>
                  <p className="mt-2 text-xs text-slate-500">Format check only — no real ABDM endpoint is called.</p>
                  {abhaResult && <div className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Verified mock ID · {abhaResult.name} · {abhaResult.abha_address}</div>}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <SectionTitle eyebrow="Step 2" title={t('complaint')} text="Describe the problem in your own words." />
              <label><span className="field-label">What brings you in today? *</span><textarea className="field min-h-40" value={form.chief_complaint_raw} onChange={(e) => update('chief_complaint_raw', e.target.value)} placeholder="Describe what you feel, where it occurs, what makes it better/worse, and any associated symptoms…" /></label>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <label><span className="field-label">Duration *</span><input className="field" value={form.duration} onChange={(e) => update('duration', e.target.value)} placeholder="e.g. 3 weeks" /></label>
                <label><span className="field-label">Severity *</span><select className="field" value={form.severity} onChange={(e) => update('severity', e.target.value)}><option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option></select></label>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <SectionTitle eyebrow="Step 3" title={t('history')} text="These fields are optional. Add only information you want the practitioner to review." />
              <div className="grid gap-5 md:grid-cols-2">
                <label><span className="field-label">Past illness / procedures</span><textarea className="field min-h-28" value={form.past_illness} onChange={(e) => update('past_illness', e.target.value)} /></label>
                <label><span className="field-label">Allergies</span><textarea className="field min-h-28" value={form.allergies} onChange={(e) => update('allergies', e.target.value)} /></label>
                <label><span className="field-label">Current medications</span><textarea className="field min-h-28" value={form.current_medications} onChange={(e) => update('current_medications', e.target.value)} /></label>
                <label><span className="field-label">Family history</span><textarea className="field min-h-28" value={form.family_history} onChange={(e) => update('family_history', e.target.value)} /></label>
              </div>
              <h3 className="mt-8 text-lg font-black text-slate-950">Lifestyle</h3>
              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <label><span className="field-label">Diet pattern</span><input className="field" value={form.diet} onChange={(e) => update('diet', e.target.value)} placeholder="Meal timing, vegetarian/mixed, spicy foods…" /></label>
                <label><span className="field-label">Sleep pattern</span><input className="field" value={form.sleep} onChange={(e) => update('sleep', e.target.value)} placeholder="Hours, interruptions, sleep timing…" /></label>
                <label><span className="field-label">Stress</span><input className="field" value={form.stress} onChange={(e) => update('stress', e.target.value)} placeholder="Low / moderate / high, context if useful" /></label>
                <label><span className="field-label">Habits</span><input className="field" value={form.habits} onChange={(e) => update('habits', e.target.value)} placeholder="Tea/coffee, exercise, tobacco, etc." /></label>
              </div>
              <h3 className="mt-8 text-lg font-black text-slate-950">AYUSH examination notes (optional)</h3>
              <p className="mt-1 text-sm text-slate-500">Leave blank for self-intake. A clinic assistant or practitioner can add these if assessed.</p>
              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <label><span className="field-label">Nadi / pulse notes</span><textarea className="field min-h-24" value={form.nadi_notes} onChange={(e) => update('nadi_notes', e.target.value)} /></label>
                <label><span className="field-label">Tongue notes</span><textarea className="field min-h-24" value={form.tongue_notes} onChange={(e) => update('tongue_notes', e.target.value)} /></label>
              </div>
            </>
          )}


          {step === 4 && (
            <>
              <SectionTitle eyebrow="Step 4" title={t('documents')} text="Upload old prescriptions or reports. OCR runs locally; if it cannot read the file, the upload is still preserved for manual review." />
              <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }} className="rounded-3xl border-2 border-dashed border-emerald-300 bg-emerald-50/60 p-8 text-center">
                <CloudUpload className="mx-auto h-10 w-10 text-emerald-700" />
                <div className="mt-3 text-lg font-bold text-slate-900">Drag & drop images or PDFs</div>
                <p className="mt-1 text-sm text-slate-500">PNG, JPG, WEBP, TIFF or PDF</p>
                <label className="btn-primary mt-5 cursor-pointer">Choose files<input type="file" multiple accept="image/*,.pdf" className="hidden" onChange={(e) => handleFiles(e.target.files)} /></label>
                {uploading && <div className="mt-4 flex items-center justify-center gap-2 text-sm text-emerald-800"><LoaderCircle className="h-4 w-4 animate-spin" /> Running local OCR…</div>}
              </div>
              {uploadNote && <div className="mt-4"><AINotice available={false}>{uploadNote}</AINotice></div>}
              <div className="mt-5 space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start gap-3"><FileText className="mt-1 h-5 w-5 text-emerald-700" /><div className="min-w-0 flex-1"><div className="font-bold text-slate-900">{doc.originalName}</div><div className="mt-1 flex flex-wrap gap-2"><span className="chip">{doc.document_type}</span>{doc.ai_generated && <span className="chip">AI-classified · verify</span>}</div>{doc.ocr_text && <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-slate-600">{doc.ocr_text}</p>}</div></div>
                  </div>
                ))}
                {!documents.length && <p className="text-sm text-slate-500">No documents uploaded — this step is optional.</p>}
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <SectionTitle eyebrow="Step 5" title={t('review')} text="Review patient-entered information before submission. AI structuring runs after you submit and never blocks the case." />
              <AINotice>{t('aiDisclaimer')}</AINotice>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <ReviewCard title="Patient"><Row label="Name" value={form.name} /><Row label="Age / gender" value={`${form.age} · ${form.gender}`} /><Row label="Contact" value={form.contact} /><Row label="Language" value={form.preferred_language} /><Row label="ABHA" value={abhaVerified ? `${form.abha_id} (mock verified)` : 'Not linked'} /></ReviewCard>
                <ReviewCard title="Chief complaint"><Row label="Complaint" value={form.chief_complaint_raw} /><Row label="Duration" value={form.duration} /><Row label="Severity" value={form.severity} /></ReviewCard>
                <ReviewCard title="History"><Row label="Past illness" value={form.past_illness || 'Not provided'} /><Row label="Allergies" value={form.allergies || 'Not provided'} /><Row label="Medications" value={form.current_medications || 'Not provided'} /><Row label="Family history" value={form.family_history || 'Not provided'} /></ReviewCard>
                <ReviewCard title="Lifestyle"><Row label="Diet" value={form.diet || 'Not provided'} /><Row label="Sleep" value={form.sleep || 'Not provided'} /><Row label="Stress" value={form.stress || 'Not provided'} /><Row label="Habits" value={form.habits || 'Not provided'} /></ReviewCard>
                <ReviewCard title="Documents & AYUSH notes"><Row label="Documents" value={`${documents.length} uploaded`} /><Row label="Nadi" value={form.nadi_notes || 'Not assessed'} /><Row label="Tongue" value={form.tongue_notes || 'Not assessed'} /></ReviewCard>
              </div>
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Submitting will save the case to the practitioner queue and run AI text structuring. If the LLM is unavailable, the raw complaint and history remain saved and the case is still submitted.</div>
            </>
          )}
        </div>

        {error && <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{error}</div>}

        <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t border-slate-200 pt-6 sm:flex-row">
          <button type="button" className="btn-secondary" onClick={back} disabled={step === 1 || busy}><ArrowLeft className="h-5 w-5" /> {t('back')}</button>
          {step < 6 ? (
            <button type="button" className="btn-primary" onClick={next} disabled={busy}>{busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />} {t('next')}</button>
          ) : (
            <button type="button" className="btn-primary" onClick={submit} disabled={busy}>{busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />} {t('submit')}</button>
          )}
        </div>
      </div>
    </main>
  )
}

function ReviewCard({ title, children }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="mb-4 font-black text-slate-950">{title}</h3><div className="space-y-3">{children}</div></div>
}

function Row({ label, value }) {
  return <div><div className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</div><div className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{value}</div></div>
}

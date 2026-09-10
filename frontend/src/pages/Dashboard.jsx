import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowLeft,
  Clock3,
  Download,
  FileJson,
  FileText,
  History,
  LoaderCircle,
  LogOut,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
  X,
} from 'lucide-react'
import { API_URL, api, downloadFHIR, getToken, setToken } from '../api'
import AINotice from '../components/AINotice'

export default function Dashboard() {
  const [tokenReady, setTokenReady] = useState(Boolean(getToken()))
  const [queue, setQueue] = useState([])
  const [selected, setSelected] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [practitioner, setPractitioner] = useState(null)

  async function loadQueue() {
    if (!getToken()) return
    setLoading(true); setError('')
    try {
      const [me, items] = await Promise.all([api('/auth/me'), api('/practitioners/1/queue')])
      setPractitioner(me)
      setQueue(items)
      setTokenReady(true)
    } catch (err) {
      if (err.status === 401) {
        setToken(null); setTokenReady(false); setPractitioner(null)
      }
      setError(err.message)
    } finally { setLoading(false) }
  }

  useEffect(() => { loadQueue() }, [])

  async function openCase(caseId) {
    setLoading(true); setError(''); setSelected(null); setSummary(null)
    try {
      const [caseData, summaryData] = await Promise.all([
        api(`/case-sheets/${caseId}`),
        api(`/case-sheets/${caseId}/summary`),
      ])
      setSelected(caseData)
      setSummary(summaryData)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  function logout() {
    setToken(null); setTokenReady(false); setSelected(null); setQueue([]); setPractitioner(null)
  }

  if (!tokenReady) return <PractitionerLogin onSuccess={loadQueue} error={error} />

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Practitioner workspace</div>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Doctor dashboard</h1>
          <p className="mt-1 text-slate-600">{practitioner ? `${practitioner.name} · ${practitioner.specialization}` : 'Loading practitioner…'}</p>
        </div>
        <button className="btn-secondary" onClick={logout}><LogOut className="h-4 w-4" /> Sign out</button>
      </div>

      {error && <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

      {!tokenReady ? (
        <PractitionerLogin onSuccess={loadQueue} error={error} />
      ) : (
        <>
          <AbhaSearch />
          <div className="mt-8">
            <Queue queue={queue} loading={loading} />
          </div>
        </>
      )}
    </main>
  )
}

function AbhaSearch() {
  const [abha, setAbha] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function search(e) {
    if (e) e.preventDefault()
    if (!abha.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await api(`/doctor/search-patient?abha=${abha}`)
      navigate(`/doctor/patients/${res.patient.id}`)
    } catch (err) {
      setError(err.status === 404 ? 'Patient not found. Please verify the ABHA number.' : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="panel p-5 sm:p-7 bg-emerald-50/50 relative">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-700" />
            Search Patient by ABHA ID
          </h2>
          <p className="mt-1 text-sm text-slate-600">Enter a 16-digit ABHA number to pull authorized records.</p>
        </div>
        <form onSubmit={search} className="flex gap-2">
          <input 
            type="text" 
            placeholder="91-XXXX-XXXX-XXXX" 
            className="field !w-64" 
            value={abha}
            onChange={e => setAbha(e.target.value)}
          />
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : 'Search'}
          </button>
        </form>
      </div>
      {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{error}</div>}
    </section>
  )
}

function PractitionerLogin({ onSuccess, error }) {
  const [id, setId] = useState('1')
  const [pin, setPin] = useState('26047')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState('')

  async function login(event) {
    event.preventDefault(); setBusy(true); setLocalError('')
    try {
      const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ practitioner_id: Number(id), pin }) })
      setToken(result.access_token)
      await onSuccess()
    } catch (err) { setLocalError(err.message) }
    finally { setBusy(false) }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-14 sm:px-6">
      <div className="panel p-7 sm:p-9">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800"><Stethoscope className="h-7 w-7" /></div>
        <h1 className="mt-5 text-3xl font-black text-slate-950">Practitioner sign-in</h1>
        <p className="mt-2 text-slate-600">Simple JWT authentication for the hackathon demo. Seeded credentials are prefilled.</p>
        <form className="mt-6 space-y-4" onSubmit={login}>
          <label><span className="field-label">Practitioner ID</span><input className="field" type="number" value={id} onChange={(e) => setId(e.target.value)} /></label>
          <label><span className="field-label">Demo PIN</span><input className="field" type="password" value={pin} onChange={(e) => setPin(e.target.value)} /></label>
          {(localError || error) && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">{localError || error}</div>}
          <button className="btn-primary w-full" disabled={busy}>{busy && <LoaderCircle className="h-4 w-4 animate-spin" />} Sign in</button>
        </form>
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600"><strong>Demo:</strong> Practitioner ID 1 · PIN 26047. Production identity/role hardening is intentionally outside the hackathon MVP.</div>
      </div>
    </main>
  )
}

function Queue({ queue, loading }) {
  const navigate = useNavigate()
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div><h2 className="font-black text-slate-950">Pending intake queue</h2><p className="text-sm text-slate-500">Submitted case sheets awaiting practitioner review</p></div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-800">{queue.length}</span>
        </div>
        {loading ? <div className="flex items-center justify-center gap-2 p-12 text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" /> Loading cases…</div> : (
          <div className="divide-y divide-slate-100">
            {queue.map((item) => (
              <button key={item.case_sheet_id} onClick={() => navigate(`/doctor/patients/${item.patient_id}`)} className="block w-full p-5 text-left transition hover:bg-emerald-50/50 sm:p-6">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black text-slate-950">{item.patient_name}</h3><span className="chip">Age {item.age}</span>{item.dominant_dosha && <span className="chip">{item.dominant_dosha}</span>}</div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{item.chief_complaint || 'Chief complaint not recorded'}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs font-medium text-slate-500"><Clock3 className="h-4 w-4" /> {formatDate(item.submitted_at)}</div>
                </div>
              </button>
            ))}
            {!queue.length && <div className="p-10 text-center text-slate-500">No submitted cases in the queue. Run the seed script or submit a patient intake.</div>}
          </div>
        )}
      </section>
      <aside className="space-y-4">
        <div className="rounded-3xl bg-slate-950 p-6 text-white">
          <Activity className="h-7 w-7 text-emerald-300" />
          <h3 className="mt-4 text-xl font-black">Pre-consultation handoff</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">Review patient-entered data, AI-assisted structuring, OCR text and Prakriti/Dosha scores before beginning the consultation.</p>
        </div>
        <AINotice>All AI-generated content must be verified before clinical use. The system does not diagnose or recommend treatment.</AINotice>
      </aside>
    </div>
  )
}

function CaseDetail({ caseData, summary, onBack }) {
  const [exporting, setExporting] = useState(false)
  const structured = caseData.chief_complaint_structured || {}
  const redFlags = structured.possible_red_flags || []
  const patient = caseData.patient || {}

  async function exportFHIR() {
    setExporting(true)
    try { await downloadFHIR(caseData.id) } finally { setExporting(false) }
  }

  return (
    <div>
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-950"><ArrowLeft className="h-4 w-4" /> Back to queue</button>
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="panel p-5 sm:p-7">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-black text-slate-950">{patient.name}</h2><span className="chip">Case #{caseData.id}</span></div><p className="mt-1 text-slate-500">Age {patient.age} · {patient.gender} · {patient.preferred_language}</p></div>
              <div className="flex flex-wrap gap-2"><Link className="btn-secondary !min-h-10 !px-3 !py-2 text-sm" to={`/patients/${patient.id}`}><History className="h-4 w-4" /> Visit history</Link><button className="btn-primary !min-h-10 !px-3 !py-2 text-sm" onClick={exportFHIR} disabled={exporting}><FileJson className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export FHIR'}</button></div>
            </div>

            <div className="mt-6">
              <AINotice available={summary?.ai_generated !== false}>
                <div className="font-black">{summary?.label || 'AI-generated summary — verify before use'}</div>
                <div className="mt-2 whitespace-pre-line leading-6">{summary?.summary || 'Summary loading…'}</div>
                {summary?.processing_note && <div className="mt-2 text-xs opacity-80">{summary.processing_note}</div>}
              </AINotice>
            </div>
          </section>

          <Section title="Chief complaint" badge="AI-assisted/fallback structure · verify before use">
            <Info label="Patient's raw words" value={caseData.chief_complaint_raw} />
            <div className="mt-5 grid gap-4 md:grid-cols-2"><Info label="Structured complaint" value={structured.chief_complaint || 'Not available'} /><Info label="Duration / severity" value={`${caseData.duration || 'Not recorded'} · ${caseData.severity}`} /></div>
            <div className="mt-5 grid gap-4 md:grid-cols-2"><Info label="Associated symptoms" value={(structured.associated_symptoms || []).join(', ') || 'None explicitly extracted'} /><Info label="Possible red flags from supplied text" value={redFlags.join(', ') || 'None explicitly extracted'} /></div>
          </Section>

          <Section title="Medical history & lifestyle">
            <KeyValueGrid data={caseData.history} />
            <h4 className="mt-6 mb-3 text-sm font-black uppercase tracking-wide text-slate-500">Lifestyle</h4>
            <KeyValueGrid data={caseData.lifestyle} />
          </Section>

          <Section title="Prakriti / Dosha assessment" badge="Decision-support · not diagnosis">
            <DoshaBars data={caseData.prakriti_assessment || {}} />
            <div className="mt-5 grid gap-4 md:grid-cols-2"><Info label="Nadi / pulse notes" value={caseData.nadi_notes || 'Not assessed'} /><Info label="Tongue notes" value={caseData.tongue_notes || 'Not assessed'} /></div>
          </Section>

          <Section title={`Uploaded documents (${caseData.documents?.length || 0})`} badge="OCR + document type · verify against original">
            <div className="space-y-4">
              {(caseData.documents || []).map((doc) => (
                <div key={doc.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2"><FileText className="h-5 w-5 text-emerald-700" /><span className="font-black text-slate-900">{doc.document_type}</span><span className="chip">OCR</span><a className="ml-auto text-sm font-bold text-emerald-700 hover:underline" href={`${API_URL}${doc.file_url}`} target="_blank" rel="noreferrer">Open original</a></div>
                  <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{doc.ocr_text || 'No OCR text available — review original manually.'}</pre>
                </div>
              ))}
              {!caseData.documents?.length && <p className="text-sm text-slate-500">No documents uploaded.</p>}
            </div>
          </Section>
        </div>

        <aside className="space-y-4">
          <div className="panel p-5">
            <h3 className="font-black text-slate-950">Patient & ABHA</h3>
            <div className="mt-4 space-y-4"><Info label="Contact" value={patient.contact} /><Info label="ABHA" value={patient.abha_id || 'Not linked'} />{patient.abha_id && <div className="flex items-center gap-2 text-sm font-bold text-emerald-700"><ShieldCheck className="h-4 w-4" /> Mock verification recorded</div>}<Info label="Submitted" value={formatDate(caseData.submitted_at || caseData.created_at)} /></div>
          </div>
          <div className="rounded-3xl border border-violet-200 bg-violet-50 p-5 text-violet-950"><Sparkles className="h-6 w-6" /><h3 className="mt-3 font-black">Responsible AI</h3><p className="mt-2 text-sm leading-6">AI structures patient text and prepares highlights only. It does not establish a diagnosis, prescribe medicine, or replace practitioner review.</p></div>
          <div className="panel p-5"><Download className="h-6 w-6 text-emerald-700" /><h3 className="mt-3 font-black text-slate-950">ABDM demo handoff</h3><p className="mt-2 text-sm leading-6 text-slate-600">FHIR export creates an R4 collection Bundle with Patient, Condition and Prakriti/Dosha Observation resources.</p></div>
        </aside>
      </div>
    </div>
  )
}

function Section({ title, badge, children }) {
  return <section className="panel p-5 sm:p-7"><div className="mb-5 flex flex-wrap items-center justify-between gap-2"><h3 className="text-xl font-black text-slate-950">{title}</h3>{badge && <span className="chip">{badge}</span>}</div>{children}</section>
}

function Info({ label, value }) {
  return <div><div className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</div><div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{value || 'Not provided'}</div></div>
}

function KeyValueGrid({ data = {} }) {
  const entries = Object.entries(data || {}).filter(([key]) => key !== 'voice_input_used')
  return <div className="grid gap-4 md:grid-cols-2">{entries.map(([key, value]) => <Info key={key} label={key.replaceAll('_', ' ')} value={String(value || 'Not provided')} />)}{!entries.length && <p className="text-sm text-slate-500">No details provided.</p>}</div>
}

function DoshaBars({ data }) {
  const values = [
    ['Vata', Number(data.vata_score || 0)],
    ['Pitta', Number(data.pitta_score || 0)],
    ['Kapha', Number(data.kapha_score || 0)],
  ]
  const max = Math.max(12, ...values.map(([, value]) => value))
  return <div><div className="mb-5 flex items-center gap-2"><span className="text-sm text-slate-500">Recorded dominant dosha:</span><span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-800">{data.dominant_dosha || 'Not recorded'}</span></div><div className="space-y-4">{values.map(([name, value]) => <div key={name}><div className="mb-1 flex justify-between text-sm font-bold text-slate-700"><span>{name}</span><span>{value}</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${(value / max) * 100}%` }} /></div></div>)}</div></div>
}

function formatDate(value) {
  if (!value) return 'Not submitted'
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function ConsultationModal({ patientId, onClose, onSuccess }) {
  const [form, setForm] = useState({ symptoms: '', diagnosis: '', doctor_notes: '', follow_up_date: '' })
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await api('/consultations', { method: 'POST', body: JSON.stringify({ patient_id: patientId, ...form }) })
      onSuccess()
      onClose()
    } catch(err) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-slate-900">Add Consultation</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-6 w-6" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label><span className="field-label">Symptoms</span><textarea required className="field" value={form.symptoms} onChange={e=>setForm({...form, symptoms: e.target.value})} /></label>
          <label><span className="field-label">Diagnosis</span><textarea required className="field" value={form.diagnosis} onChange={e=>setForm({...form, diagnosis: e.target.value})} /></label>
          <label><span className="field-label">Doctor Notes</span><textarea className="field" value={form.doctor_notes} onChange={e=>setForm({...form, doctor_notes: e.target.value})} /></label>
          <label><span className="field-label">Follow-up Date</span><input type="date" className="field" value={form.follow_up_date} onChange={e=>setForm({...form, follow_up_date: e.target.value})} /></label>
          <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? 'Saving...' : 'Save Consultation'}</button>
        </form>
      </div>
    </div>
  )
}

function PrescriptionModal({ patientId, consultations, onClose, onSuccess }) {
  const [form, setForm] = useState({
    consultation_id: consultations?.[0]?.id || '',
    medicine_name: '', dosage: '', frequency: '', duration: '', instructions: '', start_date: '', end_date: ''
  })
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!form.consultation_id) return alert("A consultation is required to add a prescription.")
    setBusy(true)
    try {
      await api('/prescriptions', { method: 'POST', body: JSON.stringify({ patient_id: patientId, ...form }) })
      onSuccess()
      onClose()
    } catch(err) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-slate-900">Add Prescription</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-6 w-6" /></button>
        </div>
        
        {!consultations?.length ? (
          <div className="text-rose-600 mb-4 p-3 bg-rose-50 rounded-xl">No prior consultations found. Please add a consultation first.</div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label>
              <span className="field-label">Link to Consultation</span>
              <select required className="field" value={form.consultation_id} onChange={e=>setForm({...form, consultation_id: Number(e.target.value)})}>
                {consultations.map(c => <option key={c.id} value={c.id}>{new Date(c.consultation_date || c.created_at).toLocaleDateString()} - {c.diagnosis || 'Consultation'}</option>)}
              </select>
            </label>
            <label><span className="field-label">Medicine Name</span><input required type="text" className="field" value={form.medicine_name} onChange={e=>setForm({...form, medicine_name: e.target.value})} /></label>
            <div className="grid grid-cols-2 gap-4">
              <label><span className="field-label">Dosage</span><input type="text" className="field" value={form.dosage} onChange={e=>setForm({...form, dosage: e.target.value})} placeholder="e.g. 500mg" /></label>
              <label><span className="field-label">Frequency</span><input type="text" className="field" value={form.frequency} onChange={e=>setForm({...form, frequency: e.target.value})} placeholder="e.g. Twice a day" /></label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label><span className="field-label">Duration</span><input type="text" className="field" value={form.duration} onChange={e=>setForm({...form, duration: e.target.value})} placeholder="e.g. 5 days" /></label>
              <label><span className="field-label">Instructions</span><input type="text" className="field" value={form.instructions} onChange={e=>setForm({...form, instructions: e.target.value})} placeholder="e.g. After meals" /></label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label><span className="field-label">Start Date</span><input type="date" className="field" value={form.start_date} onChange={e=>setForm({...form, start_date: e.target.value})} /></label>
              <label><span className="field-label">End Date</span><input type="date" className="field" value={form.end_date} onChange={e=>setForm({...form, end_date: e.target.value})} /></label>
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full mt-4">{busy ? 'Saving...' : 'Save Prescription'}</button>
          </form>
        )}
      </div>
    </div>
  )
}

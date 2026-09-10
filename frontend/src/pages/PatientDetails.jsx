import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, LoaderCircle, ShieldCheck, Stethoscope, FileText, X } from 'lucide-react'
import { api, getToken, API_URL } from '../api'

function formatDate(value) {
  if (!value) return 'Not submitted'
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function PatientDetails() {
  const { patientId } = useParams()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showConsultation, setShowConsultation] = useState(false)
  const [showPrescription, setShowPrescription] = useState(false)

  async function fetchDetails() {
    setLoading(true)
    setError('')
    try {
      const res = await api(`/doctor/patients/${patientId}`)
      setResult(res)
    } catch (err) {
      setError(err.status === 404 ? 'Patient not found.' : err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetails()
  }, [patientId])

  if (!getToken()) {
    return <main className="mx-auto max-w-2xl px-4 py-14"><div className="panel p-8 text-center"><ShieldCheck className="mx-auto h-10 w-10 text-emerald-700" /><h1 className="mt-4 text-2xl font-black text-slate-950">Practitioner sign-in required</h1><Link className="btn-primary mt-6" to="/dashboard">Go to dashboard</Link></div></main>
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/dashboard" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-950">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      <section className="panel p-5 sm:p-7 bg-emerald-50/50 relative">
        {showConsultation && result && (
          <ConsultationModal 
            patientId={result.patient.id} 
            onClose={() => setShowConsultation(false)} 
            onSuccess={() => fetchDetails()} 
          />
        )}
        {showPrescription && result && (
          <PrescriptionModal 
            patientId={result.patient.id} 
            consultations={result.consultations}
            onClose={() => setShowPrescription(false)} 
            onSuccess={() => fetchDetails()} 
          />
        )}
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-emerald-700" />
              Patient Details
            </h2>
          </div>
        </div>

        {loading && <div className="mt-8 flex items-center gap-2 text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" /> Loading patient data...</div>}
        {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{error}</div>}

        {result && (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <div className="flex flex-col gap-6 lg:flex-row">
              <div className="flex-1 space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-slate-950">{result.patient.name}</h3>
                    <div className="mt-2 text-sm text-slate-500">
                      {result.patient.age} yrs • {result.patient.gender} • {result.patient.blood_group || 'Unknown Blood Group'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-500">Contact</div>
                    <div className="font-medium text-slate-900">{result.patient.contact}</div>
                  </div>
                </div>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm">
                    <div className="text-xs font-black uppercase tracking-wide text-slate-400 mb-1">Diseases</div>
                    <div className="text-sm text-slate-700">{result.patient.existing_diseases || 'None reported'}</div>
                  </div>
                  <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm">
                    <div className="text-xs font-black uppercase tracking-wide text-slate-400 mb-1">Current Medicines</div>
                    <div className="text-sm text-slate-700">{result.patient.current_medicines || 'None reported'}</div>
                  </div>
                </div>
              </div>
              
              <div className="w-full lg:w-80 flex flex-col gap-3">
                <button className="btn-primary w-full" onClick={() => setShowConsultation(true)}>
                  <Stethoscope className="h-4 w-4" /> Add Consultation
                </button>
                <button className="btn-secondary w-full" onClick={() => setShowPrescription(true)}>
                  <FileText className="h-4 w-4" /> Add Prescription
                </button>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-black text-slate-900 mb-4">Past Consultations</h3>
              <div className="space-y-4">
                {!result.consultations.length ? (
                  <p className="text-sm text-slate-500">No consultations yet.</p>
                ) : (
                  result.consultations.map(c => (
                    <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-slate-900">{c.practitioner_name}</div>
                        <div className="text-xs text-slate-500">{formatDate(c.consultation_date)}</div>
                      </div>
                      <div className="text-sm text-slate-700 mb-1"><span className="font-semibold">Symptoms:</span> {c.symptoms}</div>
                      <div className="text-sm text-slate-700"><span className="font-semibold">Diagnosis:</span> {c.diagnosis}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-black text-slate-900 mb-4">Prescriptions</h3>
              <div className="space-y-4">
                {!result.prescriptions.length ? (
                  <p className="text-sm text-slate-500">No prescriptions yet.</p>
                ) : (
                  result.prescriptions.map(p => (
                    <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-slate-900">{p.medicine_name}</div>
                        <div className="flex items-center gap-3">
                          <div className="text-xs text-slate-500">{formatDate(p.created_at)}</div>
                          <a href={`${API_URL}/prescriptions/${p.id}/pdf`} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-700 hover:underline">Download PDF</a>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
                        <div><span className="font-semibold">Dosage:</span> {p.dosage}</div>
                        <div><span className="font-semibold">Frequency:</span> {p.frequency}</div>
                        <div><span className="font-semibold">Duration:</span> {p.duration}</div>
                        <div><span className="font-semibold">Instructions:</span> {p.instructions}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}
      </section>
    </main>
  )
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
                {consultations.map(c => <option key={c.id} value={c.id}>{formatDate(c.consultation_date || c.created_at)} - {c.diagnosis || 'Consultation'}</option>)}
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

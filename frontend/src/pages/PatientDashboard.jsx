import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, LoaderCircle, ClipboardPlus, ShieldCheck, FileText, Pill, CalendarClock } from 'lucide-react'
import { patientApi, setPatientToken, API_URL } from '../api'

export default function PatientDashboard() {
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  const [tab, setTab] = useState('overview')
  const [data, setData] = useState({ timeline: [], consultations: [], prescriptions: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const me = await patientApi('/patient-auth/me')
      setPatient(me)
      const [timeline, consultations, prescriptions] = await Promise.all([
        patientApi(`/patients/${me.id}/timeline`),
        patientApi(`/patients/${me.id}/consultations`),
        patientApi(`/patients/${me.id}/prescriptions`)
      ])
      setData({ timeline, consultations, prescriptions })
    } catch (err) {
      if (err.status === 401) {
        setPatientToken(null)
        navigate('/patient-login')
      }
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    setPatientToken(null)
    navigate('/patient-login')
  }

  if (loading) return <div className="p-10 flex justify-center"><LoaderCircle className="h-8 w-8 animate-spin text-emerald-700" /></div>

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Patient Workspace</div>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Welcome, {patient?.name}</h1>
          <div className="mt-2 flex gap-2">
            <span className="chip">ID: {patient?.id}</span>
            {patient?.abha_number && <span className="chip flex items-center gap-1"><ShieldCheck className="h-3 w-3"/> {patient.abha_number}</span>}
            <span className="chip">{patient?.age} yrs, {patient?.gender}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Link to="/intake" className="btn-primary !min-h-10 !py-2"><ClipboardPlus className="h-4 w-4" /> Start New Intake</Link>
          <button className="btn-secondary !min-h-10 !py-2" onClick={logout}><LogOut className="h-4 w-4" /> Sign Out</button>
        </div>
      </div>

      {error && <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-2">
            {['overview', 'timeline', 'consultations', 'prescriptions'].map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-bold capitalize whitespace-nowrap transition ${tab === t ? 'bg-emerald-100 text-emerald-800' : 'text-slate-600 hover:bg-slate-100'}`}>
                {t}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="panel p-6">
                <h3 className="font-black text-lg mb-4">Personal Info</h3>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <Info label="Email" value={patient.email} />
                  <Info label="Phone" value={patient.contact} />
                  <Info label="Address" value={patient.address} />
                  <Info label="City" value={patient.city} />
                  <Info label="Emergency Contact" value={patient.emergency_contact} />
                </div>
              </div>
              <div className="panel p-6">
                <h3 className="font-black text-lg mb-4">Medical Info</h3>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <Info label="Blood Group" value={patient.blood_group} />
                  <Info label="Existing Diseases" value={patient.existing_diseases} />
                  <Info label="Chronic Conditions" value={patient.chronic_conditions} />
                  <Info label="Allergies" value={patient.allergies} />
                  <Info label="Current Medicines" value={patient.current_medicines} />
                </div>
              </div>
              <div className="panel p-6">
                <h3 className="font-black text-lg mb-4">History</h3>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <Info label="Previous History" value={patient.previous_medical_history} />
                  <Info label="Surgeries" value={patient.previous_surgeries} />
                  <Info label="Family History" value={patient.family_medical_history} />
                </div>
              </div>
            </div>
          )}

          {tab === 'timeline' && (
            <div className="panel p-6">
              <h3 className="font-black text-lg mb-4">Medical Timeline</h3>
              <div className="space-y-4">
                {data.timeline.length ? data.timeline.map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="mt-1"><CalendarClock className="h-5 w-5 text-emerald-600"/></div>
                    <div>
                      <div className="font-bold text-slate-900">{item.title}</div>
                      <div className="text-sm text-slate-500">{new Date(item.date).toLocaleString()}</div>
                      {item.description && <div className="mt-1 text-sm text-slate-700">{item.description}</div>}
                    </div>
                  </div>
                )) : <div className="text-slate-500">No timeline events yet.</div>}
              </div>
            </div>
          )}

          {tab === 'consultations' && (
            <div className="space-y-4">
              {data.consultations.length ? data.consultations.map(c => (
                <div key={c.id} className="panel p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-lg text-slate-900">Dr. {c.doctor_name || 'Practitioner'}</div>
                      <div className="text-sm text-slate-500">{new Date(c.created_at).toLocaleDateString()}</div>
                    </div>
                    <FileText className="text-emerald-700 h-6 w-6"/>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm">
                    <Info label="Symptoms" value={c.symptoms} />
                    <Info label="Diagnosis" value={c.diagnosis} />
                    <Info label="Notes" value={c.notes} />
                    {c.follow_up_date && <Info label="Follow-up" value={new Date(c.follow_up_date).toLocaleDateString()} />}
                  </div>
                </div>
              )) : <div className="panel p-8 text-center text-slate-500">No consultations found.</div>}
            </div>
          )}

          {tab === 'prescriptions' && (
            <div className="space-y-4">
              {data.prescriptions.length ? data.prescriptions.map(p => (
                <div key={p.id} className="panel p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-lg text-slate-900">{p.medicine_name}</div>
                      <div className="text-sm text-slate-500">Prescribed by Dr. {p.practitioner_name || 'Practitioner'}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Pill className="text-emerald-700 h-6 w-6"/>
                      <a href={`${API_URL}/prescriptions/${p.id}/pdf`} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-700 hover:underline">Download PDF</a>
                    </div>
                  </div>
                  <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
                    <Info label="Dosage" value={p.dosage} />
                    <Info label="Frequency" value={p.frequency} />
                    <Info label="Duration" value={p.duration} />
                    <Info label="Status" value={p.status} />
                  </div>
                </div>
              )) : <div className="panel p-8 text-center text-slate-500">No prescriptions found.</div>}
            </div>
          )}
        </div>

        <aside>
          {patient?.abha_number && (
            <div className="rounded-3xl bg-gradient-to-br from-emerald-900 to-slate-900 p-6 text-white shadow-xl">
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-300">DEMO ABHA HEALTH CARD</div>
              <div className="mt-5 text-2xl font-black tracking-widest">{patient.abha_number}</div>
              <div className="mt-4 font-bold text-lg">{patient.name}</div>
              <div className="mt-4 text-xs text-slate-400">SIMULATED — NOT GOVERNMENT ID</div>
            </div>
          )}
        </aside>
      </div>
    </main>
  )
}

function Info({ label, value }) {
  if (!value) return null
  return (
    <div>
      <div className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-slate-700 whitespace-pre-wrap">{value}</div>
    </div>
  )
}

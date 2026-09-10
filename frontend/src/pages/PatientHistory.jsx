import { useEffect, useState } from 'react'
import { ArrowLeft, History, LoaderCircle, TrendingUp } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { api, getToken } from '../api'

export default function PatientHistory() {
  const { patientId } = useParams()
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!getToken()) { setLoading(false); return }
    api(`/patients/${patientId}/case-sheets`)
      .then(setCases)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [patientId])

  if (!getToken()) {
    return <main className="mx-auto max-w-2xl px-4 py-14"><div className="panel p-8 text-center"><History className="mx-auto h-10 w-10 text-emerald-700" /><h1 className="mt-4 text-2xl font-black text-slate-950">Practitioner sign-in required</h1><p className="mt-2 text-slate-600">Visit history is part of the doctor workspace.</p><Link className="btn-primary mt-6" to="/dashboard">Go to dashboard</Link></div></main>
  }

  const patient = cases[0]?.patient
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/dashboard" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-950"><ArrowLeft className="h-4 w-4" /> Doctor dashboard</Link>
      <div className="panel p-6 sm:p-8">
        <div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800"><TrendingUp /></div><div><div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Multi-visit trend view</div><h1 className="mt-1 text-3xl font-black text-slate-950">{patient?.name || `Patient #${patientId}`}</h1><p className="mt-1 text-slate-600">{patient ? `Age ${patient.age} · ${patient.gender} · ${cases.length} visit${cases.length === 1 ? '' : 's'}` : 'Loading history…'}</p></div></div>
        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">This is a simple hackathon-level longitudinal view. It compares submitted intake records; it does not infer improvement, deterioration, diagnosis, or treatment response.</div>

        {loading && <div className="mt-8 flex items-center gap-2 text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" /> Loading visits…</div>}
        {error && <div className="mt-6 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
        <div className="mt-8 space-y-5">
          {cases.map((item, index) => {
            const structured = item.chief_complaint_structured || {}
            const prakriti = item.prakriti_assessment || {}
            return <article key={item.id} className="relative rounded-2xl border border-slate-200 p-5 sm:p-6"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">Visit {cases.length - index}</span><span className="chip">Case #{item.id}</span><span className="chip">{prakriti.dominant_dosha || 'Dosha not recorded'}</span></div><h2 className="mt-3 text-lg font-black text-slate-950">{structured.chief_complaint || item.chief_complaint_raw}</h2></div><div className="text-sm font-medium text-slate-500">{formatDate(item.submitted_at || item.created_at)}</div></div><div className="mt-5 grid gap-4 md:grid-cols-3"><Small label="Duration" value={item.duration} /><Small label="Severity" value={item.severity} /><Small label="Vata / Pitta / Kapha" value={`${prakriti.vata_score || 0} / ${prakriti.pitta_score || 0} / ${prakriti.kapha_score || 0}`} /></div><div className="mt-5 grid gap-4 md:grid-cols-2"><Small label="Sleep" value={item.lifestyle?.sleep || 'Not recorded'} /><Small label="Stress" value={item.lifestyle?.stress || 'Not recorded'} /></div></article>
          })}
          {!loading && !cases.length && <div className="text-slate-500">No visit history found.</div>}
        </div>
      </div>
    </main>
  )
}

function Small({ label, value }) {
  return <div><div className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</div><div className="mt-1 text-sm text-slate-700">{value || 'Not recorded'}</div></div>
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

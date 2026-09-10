import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, LoaderCircle, CheckCircle, AlertTriangle } from 'lucide-react'
import { patientApi } from '../api'

export default function AbhaCreation() {
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadMe()
  }, [])

  async function loadMe() {
    try {
      const me = await patientApi('/patient-auth/me')
      setPatient(me)
    } catch (err) {
      navigate('/patient-login')
    } finally {
      setLoading(false)
    }
  }

  async function generateAbha() {
    setBusy(true)
    setError('')
    try {
      const updated = await patientApi('/patient-auth/abha/generate', { method: 'POST' })
      setPatient(updated)
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="p-10 text-center"><LoaderCircle className="mx-auto h-8 w-8 animate-spin text-emerald-700" /></div>

  if (success) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <div className="panel p-7 sm:p-10 text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-emerald-500 mb-4" />
          <h1 className="text-3xl font-black text-slate-950">ABHA ID Generated!</h1>
          
          <div className="mt-8 rounded-2xl bg-gradient-to-br from-emerald-800 to-teal-900 p-6 text-white text-left shadow-lg">
            <div className="text-sm font-bold uppercase tracking-widest text-emerald-200">Health ID Card</div>
            <div className="mt-6 text-4xl font-black tracking-wider">{patient.abha_number}</div>
            <div className="mt-6 flex justify-between items-end">
              <div>
                <div className="text-xs text-emerald-200">Patient Name</div>
                <div className="font-bold text-lg">{patient.name}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-emerald-200">Patient ID</div>
                <div className="font-bold">{patient.id}</div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-xl p-3">
            <AlertTriangle className="h-5 w-5" />
            <b>DEMO / SIMULATED ABHA ID — NOT A GOVERNMENT ABHA ID</b>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/patient-dashboard" className="btn-secondary">Go to Dashboard</Link>
            <Link to="/intake" className="btn-primary">Start Patient Intake</Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <div className="panel p-7 sm:p-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 mb-4">
          <ShieldCheck className="h-7 w-7" />
        </div>
        
        {patient?.abha_number ? (
          <>
            <h1 className="text-3xl font-black text-slate-950">Your ABHA ID</h1>
            <p className="mt-2 text-slate-600">Your health records are linked to this ID.</p>
            
            <div className="mt-6 rounded-2xl bg-gradient-to-br from-emerald-800 to-teal-900 p-6 text-white text-left shadow-lg">
              <div className="text-sm font-bold uppercase tracking-widest text-emerald-200">Health ID Card</div>
              <div className="mt-6 text-3xl font-black tracking-wider">{patient.abha_number}</div>
              <div className="mt-6 font-bold text-lg">{patient.name}</div>
            </div>

            <div className="mt-8 flex gap-4">
              <Link to="/patient-dashboard" className="btn-primary flex-1">Go to Dashboard</Link>
              <button className="btn-secondary flex-1" onClick={() => alert('Demo: Email Resent')}>Resend ABHA Email</button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-black text-slate-950">Create Your ABHA Health ID</h1>
            <p className="mt-2 text-slate-600">This is a simulated ABHA ID generated for this hackathon application.</p>
            
            <div className="mt-6 rounded-2xl border border-slate-200 p-5 space-y-3 bg-slate-50">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500 block">Name</span><span className="font-bold">{patient?.name}</span></div>
                <div><span className="text-slate-500 block">Email</span><span className="font-bold">{patient?.email}</span></div>
                <div><span className="text-slate-500 block">Age / Gender</span><span className="font-bold">{patient?.age} / {patient?.gender}</span></div>
                <div><span className="text-slate-500 block">Mobile</span><span className="font-bold">{patient?.contact}</span></div>
              </div>
            </div>

            {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>}

            <button onClick={generateAbha} disabled={busy} className="btn-primary w-full mt-6 text-lg">
              {busy && <LoaderCircle className="h-5 w-5 animate-spin" />} Generate ABHA ID
            </button>
          </>
        )}
      </div>
    </main>
  )
}

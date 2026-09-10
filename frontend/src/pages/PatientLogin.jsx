import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HeartPulse, LoaderCircle, ArrowLeft } from 'lucide-react'
import { patientApi, setPatientToken } from '../api'

export default function PatientLogin() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('email') // 'email' | 'abha'
  const [email, setEmail] = useState('')
  const [abha, setAbha] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotMsg, setForgotMsg] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setBusy(true)

    const identifier = tab === 'email' ? email : abha

    try {
      const res = await patientApi('/patient-auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password })
      })
      setPatientToken(res.access_token)
      if (!res.patient.abha_id) {
        navigate('/abha-create')
      } else {
        navigate('/patient-dashboard')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleForgot(e) {
    e.preventDefault()
    setError('')
    setForgotMsg('')
    setBusy(true)
    try {
      const res = await patientApi('/patient-auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      })
      setForgotMsg(res.message)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (forgotMode) {
    return (
      <main className="mx-auto max-w-lg px-4 py-14 sm:px-6">
        <div className="panel p-7 sm:p-9">
          <button onClick={() => { setForgotMode(false); setError(''); setForgotMsg(''); }} className="mb-4 flex items-center text-sm font-semibold text-slate-500 hover:text-slate-800">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to sign in
          </button>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
            <HeartPulse className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-3xl font-black text-slate-950">Reset Password</h1>
          <p className="mt-2 text-slate-600">Enter your registered email and we will send you a temporary password.</p>
          <form className="mt-6 space-y-4" onSubmit={handleForgot}>
            <label>
              <span className="field-label">Email Address</span>
              <input type="email" required className="field" value={email} onChange={e => setEmail(e.target.value)} />
            </label>
            {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>}
            {forgotMsg && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{forgotMsg}</div>}
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy && <LoaderCircle className="h-4 w-4 animate-spin" />} Send Temporary Password
            </button>
          </form>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-14 sm:px-6">
      <div className="panel p-7 sm:p-9">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
          <HeartPulse className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-3xl font-black text-slate-950">Patient Sign In</h1>
        <p className="mt-2 text-slate-600">Access your medical records and consultations.</p>

        <div className="mt-6 flex border-b border-slate-200">
          <button 
            type="button"
            className={`flex-1 pb-3 text-sm font-semibold transition ${tab === 'email' ? 'border-b-2 border-emerald-700 text-emerald-800' : 'text-slate-500 hover:text-slate-800'}`}
            onClick={() => { setTab('email'); setError('') }}
          >
            Email Login
          </button>
          <button 
            type="button"
            className={`flex-1 pb-3 text-sm font-semibold transition ${tab === 'abha' ? 'border-b-2 border-emerald-700 text-emerald-800' : 'text-slate-500 hover:text-slate-800'}`}
            onClick={() => { setTab('abha'); setError('') }}
          >
            ABHA ID Login
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleLogin}>
          {tab === 'email' ? (
            <label>
              <span className="field-label">Email Address</span>
              <input type="email" required className="field" value={email} onChange={e => setEmail(e.target.value)} />
            </label>
          ) : (
            <label>
              <span className="field-label">ABHA Number</span>
              <input required className="field" placeholder="XX-XXXX-XXXX-XXXX" value={abha} onChange={e => setAbha(e.target.value)} />
            </label>
          )}

          <label>
            <div className="flex justify-between">
              <span className="field-label">Password</span>
              <button type="button" onClick={() => { setForgotMode(true); setError(''); setForgotMsg(''); }} className="text-sm font-semibold text-emerald-700 hover:underline">Forgot password?</button>
            </div>
            <input type="password" required className="field" value={password} onChange={e => setPassword(e.target.value)} />
          </label>

          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>}

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy && <LoaderCircle className="h-4 w-4 animate-spin" />} Sign In
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link to="/patient-register" className="font-semibold text-emerald-700 hover:underline">Create new account</Link>
        </div>
      </div>
    </main>
  )
}

import { Activity, ClipboardPlus, LayoutDashboard, Languages, UserCircle, UserPlus } from 'lucide-react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IntakeWizard from './pages/IntakeWizard'
import Dashboard from './pages/Dashboard'
import PatientHistory from './pages/PatientHistory'
import PatientRegister from './pages/PatientRegister'
import PatientLogin from './pages/PatientLogin'
import AbhaCreation from './pages/AbhaCreation'
import PatientDashboard from './pages/PatientDashboard'
import PatientDetails from './pages/PatientDetails'

function Home() {
  const { t } = useTranslation()
  return (
    <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
            <Activity className="h-4 w-4" /> Smart India Hackathon · SIH26047
          </div>
          <h1 className="max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">
            Patient-led intake before the AYUSH consultation begins.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            A self-service case-taking workflow for demographics, complaints, Prakriti/Dosha assessment, document OCR and ABDM-oriented FHIR export.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/intake" className="btn-primary"><ClipboardPlus className="h-5 w-5" /> {t('startIntake')}</Link>
            <Link to="/dashboard" className="btn-secondary"><LayoutDashboard className="h-5 w-5" /> Doctor Dashboard</Link>
            <Link to="/patient-login" className="btn-secondary"><UserCircle className="h-5 w-5" /> Patient Login</Link>
            <Link to="/patient-register" className="btn-secondary"><UserPlus className="h-5 w-5" /> Register as Patient</Link>
          </div>
          <p className="mt-5 text-sm text-slate-500">Demo uses fictional patient personas only. ABHA verification is mocked; AI is decision-support and never diagnosis.</p>
        </div>
        <div className="panel overflow-hidden p-6 sm:p-8">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 p-7 text-white">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-100">Clinic handoff</p>
            <h2 className="mt-3 text-2xl font-bold">From raw patient story to structured case sheet</h2>
            <div className="mt-6 space-y-3">
              {['Patient completes intake', 'OCR reduces typing', 'AI structures without diagnosing', 'Doctor reviews concise highlights', 'FHIR JSON demonstrates interoperability'].map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white font-black text-emerald-800">{index + 1}</span>
                  <span className="font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default function App() {
  const { t, i18n } = useTranslation()
  const toggleLanguage = () => i18n.changeLanguage(i18n.language === 'en' ? 'hi' : 'en')
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white"><Activity /></div>
            <div className="min-w-0">
              <div className="truncate font-extrabold text-slate-950">{t('appName')}</div>
              <div className="truncate text-xs text-slate-500">{t('demoOnly')}</div>
            </div>
          </Link>
          <nav className="flex items-center gap-2">
            <Link className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 sm:block" to="/intake">{t('intake')}</Link>
            <Link className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 sm:block" to="/patient-login">Patient Portal</Link>
            <Link className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 sm:block" to="/dashboard">{t('dashboard')}</Link>
            <button onClick={toggleLanguage} className="btn-secondary !min-h-10 !rounded-xl !px-3 !py-2 text-sm"><Languages className="h-4 w-4" /> {i18n.language === 'en' ? 'हिंदी' : 'English'}</button>
          </nav>
        </div>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/intake" element={<IntakeWizard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/patients/:patientId" element={<PatientHistory />} />
        <Route path="/doctor/patients/:patientId" element={<PatientDetails />} />
        <Route path="/patient-register" element={<PatientRegister />} />
        <Route path="/patient-login" element={<PatientLogin />} />
        <Route path="/abha-create" element={<AbhaCreation />} />
        <Route path="/patient-dashboard" element={<PatientDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

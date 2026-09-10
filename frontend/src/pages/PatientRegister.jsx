import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus, Mail, Phone, Shield, Heart, LoaderCircle } from 'lucide-react'
import { patientApi, setPatientToken } from '../api'

export default function PatientRegister() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', email: '', mobile: '', dob: '', age: '', gender: '',
    blood_group: '', preferred_language: 'English', address: '', city: '',
    emergency_contact: '', existing_diseases: '', chronic_conditions: '',
    allergies: '', current_medicines: '', previous_medical_history: '',
    previous_surgeries: '', family_medical_history: '', password: '', confirm_password: ''
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.password.length < 6) return setError('Password must be at least 6 characters.')
    if (form.password !== form.confirm_password) return setError('Passwords do not match.')
    if (!form.name || !form.email || !form.mobile || !form.age || !form.gender) {
      return setError('Please fill all required fields.')
    }

    setBusy(true)
    try {
      const payload = {
        ...form,
        contact: form.mobile,
        date_of_birth: form.dob
      }
      const res = await patientApi('/patient-auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      setPatientToken(res.access_token) // API returns { access_token }
      navigate('/abha-create')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="panel p-6 sm:p-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
          <UserPlus className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-3xl font-black text-slate-950">Patient Registration</h1>
        <p className="mt-2 text-slate-600">Create your patient portal account to manage consultations and records.</p>
        
        {error && <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{error}</div>}

        <form className="mt-8 space-y-10" onSubmit={handleSubmit}>
          {/* Section 1 */}
          <section>
            <div className="mb-5">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Section 1</div>
              <h2 className="mt-2 text-2xl font-black text-slate-950">Personal Information</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <label><span className="field-label">Full Name *</span><input className="field" required value={form.name} onChange={e => update('name', e.target.value)} /></label>
              <label><span className="field-label">Email Address *</span><input type="email" className="field" required value={form.email} onChange={e => update('email', e.target.value)} /></label>
              <label><span className="field-label">Mobile Number *</span><input type="tel" className="field" required maxLength="10" pattern="\d{10}" placeholder="10-digit number" value={form.mobile} onChange={e => update('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))} /></label>
              <label><span className="field-label">Date of Birth</span><input type="date" className="field" value={form.dob} onChange={e => update('dob', e.target.value)} /></label>
              <label><span className="field-label">Age *</span><input type="number" min="0" className="field" required value={form.age} onChange={e => update('age', e.target.value)} /></label>
              <label><span className="field-label">Gender *</span><select className="field" required value={form.gender} onChange={e => update('gender', e.target.value)}><option value="">Select</option><option value="Female">Female</option><option value="Male">Male</option><option value="Other">Other</option><option value="Prefer not to say">Prefer not to say</option></select></label>
              <label><span className="field-label">Blood Group</span><select className="field" value={form.blood_group} onChange={e => update('blood_group', e.target.value)}><option value="">Select</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option><option>Unknown</option></select></label>
              <label><span className="field-label">Preferred Language</span><select className="field" value={form.preferred_language} onChange={e => update('preferred_language', e.target.value)}><option>English</option><option>Hindi</option><option>Marathi</option><option>Tamil</option><option>Telugu</option><option>Kannada</option></select></label>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <div className="mb-5">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Section 2</div>
              <h2 className="mt-2 text-2xl font-black text-slate-950">Contact & Address</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="md:col-span-2"><span className="field-label">Address</span><textarea className="field" value={form.address} onChange={e => update('address', e.target.value)} /></label>
              <label><span className="field-label">City</span><input className="field" value={form.city} onChange={e => update('city', e.target.value)} /></label>
              <label><span className="field-label">Emergency Contact</span><input type="tel" className="field" maxLength="10" placeholder="10-digit number" value={form.emergency_contact} onChange={e => update('emergency_contact', e.target.value.replace(/\D/g, '').slice(0, 10))} /></label>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <div className="mb-5">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Section 3</div>
              <h2 className="mt-2 text-2xl font-black text-slate-950">Medical History</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <label><span className="field-label">Existing Diseases</span><textarea className="field" placeholder="e.g. Diabetes, Hypertension..." value={form.existing_diseases} onChange={e => update('existing_diseases', e.target.value)} /></label>
              <label><span className="field-label">Chronic Conditions</span><textarea className="field" value={form.chronic_conditions} onChange={e => update('chronic_conditions', e.target.value)} /></label>
              <label><span className="field-label">Allergies</span><textarea className="field" placeholder="e.g. Penicillin, Dust..." value={form.allergies} onChange={e => update('allergies', e.target.value)} /></label>
              <label><span className="field-label">Current Medicines</span><textarea className="field" value={form.current_medicines} onChange={e => update('current_medicines', e.target.value)} /></label>
              <label><span className="field-label">Previous Medical History</span><textarea className="field" value={form.previous_medical_history} onChange={e => update('previous_medical_history', e.target.value)} /></label>
              <label><span className="field-label">Previous Surgeries</span><textarea className="field" value={form.previous_surgeries} onChange={e => update('previous_surgeries', e.target.value)} /></label>
              <label className="md:col-span-2"><span className="field-label">Family Medical History</span><textarea className="field" value={form.family_medical_history} onChange={e => update('family_medical_history', e.target.value)} /></label>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <div className="mb-5">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Section 4</div>
              <h2 className="mt-2 text-2xl font-black text-slate-950">Account Security</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <label><span className="field-label">Password *</span><input type="password" required className="field" value={form.password} onChange={e => update('password', e.target.value)} /></label>
              <label><span className="field-label">Confirm Password *</span><input type="password" required className="field" value={form.confirm_password} onChange={e => update('confirm_password', e.target.value)} /></label>
            </div>
          </section>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-slate-200 pt-6">
            <Link to="/patient-login" className="text-sm font-semibold text-emerald-700 hover:underline">Already have an account? Sign in</Link>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Register
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export function getToken() {
  return localStorage.getItem('ayush_practitioner_token')
}

export function setToken(token) {
  if (token) localStorage.setItem('ayush_practitioner_token', token)
  else localStorage.removeItem('ayush_practitioner_token')
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {})
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_URL}${path}`, { ...options, headers })
  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text()
  if (!response.ok) {
    const error = new Error(payload?.detail || payload || `Request failed (${response.status})`)
    error.status = response.status
    throw error
  }
  return payload
}

export async function uploadFile(path, file) {
  const form = new FormData()
  form.append('file', file)
  return api(path, { method: 'POST', body: form })
}

export async function downloadFHIR(caseId) {
  const data = await api(`/case-sheets/${caseId}/fhir`)
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `case-sheet-${caseId}-fhir.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

// Patient auth helpers
export function getPatientToken() {
  return localStorage.getItem('ayush_patient_token')
}

export function setPatientToken(token) {
  if (token) localStorage.setItem('ayush_patient_token', token)
  else localStorage.removeItem('ayush_patient_token')
}

export async function patientApi(path, options = {}) {
  const headers = new Headers(options.headers || {})
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getPatientToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${API_URL}${path}`, { ...options, headers })
  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text()
  if (!response.ok) {
    const error = new Error(payload?.detail || payload || `Request failed (${response.status})`)
    error.status = response.status
    throw error
  }
  return payload
}

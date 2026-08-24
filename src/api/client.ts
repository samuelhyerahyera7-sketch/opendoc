export type Specialty = { name: string; icon: string }

export type InsuranceStat = { name: string; count: number; isCash: boolean }

export type ApiDoctor = {
  id: string
  name: string
  credentials: string
  specialty: string
  photo: string
  address: string
  city: string
  lat: number | null
  lng: number | null
  distanceKm: number | null
  bio: string
  education: string[]
  languages: string[]
  acceptingNew: boolean
  acceptsCash: boolean
  rating: number
  reviewCount: number
  verificationStatus: 'pending' | 'verified' | 'rejected'
  insurances: string[]
  slots: { id: number; day: string; time: string }[]
  email?: string
  hpcsaNumber?: string
  emailVerified?: boolean
}

export type Review = { patient_name: string; rating: number; comment: string; created_at: string }

export type Appointment = {
  id: string
  doctor_id: string
  slot_id: number
  patient_first_name: string
  patient_last_name: string
  patient_email: string
  patient_phone: string
  reason: string
  new_patient: number
  day_label: string
  time_label: string
  status: string
  review_token: string
  created_at: string
}

export type PatientFile = {
  id: string
  uploading_doctor_id: string
  patient_first_name: string
  patient_last_name: string
  patient_email: string
  original_name: string
  mime_type: string
  size_bytes: number
  note: string
  created_at: string
}

export type ReceivedFile = PatientFile & {
  transfer_id: string
  message: string
  status: string
  transferred_at: string
  from_doctor_name: string
  from_doctor_specialty: string
}

export type DirectoryDoctor = {
  id: string
  name: string
  credentials: string
  specialty: string
  email: string
  photo: string
}

class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) {
    let message = res.statusText
    try {
      const body = await res.json()
      message = body.error || message
    } catch {
      // ignore
    }
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` }
}

export const api = {
  getSpecialties: () => request<Specialty[]>('/specialties'),
  getInsurances: () => request<string[]>('/insurances'),
  getMedicalAids: () => request<string[]>('/medical-aids'),
  getInsuranceStats: () => request<InsuranceStat[]>('/insurances/stats'),

  searchDoctors: (params: {
    q?: string
    insurance?: string
    specialty?: string
    acceptingOnly?: boolean
    sort?: string
    lat?: number
    lng?: number
    radiusKm?: number
  }) => {
    const search = new URLSearchParams()
    if (params.q) search.set('q', params.q)
    if (params.insurance) search.set('insurance', params.insurance)
    if (params.specialty) search.set('specialty', params.specialty)
    if (params.acceptingOnly) search.set('acceptingOnly', 'true')
    if (params.sort) search.set('sort', params.sort)
    if (params.lat !== undefined) search.set('lat', String(params.lat))
    if (params.lng !== undefined) search.set('lng', String(params.lng))
    if (params.radiusKm !== undefined) search.set('radiusKm', String(params.radiusKm))
    return request<ApiDoctor[]>(`/doctors?${search.toString()}`)
  },

  getDoctor: (id: string) => request<ApiDoctor>(`/doctors/${id}`),

  registerDoctor: (payload: {
    name: string
    credentials: string
    specialty: string
    email: string
    password: string
    hpcsaNumber: string
    address?: string
    city?: string
    lat?: number
    lng?: number
    bio?: string
    insurances?: string[]
    acceptsCash?: boolean
  }) =>
    request<{ token: string; doctor: ApiDoctor }>('/doctors/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  loginDoctor: (email: string, password: string) =>
    request<{ token: string; doctor: ApiDoctor }>('/doctors/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMyProfile: (token: string) => request<ApiDoctor>('/doctors/me', { headers: authHeaders(token) }),

  updateMyProfile: (
    token: string,
    payload: Partial<{
      bio: string
      address: string
      city: string
      lat: number
      lng: number
      acceptingNew: boolean
      acceptsCash: boolean
      insurances: string[]
    }>,
  ) =>
    request<ApiDoctor>('/doctors/me', {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),

  bookAppointment: (payload: {
    doctorId: string
    slotId: number
    firstName: string
    lastName: string
    email: string
    phone: string
    reason?: string
    newPatient?: boolean
  }) => request<Appointment & { emailSent: boolean }>('/appointments', { method: 'POST', body: JSON.stringify(payload) }),

  getMyAppointments: (token: string) => request<Appointment[]>('/doctors/me/appointments', { headers: authHeaders(token) }),

  addSlot: (token: string, day: string, time: string) =>
    request<{ id: number; day: string; time: string }>('/doctors/me/slots', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ day, time }),
    }),

  deleteSlot: (token: string, id: number) =>
    request<void>(`/doctors/me/slots/${id}`, { method: 'DELETE', headers: authHeaders(token) }),

  getMyFiles: (token: string) => request<PatientFile[]>('/doctors/me/files', { headers: authHeaders(token) }),

  getReceivedFiles: (token: string) => request<ReceivedFile[]>('/doctors/me/files/received', { headers: authHeaders(token) }),

  uploadFile: (token: string, formData: FormData) =>
    request<PatientFile>('/doctors/me/files', { method: 'POST', headers: authHeaders(token), body: formData }),

  transferFile: (token: string, fileId: string, toDoctorId: string, message?: string) =>
    request<{ id: string }>(`/files/${fileId}/transfer`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ toDoctorId, message }),
    }),

  searchDirectory: (token: string, q: string) =>
    request<DirectoryDoctor[]>(`/doctors/directory/search?q=${encodeURIComponent(q)}`, { headers: authHeaders(token) }),

  downloadFileUrl: (fileId: string) => `/api/files/${fileId}/download`,

  getDoctorReviews: (doctorId: string) => request<Review[]>(`/doctors/${doctorId}/reviews`),

  getReviewTarget: (token: string) =>
    request<{ doctorId: string; doctorName: string; patientFirstName: string; alreadyReviewed: boolean }>(`/appointments/review/${token}`),

  submitReview: (token: string, rating: number, comment: string) =>
    request<{ ok: true }>(`/appointments/review/${token}`, { method: 'POST', body: JSON.stringify({ rating, comment }) }),

  verifyEmail: (token: string) => request<{ ok: true }>(`/doctors/verify-email?token=${encodeURIComponent(token)}`),

  resendVerification: (authToken: string) =>
    request<{ ok: true; emailSent?: boolean; alreadyVerified?: boolean }>('/doctors/resend-verification', {
      method: 'POST',
      headers: authHeaders(authToken),
    }),

  forgotPassword: (email: string) =>
    request<{ ok: true }>('/doctors/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  resetPassword: (token: string, password: string) =>
    request<{ ok: true }>('/doctors/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),

  admin: {
    getPendingDoctors: (adminToken: string) => request<ApiDoctor[]>('/admin/doctors/pending', { headers: authHeaders(adminToken) }),
    getAllDoctors: (adminToken: string) => request<ApiDoctor[]>('/admin/doctors', { headers: authHeaders(adminToken) }),
    verifyDoctor: (adminToken: string, doctorId: string) =>
      request<ApiDoctor>(`/admin/doctors/${doctorId}/verify`, { method: 'POST', headers: authHeaders(adminToken) }),
    rejectDoctor: (adminToken: string, doctorId: string) =>
      request<ApiDoctor>(`/admin/doctors/${doctorId}/reject`, { method: 'POST', headers: authHeaders(adminToken) }),
    deleteDoctor: (adminToken: string, doctorId: string) =>
      request<void>(`/admin/doctors/${doctorId}`, { method: 'DELETE', headers: authHeaders(adminToken) }),
  },
}

export { ApiError }

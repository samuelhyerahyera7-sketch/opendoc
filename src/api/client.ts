export type AdminIdentity = { id: string; email: string; role: 'super_admin' | 'verification_admin' | 'support_admin' }

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
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'suspended'
  insurances: string[]
  slots: { id: number; day: string; time: string; date?: string | null }[]
  email?: string
  hpcsaNumber?: string
  emailVerified?: boolean
  verifiedAt?: string | null
  verificationNotes?: string | null
  rejectionReason?: string | null
  lastVerificationAt?: string | null
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
  patient_id?: string | null
  proposed_slot_id?: number | null
  proposed_day_label?: string | null
  proposed_time_label?: string | null
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

export type Notification = {
  id: string
  doctor_id: string
  type: string
  title: string
  body: string
  link: string | null
  read_at: string | null
  created_at: string
}

export type Patient = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  emailVerified: boolean
}

export type PatientAppointment = Appointment & {
  doctor_name: string
  doctor_credentials: string
  doctor_specialty: string
  doctor_photo: string
  doctor_address: string
}

export type PatientNotification = {
  id: string
  patient_id: string
  type: string
  title: string
  body: string
  link: string | null
  read_at: string | null
  created_at: string
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
    // Harmless for the doctor/patient bearer-token endpoints (they don't
    // rely on cookies); required for the admin endpoints, which authenticate
    // via a secure HttpOnly session cookie rather than a token in JS.
    credentials: 'include',
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
    language?: string
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
    if (params.language) search.set('language', params.language)
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
      languages: string[]
    }>,
  ) =>
    request<ApiDoctor>('/doctors/me', {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),

  uploadDoctorPhoto: (token: string, file: File) => {
    const formData = new FormData()
    formData.append('photo', file)
    return request<ApiDoctor>('/doctors/me/photo', { method: 'POST', headers: authHeaders(token), body: formData })
  },

  bookAppointment: (
    payload: {
      doctorId: string
      slotId: number
      firstName: string
      lastName: string
      email: string
      phone: string
      reason?: string
      newPatient?: boolean
    },
    patientToken: string,
  ) =>
    request<Appointment & { emailSent: boolean }>('/appointments', {
      method: 'POST',
      headers: authHeaders(patientToken),
      body: JSON.stringify(payload),
    }),

  getMyAppointments: (token: string) => request<Appointment[]>('/doctors/me/appointments', { headers: authHeaders(token) }),

  cancelAppointment: (token: string, appointmentId: string) =>
    request<{ ok: true }>(`/appointments/${appointmentId}/cancel`, { method: 'POST', headers: authHeaders(token) }),

  rescheduleAppointment: (token: string, appointmentId: string, newSlotId: number) =>
    request<Appointment>(`/appointments/${appointmentId}/reschedule`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ newSlotId }),
    }),

  proposeReschedule: (token: string, appointmentId: string, newSlotId: number) =>
    request<Appointment>(`/appointments/${appointmentId}/propose-reschedule`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ newSlotId }),
    }),

  withdrawReschedule: (token: string, appointmentId: string) =>
    request<{ ok: true }>(`/appointments/${appointmentId}/withdraw-reschedule`, { method: 'POST', headers: authHeaders(token) }),

  approveReschedule: (token: string, appointmentId: string) =>
    request<Appointment>(`/appointments/${appointmentId}/approve-reschedule`, { method: 'POST', headers: authHeaders(token) }),

  declineReschedule: (token: string, appointmentId: string) =>
    request<{ ok: true }>(`/appointments/${appointmentId}/decline-reschedule`, { method: 'POST', headers: authHeaders(token) }),

  addSlot: (token: string, day: string, time: string, date?: string) =>
    request<{ id: number; day: string; time: string; date: string | null }>('/doctors/me/slots', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ day, time, date }),
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

  getNotifications: (token: string) => request<Notification[]>('/doctors/me/notifications', { headers: authHeaders(token) }),

  getUnreadNotificationCount: (token: string) =>
    request<{ count: number }>('/doctors/me/notifications/unread-count', { headers: authHeaders(token) }),

  markNotificationRead: (token: string, id: string) =>
    request<void>(`/doctors/me/notifications/${id}/read`, { method: 'POST', headers: authHeaders(token) }),

  markAllNotificationsRead: (token: string) =>
    request<void>('/doctors/me/notifications/read-all', { method: 'POST', headers: authHeaders(token) }),

  registerPatient: (payload: { firstName: string; lastName: string; email: string; password: string; phone?: string }) =>
    request<{ token: string; patient: Patient }>('/patients/register', { method: 'POST', body: JSON.stringify(payload) }),

  loginPatient: (email: string, password: string) =>
    request<{ token: string; patient: Patient }>('/patients/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  getMyPatientProfile: (token: string) => request<Patient>('/patients/me', { headers: authHeaders(token) }),

  getMyPatientAppointments: (token: string) =>
    request<PatientAppointment[]>('/patients/me/appointments', { headers: authHeaders(token) }),

  getPatientNotifications: (token: string) =>
    request<PatientNotification[]>('/patients/me/notifications', { headers: authHeaders(token) }),

  getPatientUnreadNotificationCount: (token: string) =>
    request<{ count: number }>('/patients/me/notifications/unread-count', { headers: authHeaders(token) }),

  markPatientNotificationRead: (token: string, id: string) =>
    request<void>(`/patients/me/notifications/${id}/read`, { method: 'POST', headers: authHeaders(token) }),

  markAllPatientNotificationsRead: (token: string) =>
    request<void>('/patients/me/notifications/read-all', { method: 'POST', headers: authHeaders(token) }),

  verifyPatientEmail: (token: string) => request<{ ok: true }>(`/patients/verify-email?token=${encodeURIComponent(token)}`),

  resendPatientVerification: (authToken: string) =>
    request<{ ok: true; emailSent?: boolean; alreadyVerified?: boolean }>('/patients/resend-verification', {
      method: 'POST',
      headers: authHeaders(authToken),
    }),

  forgotPatientPassword: (email: string) =>
    request<{ ok: true }>('/patients/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  resetPatientPassword: (token: string, password: string) =>
    request<{ ok: true }>('/patients/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),

  admin: {
    // Admin auth is a secure HttpOnly session cookie set by the server on
    // login — there is no token for client code to hold or attach.
    login: (email: string, password: string) =>
      request<AdminIdentity>('/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    logout: () => request<{ ok: true }>('/admin/logout', { method: 'POST' }),
    me: () => request<AdminIdentity>('/admin/me'),
    getPendingDoctors: () => request<ApiDoctor[]>('/admin/doctors/pending'),
    getAllDoctors: () => request<ApiDoctor[]>('/admin/doctors'),
    verifyDoctor: (doctorId: string, notes?: string) =>
      request<ApiDoctor>(`/admin/doctors/${doctorId}/verify`, { method: 'POST', body: JSON.stringify({ notes }) }),
    rejectDoctor: (doctorId: string, reason?: string) =>
      request<ApiDoctor>(`/admin/doctors/${doctorId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
    suspendDoctor: (doctorId: string, reason?: string) =>
      request<ApiDoctor>(`/admin/doctors/${doctorId}/suspend`, { method: 'POST', body: JSON.stringify({ reason }) }),
    reactivateDoctor: (doctorId: string) =>
      request<ApiDoctor>(`/admin/doctors/${doctorId}/reactivate`, { method: 'POST' }),
    deleteDoctor: (doctorId: string) => request<void>(`/admin/doctors/${doctorId}`, { method: 'DELETE' }),
  },
}

export { ApiError }

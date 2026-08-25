import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, type Patient } from '../api/client'

type PatientAuthState = {
  token: string | null
  patient: Patient | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: Parameters<typeof api.registerPatient>[0]) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}

const STORAGE_KEY = 'opendoc.patient.token'

const PatientAuthContext = createContext<PatientAuthState | null>(null)

export function PatientAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY))
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const current = localStorage.getItem(STORAGE_KEY)
    if (!current) {
      setPatient(null)
      setLoading(false)
      return
    }
    try {
      const profile = await api.getMyPatientProfile(current)
      setPatient(profile)
    } catch {
      localStorage.removeItem(STORAGE_KEY)
      setToken(null)
      setPatient(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    const { token: newToken, patient: newPatient } = await api.loginPatient(email, password)
    localStorage.setItem(STORAGE_KEY, newToken)
    setToken(newToken)
    setPatient(newPatient)
  }, [])

  const register = useCallback(async (payload: Parameters<typeof api.registerPatient>[0]) => {
    const { token: newToken, patient: newPatient } = await api.registerPatient(payload)
    localStorage.setItem(STORAGE_KEY, newToken)
    setToken(newToken)
    setPatient(newPatient)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setToken(null)
    setPatient(null)
  }, [])

  return (
    <PatientAuthContext.Provider value={{ token, patient, loading, login, register, logout, refresh }}>
      {children}
    </PatientAuthContext.Provider>
  )
}

export function usePatientAuth() {
  const ctx = useContext(PatientAuthContext)
  if (!ctx) throw new Error('usePatientAuth must be used within PatientAuthProvider')
  return ctx
}

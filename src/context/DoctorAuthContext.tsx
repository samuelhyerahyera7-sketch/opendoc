import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, type ApiDoctor } from '../api/client'

type DoctorAuthState = {
  token: string | null
  doctor: ApiDoctor | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: Parameters<typeof api.registerDoctor>[0]) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}

const STORAGE_KEY = 'opendoc.doctor.token'

const DoctorAuthContext = createContext<DoctorAuthState | null>(null)

export function DoctorAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY))
  const [doctor, setDoctor] = useState<ApiDoctor | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const current = localStorage.getItem(STORAGE_KEY)
    if (!current) {
      setDoctor(null)
      setLoading(false)
      return
    }
    try {
      const profile = await api.getMyProfile(current)
      setDoctor(profile)
    } catch {
      localStorage.removeItem(STORAGE_KEY)
      setToken(null)
      setDoctor(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    const { token: newToken, doctor: newDoctor } = await api.loginDoctor(email, password)
    localStorage.setItem(STORAGE_KEY, newToken)
    setToken(newToken)
    setDoctor(newDoctor)
  }, [])

  const register = useCallback(async (payload: Parameters<typeof api.registerDoctor>[0]) => {
    const { token: newToken, doctor: newDoctor } = await api.registerDoctor(payload)
    localStorage.setItem(STORAGE_KEY, newToken)
    setToken(newToken)
    setDoctor(newDoctor)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setToken(null)
    setDoctor(null)
  }, [])

  return (
    <DoctorAuthContext.Provider value={{ token, doctor, loading, login, register, logout, refresh }}>
      {children}
    </DoctorAuthContext.Provider>
  )
}

export function useDoctorAuth() {
  const ctx = useContext(DoctorAuthContext)
  if (!ctx) throw new Error('useDoctorAuth must be used within DoctorAuthProvider')
  return ctx
}

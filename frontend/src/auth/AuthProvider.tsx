import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { currentUserRequest, loginRequest, logoutRequest } from '../api/auth'
import { ApiError, getErrorMessage, setUnauthorizedHandler } from '../api/client'
import { tokenStorage } from './tokenStorage'
import { panelRole } from './roles'
import type { Usuario } from './roles'
import { AuthContext, type AuthContextValue } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [patientRejected, setPatientRejected] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)

  const clearLocalSession = useCallback(() => {
    tokenStorage.clear()
    setUser(null)
  }, [])

  const signOut = useCallback(async () => {
    try {
      await logoutRequest()
    } finally {
      clearLocalSession()
      navigate('/login', { replace: true })
    }
  }, [clearLocalSession, navigate])

  const rejectPatient = useCallback(async () => {
    setPatientRejected(true)
    try {
      await logoutRequest()
    } finally {
      clearLocalSession()
      navigate('/login', { replace: true })
    }
  }, [clearLocalSession, navigate])

  const signIn = useCallback(async (correo: string, contraseña: string) => {
    setSessionError(null)
    const result = await loginRequest(correo, contraseña)
    if (!result.token || !result.usuario) throw new Error('La respuesta de inicio de sesión está incompleta.')
    tokenStorage.set(result.token)
    setUser(result.usuario)
    return result.usuario
  }, [])

  useEffect(() => {
    const removeUnauthorizedHandler = setUnauthorizedHandler(() => {
      const hadSession = tokenStorage.get() !== null
      clearLocalSession()
      if (hadSession) setSessionError('Tu sesión venció. Inicia sesión nuevamente.')
      navigate('/login', { replace: true })
    })
    return removeUnauthorizedHandler
  }, [clearLocalSession, navigate])

  useEffect(() => {
    let active = true
    const restore = async () => {
      const token = tokenStorage.get()
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const currentUser = await currentUserRequest()
        if (!active) return
        if (!panelRole(currentUser.rol)) {
          setPatientRejected(true)
          try {
            await logoutRequest()
          } catch (error) {
            if (active) setSessionError(getErrorMessage(error))
          } finally {
            if (active) clearLocalSession()
          }
          return
        }
        setUser(currentUser)
      } catch (error) {
        if (!active) return
        if (error instanceof ApiError && error.status === 401) clearLocalSession()
        else setSessionError(getErrorMessage(error))
      } finally {
        if (active) setLoading(false)
      }
    }
    void restore()
    return () => {
      active = false
    }
  }, [clearLocalSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      patientRejected,
      sessionError,
      signIn,
      signOut,
      rejectPatient,
      clearPatientNotice: () => setPatientRejected(false),
    }),
    [user, loading, patientRejected, sessionError, signIn, signOut, rejectPatient],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

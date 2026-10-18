import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { currentUserRequest, loginRequest, logoutRequest } from '../api/auth'
import { ApiError, getErrorMessage, setUnauthorizedHandler } from '../api/client'
import { tokenStorage } from './tokenStorage'
import { homeForRole } from './roles'
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

  const rejectUnsupportedRole = useCallback(async () => {
    const message = 'No reconocemos el rol de esta cuenta. La sesión se cerró; contacta al administrador.'
    setSessionError(message)
    try {
      await logoutRequest()
    } catch (error) {
      setSessionError(`${message} ${getErrorMessage(error)}`)
    } finally {
      clearLocalSession()
    }
  }, [clearLocalSession])

  const signIn = useCallback(async (correo: string, contraseña: string) => {
    setSessionError(null)
    const result = await loginRequest(correo, contraseña)
    if (!result.token || !result.usuario) throw new Error('La respuesta de inicio de sesión está incompleta.')
    tokenStorage.set(result.token)
    if (homeForRole(result.usuario.rol)) {
      setUser(result.usuario)
    } else if (result.usuario.rol !== 'Paciente') {
      await rejectUnsupportedRole()
      const message = 'No reconocemos el rol de esta cuenta. La sesión se cerró; contacta al administrador.'
      throw new Error(message)
    }
    return result.usuario
  }, [rejectUnsupportedRole])

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
        if (!homeForRole(currentUser.rol)) {
          if (currentUser.rol === 'Paciente') {
            setPatientRejected(true)
            try {
              await logoutRequest()
            } catch (error) {
              if (active) setSessionError(getErrorMessage(error))
            } finally {
              if (active) clearLocalSession()
            }
          } else if (active) {
            await rejectUnsupportedRole()
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
  }, [clearLocalSession, rejectUnsupportedRole])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      patientRejected,
      sessionError,
      signIn,
      signOut,
      rejectPatient,
      rejectUnsupportedRole,
      clearPatientNotice: () => setPatientRejected(false),
    }),
    [user, loading, patientRejected, sessionError, signIn, signOut, rejectPatient, rejectUnsupportedRole],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

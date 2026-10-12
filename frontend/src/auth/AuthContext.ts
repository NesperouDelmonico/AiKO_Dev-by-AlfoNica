import { createContext, useContext } from 'react'
import type { Usuario } from './roles'

export type AuthContextValue = {
  user: Usuario | null
  loading: boolean
  patientRejected: boolean
  sessionError: string | null
  signIn: (correo: string, contraseña: string) => Promise<Usuario>
  signOut: () => Promise<void>
  rejectPatient: () => Promise<void>
  clearPatientNotice: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.')
  return context
}

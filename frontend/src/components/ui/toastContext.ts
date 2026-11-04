import { createContext, useContext } from 'react'

export type ToastInput = { type: 'success' | 'error'; message: string; mascot?: boolean }
export type ToastRecord = ToastInput & { id: number }
export type ToastContextValue = { notify: (toast: ToastInput) => void; dismiss: (id: number) => void }

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast debe usarse dentro de ToastProvider.')
  return context
}

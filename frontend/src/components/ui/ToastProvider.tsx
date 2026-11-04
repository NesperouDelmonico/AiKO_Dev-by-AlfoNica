import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Mascot } from './Mascot'
import { ToastContext, type ToastInput, type ToastRecord } from './toastContext'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])
  const notify = useCallback((toast: ToastInput) => {
    setToasts((current) => [...current, { ...toast, id: Date.now() + Math.random() }])
  }, [])
  const value = useMemo(() => ({ notify, dismiss }), [dismiss, notify])

  return (
    <ToastContext.Provider value={value}>
      <div
        className="toast-region pointer-events-none fixed bottom-4 right-4 z-[100] mx-auto flex max-h-[45vh] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-y-auto sm:mx-0"
        role="region"
        aria-label="Notificaciones"
        aria-live="polite"
        aria-relevant="additions text"
        aria-atomic="false"
      >
        {toasts.length > 0 && (
          <div className="flex flex-col gap-2">
            {toasts.map((toast) => (
              <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
            ))}
          </div>
        )}
      </div>
      {children}
    </ToastContext.Provider>
  )
}

function Toast({ toast, onDismiss }: { toast: ToastRecord; onDismiss: (id: number) => void }) {
  const isSuccess = toast.type === 'success'
  const onClose = useCallback(() => onDismiss(toast.id), [onDismiss, toast.id])

  useEffect(() => {
    if (!isSuccess) return
    const timer = window.setTimeout(onClose, 6000)
    return () => window.clearTimeout(timer)
  }, [isSuccess, onClose])

  return (
    <div
      role={isSuccess ? 'status' : 'alert'}
      className={cn(
        'toast-enter pointer-events-auto flex items-center gap-3 rounded-2xl border p-3 text-sm [box-shadow:var(--shadow-toast)]',
        isSuccess
          ? 'border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success-text)]'
          : 'border-[var(--color-attention-border)] bg-[var(--color-attention-bg)] text-[var(--color-attention-text)]',
      )}
    >
      {toast.mascot && <Mascot className="size-12 rounded-xl" />}
      <p className="mb-0 min-w-0 flex-1 font-medium">{toast.message}</p>
      <button
        type="button"
        className="inline-grid size-10 shrink-0 place-items-center rounded-lg text-current transition-colors duration-150 hover:bg-black/5"
        aria-label="Cerrar aviso"
        onClick={onClose}
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  )
}

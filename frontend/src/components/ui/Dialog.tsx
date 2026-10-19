import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function Dialog({
  title,
  description,
  onClose,
  children,
}: {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog.showModal()
    dialog.querySelector<HTMLElement>(
      '[autofocus], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    )?.focus()
    return () => {
      if (dialog.open) dialog.close()
      if (openerRef.current?.isConnected) openerRef.current.focus()
    }
  }, [])

  return createPortal(
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      aria-describedby={description ? 'dialog-description' : undefined}
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      className="fixed inset-0 m-auto w-[min(36rem,calc(100vw-2rem))] max-w-none max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-white p-6 text-brand-heading shadow-2xl backdrop:bg-slate-950/40"
    >
      <h2 id="dialog-title" className="mb-2 text-xl">{title}</h2>
      {description && <p id="dialog-description" className="mb-5 text-sm text-[var(--color-text-muted)]">{description}</p>}
      {children}
    </dialog>,
    document.body,
  )
}

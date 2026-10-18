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

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
    }
  }, [])

  return createPortal(
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      aria-describedby={description ? 'dialog-description' : undefined}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      className="w-[min(92vw,36rem)] max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-white p-6 text-brand-heading shadow-2xl backdrop:bg-slate-950/40"
    >
      <h2 id="dialog-title" className="mb-2 text-xl">{title}</h2>
      {description && <p id="dialog-description" className="mb-5 text-sm text-[var(--color-text-muted)]">{description}</p>}
      {children}
    </dialog>,
    document.body,
  )
}

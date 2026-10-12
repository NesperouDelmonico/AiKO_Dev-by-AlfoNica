import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../api/queryKeys'
import { createObservation } from './api'
import { Button } from '../../components/ui/Button'
import { Textarea } from '../../components/ui/Textarea'
import { Spinner } from '../../components/ui/Spinner'
import { getErrorMessage } from '../../api/client'

export function ObservationDialog({ patientId, onClose }: { patientId: string; onClose: () => void }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const queryClient = useQueryClient()

  const saveMutation = useMutation({
    mutationFn: (observation: string) => createObservation(patientId, observation),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.patients.observationsList(patientId) })
      onClose()
    },
    onError: (mutationError: unknown) => setError(getErrorMessage(mutationError)),
  })

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    textRef.current?.focus()
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus()
    }
  }, [onClose])

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = text.trim()
    if (normalized.length < 5) {
      setError('La observación debe tener al menos 5 caracteres.')
      return
    }
    setError('')
    saveMutation.mutate(normalized)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="observation-title"
        aria-describedby="observation-help"
        className="w-full max-w-xl rounded-card bg-white p-6 shadow-2xl sm:p-8"
      >
        <h2 id="observation-title" className="mb-2 text-2xl">Nueva observación</h2>
        <p id="observation-help" className="mb-4 text-sm text-[var(--color-text-muted)]">Se registra con fecha y hora automáticas.</p>
        <form onSubmit={submit} className="space-y-4">
          <label htmlFor="observation-text" className="block text-sm font-semibold text-brand-heading">Observación</label>
          <Textarea
            ref={textRef}
            id="observation-text"
            value={text}
            maxLength={2000}
            onKeyDown={handleKeyDown}
            onChange={(event) => {
              setText(event.target.value)
              if (error) setError('')
            }}
            aria-describedby="observation-help observation-count observation-error"
            aria-invalid={Boolean(error)}
          />
          <div className="flex items-start justify-between gap-3">
            <p id="observation-error" role={error ? 'alert' : undefined} className="mb-0 min-h-5 text-sm text-[var(--color-attention-text)]">{error}</p>
            <span id="observation-count" className="shrink-0 text-xs text-[var(--color-text-muted)]">{text.length}/2000</span>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Spinner className="size-4 text-white" />}
              Guardar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

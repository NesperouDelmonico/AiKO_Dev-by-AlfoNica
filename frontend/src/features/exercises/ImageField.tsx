import { useId, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { getErrorMessage, imageUrl } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { uploadExerciseImage } from './imageUpload'

/** Selector de imagen (PNG/JPG) que la sube al elegirla y muestra la vista previa. */
export function ImageField({ label, value, onChange, required = false }: {
  label: string
  value: string | null
  onChange: (id: string | null) => void
  required?: boolean
}) {
  const inputId = useId()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function pick(file: File | undefined) {
    if (!file) return
    setError('')
    setUploading(true)
    try {
      onChange(await uploadExerciseImage(file))
    } catch (failure) {
      setError(getErrorMessage(failure))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="mb-0 text-sm font-semibold">{label}{required ? '' : ' (opcional)'}</p>
      {value ? (
        <div className="flex items-start gap-3">
          <img src={imageUrl(value)} alt={label} className="h-28 w-28 rounded-xl border border-[var(--color-border)] object-cover" />
          <Button type="button" size="sm" variant="secondary" onClick={() => onChange(null)}><Trash2 aria-hidden="true" className="size-4" />Quitar</Button>
        </div>
      ) : (
        <label htmlFor={inputId} className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)] hover:bg-purple-50">
          {uploading ? <Spinner /> : <ImagePlus aria-hidden="true" className="size-6" />}
          {uploading ? 'Subiendo…' : 'Elegir imagen PNG o JPG'}
          <input id={inputId} type="file" accept="image/png,image/jpeg" className="sr-only" disabled={uploading} onChange={(event) => { void pick(event.target.files?.[0]); event.target.value = '' }} />
        </label>
      )}
      {error && <p role="alert" className="mb-0 text-sm text-[var(--color-attention-text)]">{error}</p>}
    </div>
  )
}

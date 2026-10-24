import { Plus, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { ImageField } from './ImageField'
import { emptyQuestion, NUMERIC_FIELDS, type GameType, type ParamsForm } from './exerciseTypes'

const MAX_CARDS = 6
const MAX_QUESTIONS = 10
const MAX_OPTIONS = 6
const LETTERS = 'ABCDEF'

/** Formulario de parámetros según el tipo de juego (sin JSON a mano). */
export function ParamsEditor({ type, form, onChange }: {
  type: GameType
  form: ParamsForm
  onChange: (next: ParamsForm) => void
}) {
  const set = <K extends keyof ParamsForm>(key: K, value: ParamsForm[K]) => onChange({ ...form, [key]: value })

  if (type === 'completar_palabras') {
    return (
      <fieldset className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
        <legend className="px-1 text-sm font-semibold">Completar palabras</legend>
        <ImageField label="Imagen de referencia" value={form.imagen_id} onChange={(id) => set('imagen_id', id)} />
        <label className="block text-sm font-semibold" htmlFor="cp-frase">Palabra o frase
          <Input id="cp-frase" value={form.frase} maxLength={120} onChange={(e) => set('frase', e.target.value)} placeholder="El gato duerme en la cama" className="mt-1" />
          <span className="mt-1 block text-xs font-normal text-[var(--color-text-muted)]">Una palabra para empezar; varias para que luego ordene la frase (máx. 12).</span>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold" htmlFor="cp-letras">Letras ocultas por palabra
            <Input id="cp-letras" type="number" min={1} max={4} value={form.letras_ocultas} onChange={(e) => set('letras_ocultas', e.target.value)} className="mt-1" />
          </label>
          <label className="block text-sm font-semibold" htmlFor="cp-duracion">Tiempo máximo (minutos)
            <Input id="cp-duracion" type="number" min={1} max={10} step={0.5} value={form.duracion_minutos} onChange={(e) => set('duracion_minutos', e.target.value)} className="mt-1" />
          </label>
        </div>
      </fieldset>
    )
  }

  if (type === 'recordar_imagenes') {
    const cards = form.tarjetas
    const update = (index: number, patch: Partial<(typeof cards)[number]>) =>
      set('tarjetas', cards.map((card, i) => (i === index ? { ...card, ...patch } : card)))
    return (
      <fieldset className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
        <legend className="px-1 text-sm font-semibold">Recordar imágenes</legend>
        <label className="block text-sm font-semibold" htmlFor="ri-tiempo">Tiempo para memorizar (segundos)
          <Input id="ri-tiempo" type="number" min={3} max={30} value={form.tiempo_visualizacion_segundos} onChange={(e) => set('tiempo_visualizacion_segundos', e.target.value)} className="mt-1" />
          <span className="mt-1 block text-xs font-normal text-[var(--color-text-muted)]">Después las tarjetas se voltean y el paciente escribe qué era cada una.</span>
        </label>
        {cards.map((card, index) => (
          <div key={index} className="space-y-2 rounded-xl bg-purple-50/60 p-3">
            <div className="flex items-center justify-between"><p className="mb-0 text-sm font-semibold">Tarjeta {index + 1}</p>
              {cards.length > 1 && <Button type="button" size="sm" variant="ghost" onClick={() => set('tarjetas', cards.filter((_, i) => i !== index))}><Trash2 aria-hidden="true" className="size-4" />Quitar</Button>}
            </div>
            <ImageField label={`Imagen ${index + 1}`} required value={card.imagen_id} onChange={(id) => update(index, { imagen_id: id })} />
            <label className="block text-sm font-semibold" htmlFor={`ri-resp-${index}`}>Palabras clave válidas
              <Input id={`ri-resp-${index}`} value={card.respuestas} onChange={(e) => update(index, { respuestas: e.target.value })} placeholder="perro, cachorro, mascota" className="mt-1" />
              <span className="mt-1 block text-xs font-normal text-[var(--color-text-muted)]">Separadas por coma. Acierta si su respuesta contiene alguna (sin importar tildes).</span>
            </label>
          </div>
        ))}
        {cards.length < MAX_CARDS && <Button type="button" size="sm" variant="secondary" onClick={() => set('tarjetas', [...cards, { imagen_id: null, respuestas: '' }])}><Plus aria-hidden="true" className="size-4" />Agregar tarjeta</Button>}
      </fieldset>
    )
  }

  if (type === 'logica') {
    const questions = form.preguntas
    const update = (index: number, patch: Partial<(typeof questions)[number]>) =>
      set('preguntas', questions.map((q, i) => (i === index ? { ...q, ...patch } : q)))
    return (
      <fieldset className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
        <legend className="px-1 text-sm font-semibold">Lógica matemática</legend>
        {questions.map((question, index) => (
          <div key={index} className="space-y-3 rounded-xl bg-purple-50/60 p-3">
            <div className="flex items-center justify-between"><p className="mb-0 text-sm font-semibold">Pregunta {index + 1}</p>
              {questions.length > 1 && <Button type="button" size="sm" variant="ghost" onClick={() => set('preguntas', questions.filter((_, i) => i !== index))}><Trash2 aria-hidden="true" className="size-4" />Quitar</Button>}
            </div>
            <ImageField label="Imagen de referencia" value={question.imagen_id} onChange={(id) => update(index, { imagen_id: id })} />
            <label className="block text-sm font-semibold" htmlFor={`lg-enun-${index}`}>Enunciado
              <Textarea id={`lg-enun-${index}`} value={question.enunciado} maxLength={600} rows={3} onChange={(e) => update(index, { enunciado: e.target.value })} placeholder="Ana tiene 3 manzanas y compra 2 más. ¿Cuántas tiene ahora?" className="mt-1" />
            </label>
            <div role="radiogroup" aria-label={`Respuesta correcta de la pregunta ${index + 1}`} className="space-y-2">
              <p className="mb-0 text-sm font-semibold">Opciones (marca la correcta)</p>
              {question.opciones.map((option, j) => (
                <div key={j} className="flex items-center gap-2">
                  <input type="radio" name={`correcta-${index}`} aria-label={`Opción ${LETTERS[j]} es la correcta`} checked={question.correcta === j} onChange={() => update(index, { correcta: j })} className="size-4 accent-[var(--color-primary)]" />
                  <span className="w-5 text-sm font-semibold">{LETTERS[j]}</span>
                  <Input aria-label={`Opción ${LETTERS[j]}`} value={option} maxLength={80} onChange={(e) => update(index, { opciones: question.opciones.map((o, k) => (k === j ? e.target.value : o)) })} />
                  {question.opciones.length > 2 && <Button type="button" size="sm" variant="ghost" aria-label={`Quitar opción ${LETTERS[j]}`} onClick={() => update(index, {
                    opciones: question.opciones.filter((_, k) => k !== j),
                    correcta: question.correcta === j ? 0 : question.correcta > j ? question.correcta - 1 : question.correcta,
                  })}><Trash2 aria-hidden="true" className="size-4" /></Button>}
                </div>
              ))}
              {question.opciones.length < MAX_OPTIONS && <Button type="button" size="sm" variant="secondary" onClick={() => update(index, { opciones: [...question.opciones, ''] })}><Plus aria-hidden="true" className="size-4" />Agregar opción</Button>}
            </div>
          </div>
        ))}
        {questions.length < MAX_QUESTIONS && <Button type="button" size="sm" variant="secondary" onClick={() => set('preguntas', [...questions, emptyQuestion()])}><Plus aria-hidden="true" className="size-4" />Agregar pregunta</Button>}
      </fieldset>
    )
  }

  const fields = NUMERIC_FIELDS[type] ?? []
  return (
    <fieldset className="grid gap-3 rounded-xl border border-[var(--color-border)] p-4 sm:grid-cols-2">
      <legend className="px-1 text-sm font-semibold">Parámetros</legend>
      {fields.map((field) => (
        <label key={field.key} className="block text-sm font-semibold" htmlFor={`num-${field.key}`}>{field.label}
          <Input id={`num-${field.key}`} type="number" min={field.min} max={field.max} value={form.numeric[field.key] ?? ''} onChange={(e) => onChange({ ...form, numeric: { ...form.numeric, [field.key]: e.target.value } })} className="mt-1" />
          <span className="mt-1 block text-xs font-normal text-[var(--color-text-muted)]">Entre {field.min} y {field.max}.</span>
        </label>
      ))}
    </fieldset>
  )
}

import { Plus, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { ImageField } from './ImageField'
import { emptyQuestion, GRID_SIZES, HAS_TOTAL_TIME, NUMERIC_FIELDS, type GameType, type ParamsForm } from './exerciseTypes'

const MAX_CARDS = 8
const MAX_QUESTIONS = 10
const MAX_OPTIONS = 6
const LETTERS = 'ABCDEF'
const help = 'mt-1 block text-xs font-normal text-[var(--color-text-muted)]'

const TITLES: Partial<Record<GameType, string>> = {
  completar_palabras: 'Completar palabras',
  logica: 'Lógica matemática',
  recordar_imagenes: 'Recordar imágenes',
  memoria_secuencias: 'Secuencia de colores',
  toque_color: 'Toque de color',
  busca_imagen: 'Busca la imagen',
}

/** Formulario de parámetros según el juego (sin JSON a mano). */
export function ParamsEditor({ type, form, onChange }: {
  type: GameType
  form: ParamsForm
  onChange: (next: ParamsForm) => void
}) {
  const set = <K extends keyof ParamsForm>(key: K, value: ParamsForm[K]) => onChange({ ...form, [key]: value })

  const numericFields = (
    <>
      {(NUMERIC_FIELDS[type] ?? []).map((field) => (
        <label key={field.key} className="block text-sm font-semibold" htmlFor={`num-${field.key}`}>{field.label}
          <Input id={`num-${field.key}`} type="number" min={field.min} max={field.max} value={form.numeric[field.key] ?? ''} onChange={(e) => onChange({ ...form, numeric: { ...form.numeric, [field.key]: e.target.value } })} className="mt-1" />
          <span className={help}>{field.hint ? `${field.hint} ` : ''}Entre {field.min} y {field.max}.</span>
        </label>
      ))}
      {HAS_TOTAL_TIME.includes(type) && (
        <label className="block text-sm font-semibold" htmlFor="total-time">Tiempo total del juego (minutos)
          <Input id="total-time" type="number" min={1} max={15} step={0.5} value={form.duracion_minutos} onChange={(e) => set('duracion_minutos', e.target.value)} className="mt-1" />
          <span className={help}>Entre 1 y 15 minutos.</span>
        </label>
      )}
    </>
  )

  const shell = (children: React.ReactNode) => (
    <fieldset className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
      <legend className="px-1 text-sm font-semibold">{TITLES[type] ?? 'Parámetros'}</legend>
      {children}
    </fieldset>
  )

  if (type === 'completar_palabras') {
    return shell(
      <>
        <ImageField label="Imagen de referencia (opcional)" value={form.imagen_id} onChange={(id) => set('imagen_id', id)} />
        <label className="block text-sm font-semibold" htmlFor="cp-palabras">Palabras (una por línea)
          <Textarea id="cp-palabras" rows={4} value={form.palabras} onChange={(e) => set('palabras', e.target.value)} placeholder={'casa\nmanzana\nbicicleta'} className="mt-1" />
          <span className={help}>Hasta 15 palabras. El paciente las completa con fichas de letras.</span>
        </label>
        <label className="block text-sm font-semibold" htmlFor="cp-frases">Frases (opcional, una por línea)
          <Textarea id="cp-frases" rows={3} value={form.frases} onChange={(e) => set('frases', e.target.value)} placeholder="El gato duerme en la cama" className="mt-1" />
          <span className={help}>Hasta 5 frases. Aparecen después de las palabras para subir la dificultad.</span>
        </label>
        <div className="grid gap-3 sm:grid-cols-3">{numericFields}</div>
      </>,
    )
  }

  if (type === 'recordar_imagenes') {
    const cards = form.tarjetas
    const update = (index: number, patch: Partial<(typeof cards)[number]>) =>
      set('tarjetas', cards.map((card, i) => (i === index ? { ...card, ...patch } : card)))
    return shell(
      <>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold" htmlFor="ri-modo">Cómo las recuerda
            <Select id="ri-modo" value={form.modo} onChange={(e) => set('modo', e.target.value as ParamsForm['modo'])} className="mt-1">
              <option value="nombrar">Nombrar cada imagen</option>
              <option value="relacionar">Relacionar (ubicar cada imagen en su tarjeta)</option>
            </Select>
          </label>
          {numericFields}
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={form.dibujar} onChange={(e) => set('dibujar', e.target.checked)} className="size-4 accent-[var(--color-primary)]" />
          Al final, el paciente dibuja lo que recuerda (lo revisas en su historial)
        </label>
        {cards.map((card, index) => (
          <div key={index} className="space-y-2 rounded-xl bg-purple-50/60 p-3">
            <div className="flex items-center justify-between"><p className="mb-0 text-sm font-semibold">Imagen {index + 1}</p>
              {cards.length > 2 && <Button type="button" size="sm" variant="ghost" onClick={() => set('tarjetas', cards.filter((_, i) => i !== index))}><Trash2 aria-hidden="true" className="size-4" />Quitar</Button>}
            </div>
            <ImageField label={`Imagen ${index + 1}`} required value={card.imagen_id} onChange={(id) => update(index, { imagen_id: id })} />
            <label className="block text-sm font-semibold" htmlFor={`ri-resp-${index}`}>Nombres válidos{form.modo === 'relacionar' ? ' (opcional)' : ''}
              <Input id={`ri-resp-${index}`} value={card.respuestas} onChange={(e) => update(index, { respuestas: e.target.value })} placeholder="perro, cachorro, mascota" className="mt-1" />
              <span className={help}>Separados por coma. Acierta si escribe alguno (sin importar tildes).</span>
            </label>
          </div>
        ))}
        {cards.length < MAX_CARDS && <Button type="button" size="sm" variant="secondary" onClick={() => set('tarjetas', [...cards, { imagen_id: null, respuestas: '' }])}><Plus aria-hidden="true" className="size-4" />Agregar imagen</Button>}
      </>,
    )
  }

  if (type === 'logica') {
    const questions = form.preguntas
    const update = (index: number, patch: Partial<(typeof questions)[number]>) =>
      set('preguntas', questions.map((q, i) => (i === index ? { ...q, ...patch } : q)))
    return shell(
      <>
        <div className="grid gap-3 sm:grid-cols-2">{numericFields}</div>
        {questions.map((question, index) => (
          <div key={index} className="space-y-3 rounded-xl bg-purple-50/60 p-3">
            <div className="flex items-center justify-between"><p className="mb-0 text-sm font-semibold">Pregunta {index + 1}</p>
              {questions.length > 1 && <Button type="button" size="sm" variant="ghost" onClick={() => set('preguntas', questions.filter((_, i) => i !== index))}><Trash2 aria-hidden="true" className="size-4" />Quitar</Button>}
            </div>
            <ImageField label="Imagen de apoyo (opcional)" value={question.imagen_id} onChange={(id) => update(index, { imagen_id: id })} />
            <label className="block text-sm font-semibold" htmlFor={`lg-enun-${index}`}>Problema
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
      </>,
    )
  }

  return shell(
    <div className="grid gap-3 sm:grid-cols-2">
      {numericFields}
      {type === 'busca_imagen' && (
        <label className="block text-sm font-semibold" htmlFor="bi-grid">Figuras en la cuadrícula
          <Select id="bi-grid" value={form.cuadricula} onChange={(e) => set('cuadricula', e.target.value)} className="mt-1">
            {GRID_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </Select>
        </label>
      )}
      {type === 'toque_color' && (
        <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
          <input type="checkbox" checked={form.interferencia} onChange={(e) => set('interferencia', e.target.checked)} className="size-4 accent-[var(--color-primary)]" />
          Interferencia: la palabra aparece pintada de otro color (más difícil)
        </label>
      )}
    </div>,
  )
}

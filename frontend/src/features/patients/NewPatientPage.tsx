import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, getErrorMessage } from '../../api/client'
import { queryKeys } from '../../api/queryKeys'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Spinner } from '../../components/ui/Spinner'
import { ageInBogota, todayInBogota } from './dateValidation'
import { createPatient } from './api'

function numberInput(schema: z.ZodNumber) {
  return z.string().trim().min(1, 'Este campo es obligatorio.').transform(Number).pipe(schema)
}

const patientSchema = z.object({
  nombre: z.string().trim().min(1, 'Ingresa el nombre.').max(150, 'El nombre admite máximo 150 caracteres.'),
  cedula: z.string().trim().min(1, 'Ingresa la cédula.').max(20, 'La cédula admite máximo 20 caracteres.'),
  correo: z.string().trim().email('Ingresa un correo válido.').max(150, 'El correo admite máximo 150 caracteres.'),
  fecha_nacimiento: z.string().refine(
    (value) => {
      const age = ageInBogota(value)
      return age !== null && value <= todayInBogota() && age <= 120
    },
    'Ingresa una fecha válida, no futura y con edad máxima de 120 años.',
  ),
  umbral_bajo_rendimiento: numberInput(z.number().min(0, 'El umbral mínimo es 0.').max(100, 'El umbral máximo es 100.')),
  umbral_dias_inactividad: numberInput(z.number().int('Ingresa un número entero de días.').gt(0, 'Los días de inactividad deben ser mayores que 0.')),
})

type PatientFormInput = z.input<typeof patientSchema>
type PatientForm = z.output<typeof patientSchema>

function fieldError(error: string | undefined) {
  return error ? <p role="alert" className="mt-1 text-sm text-[var(--color-attention-text)]">{error}</p> : null
}

function mapCreateError(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    const detail = error.message.toLocaleLowerCase('es-CO')
    if (detail.includes('correo')) return 'Ese correo ya está registrado. Verifica el correo ingresado.'
    if (detail.includes('cédula') || detail.includes('cedula')) return 'Esa cédula ya está registrada. Verifica la cédula ingresada.'
    return 'El correo o la cédula ya existen. Verifica ambos datos.'
  }
  if (error instanceof ApiError && error.status === 503) {
    return 'No se pudo enviar el correo; la cuenta quedó inactiva. Pide al administrador que restablezca la contraseña'
  }
  return getErrorMessage(error)
}

export function NewPatientPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const form = useForm<PatientFormInput, unknown, PatientForm>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      nombre: '',
      cedula: '',
      correo: '',
      fecha_nacimiento: '',
      umbral_bajo_rendimiento: '50',
      umbral_dias_inactividad: '7',
    },
  })
  const createMutation = useMutation({
    mutationFn: createPatient,
    onSuccess: async (patient) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.patients.all })
      if (!patient.id) {
        setError('El servidor no devolvió el identificador del paciente creado. Actualiza la lista e inténtalo de nuevo.')
        return
      }
      navigate(`/especialista/pacientes/${patient.id}`, {
        replace: true,
        state: { notice: 'Paciente creado. Se envió la contraseña temporal al correo' },
      })
    },
    onError: (mutationError: unknown) => setError(mapCreateError(mutationError)),
  })

  async function onSubmit(values: PatientForm) {
    setError('')
    await createMutation.mutateAsync({
      ...values,
      nombre: values.nombre.trim(),
      cedula: values.cedula.trim(),
      correo: values.correo.trim(),
    }).catch(() => undefined)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link to="/especialista/pacientes" className="inline-flex min-h-11 items-center text-sm font-semibold no-underline">← Volver a mis pacientes</Link>
      <div>
        <p className="mb-1 text-sm font-semibold text-brand-primary">AiKO · Especialista</p>
        <h1 className="mb-0 text-3xl">Nuevo paciente</h1>
      </div>
      <Card>
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-brand-heading" htmlFor="patient-name">Nombre completo
              <Input id="patient-name" autoComplete="name" {...form.register('nombre')} aria-invalid={Boolean(form.formState.errors.nombre)} />
              {fieldError(form.formState.errors.nombre?.message)}
            </label>
            <label className="text-sm font-semibold text-brand-heading" htmlFor="patient-cedula">Cédula
              <Input id="patient-cedula" {...form.register('cedula')} aria-invalid={Boolean(form.formState.errors.cedula)} />
              {fieldError(form.formState.errors.cedula?.message)}
            </label>
            <label className="text-sm font-semibold text-brand-heading" htmlFor="patient-email">Correo electrónico
              <Input id="patient-email" type="email" autoComplete="email" {...form.register('correo')} aria-invalid={Boolean(form.formState.errors.correo)} />
              {fieldError(form.formState.errors.correo?.message)}
            </label>
            <label className="text-sm font-semibold text-brand-heading" htmlFor="patient-birthdate">Fecha de nacimiento
              <Input id="patient-birthdate" type="date" max={todayInBogota()} {...form.register('fecha_nacimiento')} aria-invalid={Boolean(form.formState.errors.fecha_nacimiento)} />
              {fieldError(form.formState.errors.fecha_nacimiento?.message)}
            </label>
            <label className="text-sm font-semibold text-brand-heading" htmlFor="patient-score-threshold">Umbral de bajo rendimiento (%)
              <Input id="patient-score-threshold" type="number" min="0" max="100" step="0.01" {...form.register('umbral_bajo_rendimiento')} aria-invalid={Boolean(form.formState.errors.umbral_bajo_rendimiento)} />
              {fieldError(form.formState.errors.umbral_bajo_rendimiento?.message)}
            </label>
            <label className="text-sm font-semibold text-brand-heading" htmlFor="patient-inactivity-days">Días de inactividad
              <Input id="patient-inactivity-days" type="number" min="1" step="1" {...form.register('umbral_dias_inactividad')} aria-invalid={Boolean(form.formState.errors.umbral_dias_inactividad)} />
              {fieldError(form.formState.errors.umbral_dias_inactividad?.message)}
            </label>
          </div>
          {error && <p role="alert" className="rounded-xl bg-[var(--color-attention-bg)] p-3 text-sm text-[var(--color-attention-text)]">{error}</p>}
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate('/especialista/pacientes')}>Cancelar</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Spinner className="size-4 text-white" />}
              Crear paciente
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

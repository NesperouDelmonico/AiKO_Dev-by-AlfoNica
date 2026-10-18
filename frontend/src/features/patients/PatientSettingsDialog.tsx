import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient, getErrorMessage, requireResponse } from '../../api/client'
import { queryKeys } from '../../api/queryKeys'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Input } from '../../components/ui/Input'
import { ageInBogota, todayInBogota } from './dateValidation'
import type { components } from '../../api/schema'

type Patient = components['schemas']['Paciente']

const birthDateSchema = z.string().refine((date) => {
  const age = ageInBogota(date)
  return age !== null && age >= 0 && age <= 120 && date <= todayInBogota()
}, 'La fecha debe ser válida, no futura y con una edad máxima de 120 años.')

export function PatientSettingsDialog({ patient, patientId, onClose }: { patient: Patient; patientId: string; onClose: () => void }) {
  const client = useQueryClient()
  const [tab, setTab] = useState<'thresholds' | 'birth'>('thresholds')
  const [low, setLow] = useState(String(patient.umbral_bajo_rendimiento ?? ''))
  const [days, setDays] = useState(String(patient.umbral_dias_inactividad ?? ''))
  const [birthDate, setBirthDate] = useState(patient.fecha_nacimiento ?? '')
  const [failure, setFailure] = useState('')
  const [fieldError, setFieldError] = useState('')
  const saveThresholds = useMutation({
    mutationFn: async () => {
      const result = await apiClient.PUT('/pacientes/{id}/umbrales', {
        params: { path: { id: patientId } },
        body: { umbral_bajo_rendimiento: Number(low), umbral_dias_inactividad: Number(days) },
      })
      return requireResponse(result.data, result.response)
    },
  })
  const saveBirthDate = useMutation({
    mutationFn: async (date: string) => {
      const result = await apiClient.PATCH('/pacientes/{id}', { params: { path: { id: patientId } }, body: { fecha_nacimiento: date } })
      return requireResponse(result.data, result.response)
    },
  })
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFailure('')
    setFieldError('')
    try {
      if (tab === 'thresholds') {
        const lowValue = Number(low)
        const dayValue = Number(days)
        if (!Number.isFinite(lowValue) || lowValue < 0 || lowValue > 100 || !Number.isInteger(dayValue) || dayValue <= 0) {
          setFieldError('El umbral de rendimiento debe estar entre 0 y 100 y los días deben ser un entero mayor que 0.')
          return
        }
        await saveThresholds.mutateAsync()
      } else {
        const parsed = birthDateSchema.safeParse(birthDate)
        if (!parsed.success) { setFieldError(parsed.error.issues[0]?.message ?? 'Fecha de nacimiento inválida.'); return }
        await saveBirthDate.mutateAsync(parsed.data)
      }
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.patients.detail(patientId) }),
        client.invalidateQueries({ queryKey: queryKeys.patients.alerts(patientId) }),
        client.invalidateQueries({ queryKey: queryKeys.patients.all }),
      ])
      onClose()
    } catch (error) { setFailure(getErrorMessage(error)) }
  }
  return <Dialog title="Editar información del paciente" onClose={onClose}>
    <div role="tablist" aria-label="Información editable" className="mb-4 flex gap-2">
      <Button role="tab" aria-selected={tab === 'thresholds'} variant={tab === 'thresholds' ? 'primary' : 'secondary'} onClick={() => setTab('thresholds')}>Umbrales</Button>
      <Button role="tab" aria-selected={tab === 'birth'} variant={tab === 'birth' ? 'primary' : 'secondary'} onClick={() => setTab('birth')}>Fecha de nacimiento</Button>
    </div>
    <form className="space-y-4" onSubmit={(event) => void submit(event)} noValidate>
      {tab === 'thresholds' ? <>
        <label className="block text-sm font-semibold" htmlFor="threshold-low">Umbral de bajo rendimiento (0 a 100)<Input id="threshold-low" type="number" min="0" max="100" step="any" value={low} onChange={(event) => setLow(event.target.value)} className="mt-1" /></label>
        <label className="block text-sm font-semibold" htmlFor="threshold-days">Días de inactividad<Input id="threshold-days" type="number" min="1" step="1" value={days} onChange={(event) => setDays(event.target.value)} className="mt-1" /></label>
      </> : <label className="block text-sm font-semibold" htmlFor="patient-birth-date">Fecha de nacimiento<Input id="patient-birth-date" type="date" max={todayInBogota()} value={birthDate} onChange={(event) => setBirthDate(event.target.value)} className="mt-1" /></label>}
      {fieldError && <p role="alert" className="text-sm text-[var(--color-attention-text)]">{fieldError}</p>}
      {failure && <p role="alert" className="text-sm text-[var(--color-attention-text)]">{failure}</p>}
      <div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={saveThresholds.isPending || saveBirthDate.isPending}>Guardar</Button></div>
    </form>
  </Dialog>
}

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getErrorMessage } from '../../api/client'
import { queryKeys } from '../../api/queryKeys'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { ErrorState } from '../../components/ui/ErrorState'
import { Select } from '../../components/ui/Select'
import { getSpecialists, reassignPatient } from '../admin/api'

export function ReassignPatientDialog({ patientId, currentSpecialistId, onClose }: {
  patientId: string
  currentSpecialistId: string
  onClose: () => void
}) {
  const client = useQueryClient()
  const [specialistId, setSpecialistId] = useState('')
  const [failure, setFailure] = useState('')
  const query = useQuery({ queryKey: queryKeys.users.specialists, queryFn: getSpecialists })
  const mutation = useMutation({
    mutationFn: () => reassignPatient(patientId, specialistId),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.patients.detail(patientId) }),
        client.invalidateQueries({ queryKey: queryKeys.patients.all }),
        client.invalidateQueries({ queryKey: queryKeys.users.all }),
      ])
      onClose()
    },
  })
  return <Dialog title="Reasignar paciente" description="Selecciona una cuenta de especialista activa." onClose={onClose}>
    {query.isPending && <div aria-busy="true" className="h-12 animate-pulse rounded-xl bg-purple-50" />}
    {query.isError && <ErrorState message={query.error.message} action={<Button variant="secondary" onClick={() => void query.refetch()}>Reintentar</Button>} />}
    {query.data && <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); setFailure(''); void mutation.mutateAsync().catch((error: unknown) => setFailure(getErrorMessage(error))) }}>
      <label className="block text-sm font-semibold" htmlFor="assign-specialist">Especialista
        <Select id="assign-specialist" className="mt-1" value={specialistId} onChange={(event) => setSpecialistId(event.target.value)} required>
          <option value="">Selecciona una cuenta</option>
          {query.data.filter((candidate) => candidate.id && candidate.id !== currentSpecialistId).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.nombre} · {candidate.correo}</option>)}
        </Select>
      </label>
      {failure && <p role="alert" className="text-sm text-[var(--color-attention-text)]">{failure}</p>}
      <div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={!specialistId || mutation.isPending}>Reasignar</Button></div>
    </form>}
  </Dialog>
}

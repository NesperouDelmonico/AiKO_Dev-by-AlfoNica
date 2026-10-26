import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { apiClient } from '../../api/client'
import { ApiError, getErrorMessage, requireResponse } from '../../api/client'
import { queryKeys } from '../../api/queryKeys'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Dialog } from '../../components/ui/Dialog'
import { ErrorState } from '../../components/ui/ErrorState'
import { Input } from '../../components/ui/Input'
import { getUser, resetUserPassword, updateUser, updateUserState } from './api'

const schema = z.object({
  nombre: z.string().trim().min(2, 'Ingresa el nombre.'),
  cedula: z.string().trim().min(5, 'Ingresa una cédula válida.'),
  correo: z.string().trim().email('Ingresa un correo válido.'),
})
type Values = z.infer<typeof schema>
type AccountRole = 'Especialista' | 'Administrador'

function FormField({ label, id, error, ...props }: React.ComponentProps<typeof Input> & { label: string; id: string; error?: string | undefined }) {
  return <div className="space-y-1"><label htmlFor={id} className="text-sm font-semibold text-brand-heading">{label}</label><Input id={id} {...props} /><p role={error ? 'alert' : undefined} className="min-h-5 text-xs text-[var(--color-attention-text)]">{error}</p></div>
}

export function AccountFormPage({ role }: { role: AccountRole }) {
  const navigate = useNavigate()
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { nombre: '', cedula: '', correo: '' } })
  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      const result = role === 'Especialista'
        ? await apiClient.POST('/usuarios/especialistas', { body: values })
        : await apiClient.POST('/usuarios/administradores', { body: values })
      return requireResponse(result.data, result.response)
    },
    onSuccess: async (user) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
      navigate(user.id ? `/admin/usuarios/${user.id}` : '/admin/usuarios', { replace: true, state: { notice: 'Cuenta creada. Se envió la contraseña temporal al correo.' } })
    },
  })
  const queryClient = useQueryClient()
  const [failure, setFailure] = useState('')
  async function submit(values: Values) {
    setFailure('')
    try { await mutation.mutateAsync(values) } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const serverMessage = error.message
        const hasEmail = /correo/i.test(serverMessage)
        const hasId = /c[eé]dula/i.test(serverMessage)
        const alreadySpecific = /^el correo ya existe|^la c[eé]dula ya existe/i.test(serverMessage)
        setFailure(hasEmail && hasId || alreadySpecific ? serverMessage : hasEmail
          ? `El correo ya existe. ${serverMessage}`
          : hasId
            ? `La cédula ya existe. ${serverMessage}`
            : `El correo o la cédula ya existen. ${serverMessage}`)
      } else if (error instanceof ApiError && error.status === 503) setFailure('No pudimos enviar el correo y la cuenta quedó inactiva. Puedes volver a enviar la contraseña desde la edición de la cuenta.')
      else setFailure(getErrorMessage(error))
    }
  }
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link to="/admin/usuarios">← Volver a usuarios</Link>
      <div><h1 className="mb-1 text-3xl">Nueva cuenta de {role.toLowerCase()}</h1><p className="mb-0 text-sm text-[var(--color-text-muted)]">Registra una cuenta de {role.toLowerCase()} para la plataforma.</p></div>
      <Card>
        <p className="mb-5 rounded-xl bg-purple-50 p-3 text-sm">Enviaremos una contraseña temporal al correo de esta persona.</p>
        {failure && <p role="alert" className="mb-4 rounded-xl bg-[var(--color-attention-bg)] p-3 text-sm text-[var(--color-attention-text)]">{failure}</p>}
        <form className="space-y-3" onSubmit={form.handleSubmit(submit)} noValidate>
          <FormField label="Nombre" id="account-name" autoComplete="name" {...form.register('nombre')} error={form.formState.errors.nombre?.message} />
          <FormField label="Cédula" id="account-id" {...form.register('cedula')} error={form.formState.errors.cedula?.message} />
          <FormField label="Correo electrónico" id="account-email" type="email" autoComplete="email" {...form.register('correo')} error={form.formState.errors.correo?.message} />
          <div className="flex gap-3 pt-2"><Button type="submit" disabled={form.formState.isSubmitting}>Crear cuenta</Button><Button type="button" variant="secondary" onClick={() => navigate('/admin/usuarios')}>Cancelar</Button></div>
        </form>
      </Card>
    </div>
  )
}

export function EditUserPage() {
  const { id = '' } = useParams()
  const client = useQueryClient()
  const [confirm, setConfirm] = useState<'deactivate' | 'reset' | null>(null)
  const [failure, setFailure] = useState('')
  const query = useQuery({ queryKey: queryKeys.users.detail(id), queryFn: () => getUser(id), enabled: Boolean(id) })
  const form = useForm<Values>({ resolver: zodResolver(schema), values: { nombre: query.data?.nombre ?? '', correo: query.data?.correo ?? '', cedula: query.data?.cedula ?? '' } })
  const update = useMutation({ mutationFn: (values: Values) => updateUser(id, values), onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: queryKeys.users.detail(id) }), client.invalidateQueries({ queryKey: queryKeys.users.all })] ) } })
  const toggle = useMutation({ mutationFn: (state: boolean) => updateUserState(id, state), onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: queryKeys.users.detail(id) }), client.invalidateQueries({ queryKey: queryKeys.users.all })]) } })
  const reset = useMutation({ mutationFn: () => resetUserPassword(id), onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: queryKeys.users.detail(id) }), client.invalidateQueries({ queryKey: queryKeys.users.all })]) } })
  if (query.isPending) return <Card><div aria-busy="true" className="skeleton-shimmer h-40 animate-pulse rounded-xl bg-purple-50" /></Card>
  if (query.isError) return <ErrorState title="No pudimos cargar esta cuenta. Inténtalo de nuevo." message={query.error.message} action={<Button variant="secondary" onClick={() => void query.refetch()}>Intentar de nuevo</Button>} />
  async function performConfirm() {
    try {
      setFailure('')
      if (confirm === 'deactivate') await toggle.mutateAsync(false)
      if (confirm === 'reset') await reset.mutateAsync()
      setConfirm(null)
    } catch (error) {
      setFailure(confirm === 'reset' && error instanceof ApiError && error.status === 503
        ? 'No pudimos enviar la contraseña. La cuenta no cambió. Inténtalo de nuevo.'
        : getErrorMessage(error))
      setConfirm(null)
    }
  }
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div><h1 className="mb-1 text-3xl">Editar usuario</h1><p className="mb-0 text-sm text-[var(--color-text-muted)]">Actualiza los datos y el estado de esta cuenta.</p></div>
      <Card>
        {failure && <p role="alert" className="mb-3 rounded-xl bg-[var(--color-attention-bg)] p-3 text-sm text-[var(--color-attention-text)]">{failure}</p>}
        <form className="space-y-3" onSubmit={form.handleSubmit(async (values) => { try { await update.mutateAsync(values) } catch (error) { setFailure(getErrorMessage(error)) } })} noValidate>
          <FormField label="Nombre" id="edit-name" {...form.register('nombre')} error={form.formState.errors.nombre?.message} />
          <FormField label="Cédula" id="edit-id" {...form.register('cedula')} error={form.formState.errors.cedula?.message} />
          <FormField label="Correo electrónico" id="edit-email" type="email" {...form.register('correo')} error={form.formState.errors.correo?.message} />
          <div className="flex flex-wrap gap-2 pt-2"><Button type="submit" disabled={update.isPending}>Guardar cambios</Button>
            {query.data.estado ? <Button type="button" variant="secondary" onClick={() => setConfirm('deactivate')}>Desactivar usuario</Button> : <Button type="button" variant="secondary" onClick={async () => { try { await toggle.mutateAsync(true) } catch (error) { setFailure(getErrorMessage(error)) } }}>Activar usuario</Button>}
            <Button type="button" variant="secondary" onClick={() => setConfirm('reset')}>Restablecer contraseña</Button>
          </div>
        </form>
      </Card>
      {confirm && <Dialog title={confirm === 'reset' ? 'Restablecer contraseña' : 'Desactivar usuario'} description={confirm === 'reset' ? 'Enviaremos una contraseña temporal al correo de esta persona.' : 'Esta persona ya no podrá ingresar al panel.'} onClose={() => setConfirm(null)}>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setConfirm(null)}>Cancelar</Button><Button onClick={() => void performConfirm()} disabled={reset.isPending || toggle.isPending}>{confirm === 'reset' ? 'Restablecer' : 'Desactivar'}</Button></div>
      </Dialog>}
    </div>
  )
}

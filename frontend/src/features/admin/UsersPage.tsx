import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Ellipsis,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from 'lucide-react'
import { ApiError, getErrorMessage } from '../../api/client'
import { queryKeys } from '../../api/queryKeys'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Dialog } from '../../components/ui/Dialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { useToast } from '../../components/ui/toastContext'
import { initials, display } from '../../lib/text'
import { formatDate } from '../../lib/date'
import { useDebouncedValue } from '../patients/useDebouncedValue'
import { getIndicators, getUsers, resetUserPassword, updateUserState, type User, type UserFilters } from './api'
import { useAuth } from '../../auth/AuthContext'

const PAGE_SIZE = 10
type UserAction = 'edit' | 'activate' | 'deactivate' | 'reset'

export function UsersPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const client = useQueryClient()
  const { notify } = useToast()
  const [text, setText] = useState('')
  const [role, setRole] = useState('')
  const [state, setState] = useState('')
  const [newAccountOpen, setNewAccountOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ user: User; action: 'deactivate' | 'reset' } | null>(null)
  const [page, setPage] = useState(1)
  const q = useDebouncedValue(text, 300)
  const filters = useMemo<UserFilters>(() => ({
    page, limit: PAGE_SIZE,
    ...(q ? { q } : {}),
    ...(role ? { rol: role as NonNullable<UserFilters['rol']> } : {}),
    ...(state ? { estado: state === 'true' } : {}),
  }), [page, q, role, state])
  const query = useQuery({ queryKey: queryKeys.users.list(filters), queryFn: () => getUsers(filters) })
  const indicators = useQuery({ queryKey: queryKeys.adminIndicators, queryFn: getIndicators })
  const updateState = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: boolean }) => updateUserState(id, estado),
    onSuccess: async () => client.invalidateQueries({ queryKey: queryKeys.users.all }),
  })
  const resetPassword = useMutation({
    mutationFn: (id: string) => resetUserPassword(id),
    onSuccess: async () => client.invalidateQueries({ queryKey: queryKeys.users.all }),
  })
  const users = query.data?.data ?? []
  const pages = Math.max(1, Math.ceil((query.data?.total ?? users.length) / PAGE_SIZE))
  const userName = user?.nombre?.trim() ?? ''

  async function performAction(account: User, action: 'activate' | 'deactivate' | 'reset') {
    if (!account.id) return
    try {
      if (action === 'reset') {
        await resetPassword.mutateAsync(account.id)
        notify({ type: 'success', message: 'Se envió una contraseña temporal al correo del usuario.' })
      } else {
        await updateState.mutateAsync({ id: account.id, estado: action === 'activate' })
        notify({ type: 'success', message: `Usuario ${action === 'activate' ? 'activado' : 'desactivado'} correctamente.` })
      }
      setConfirmAction(null)
    } catch (error) {
      notify({
        type: 'error',
        message: action === 'reset' && error instanceof ApiError && error.status === 503
          ? 'No pudimos enviar la contraseña. La cuenta no cambió. Inténtalo de nuevo.'
          : getErrorMessage(error),
      })
      setConfirmAction(null)
    }
  }

  function onUserAction(account: User, action: UserAction) {
    if (action === 'edit' && account.id) navigate(`/admin/usuarios/${account.id}`)
    if (action === 'activate') void performAction(account, 'activate')
    if (action === 'deactivate' || action === 'reset') setConfirmAction({ user: account, action })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        description="Consulta y administra las cuentas de la plataforma."
        greetingName={userName}
        {...(query.data ? { context: `${query.data.total ?? users.length} cuentas en esta lista` } : {})}
        actions={(
          <div className="relative">
            <Button aria-expanded={newAccountOpen} aria-haspopup="menu" onClick={() => setNewAccountOpen((open) => !open)}>
              <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} /> Nueva cuenta
            </Button>
            {newAccountOpen && <div role="menu" className="absolute right-0 z-10 mt-2 w-52 rounded-xl border border-[var(--color-border)] bg-white p-2 shadow-brand-card">
              <button role="menuitem" className="block min-h-10 w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-purple-50" onClick={() => { setNewAccountOpen(false); navigate('/admin/usuarios/nuevo-especialista') }}>Especialista</button>
              <button role="menuitem" className="block min-h-10 w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-purple-50" onClick={() => { setNewAccountOpen(false); navigate('/admin/usuarios/nuevo-administrador') }}>Administrador</button>
            </div>}
          </div>
        )}
      />

      <section aria-label="Resumen de usuarios" className="space-y-3">
        <h2 className="sr-only">Resumen</h2>
        {indicators.isPending && (
          <div aria-busy="true" aria-label="Cargando resumen de usuarios" className="grid gap-3 sm:grid-cols-2">
            <div className="skeleton-shimmer h-24 rounded-brand-card bg-white shadow-brand-card" />
            <div className="skeleton-shimmer h-24 rounded-brand-card bg-white shadow-brand-card" />
          </div>
        )}
        {indicators.isError && (
          <ErrorState
            title="No pudimos cargar el resumen de usuarios."
            message={indicators.error.message}
            action={<Button variant="secondary" onClick={() => void indicators.refetch()}>Intentar de nuevo</Button>}
          />
        )}
        {indicators.data && (indicators.data.total_usuarios !== undefined || indicators.data.total_pacientes !== undefined) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {indicators.data.total_usuarios !== undefined && <SummaryCard title="Usuarios registrados" value={indicators.data.total_usuarios} />}
            {indicators.data.total_pacientes !== undefined && <SummaryCard title="Pacientes" value={indicators.data.total_pacientes} />}
          </div>
        )}
      </section>

      <Card>
        <div className="grid gap-3 md:grid-cols-[minmax(16rem,1fr)_12rem_12rem]">
          <label className="relative text-sm font-semibold text-brand-heading" htmlFor="user-search">
            Buscar por nombre o correo
            <Search aria-hidden="true" className="absolute left-3 top-9 size-4 text-[var(--color-text-muted)]" />
            <Input id="user-search" className="mt-1 pl-9" value={text} onChange={(event) => { setText(event.target.value); setPage(1) }} />
          </label>
          <label className="text-sm font-semibold text-brand-heading" htmlFor="user-role">Rol
            <Select id="user-role" className="mt-1" value={role} onChange={(event) => { setRole(event.target.value); setPage(1) }}>
              <option value="">Todos</option><option value="Paciente">Paciente</option><option value="Especialista">Especialista</option><option value="Administrador">Administrador</option>
            </Select>
          </label>
          <label className="text-sm font-semibold text-brand-heading" htmlFor="user-state">Estado
            <Select id="user-state" className="mt-1" value={state} onChange={(event) => { setState(event.target.value); setPage(1) }}>
              <option value="">Todos</option><option value="true">Activo</option><option value="false">Inactivo</option>
            </Select>
          </label>
        </div>
        {query.isPending && <div className="mt-5 grid gap-3" aria-label="Cargando usuarios" aria-busy="true">{Array.from({ length: 5 }, (_, i) => <div className="skeleton-shimmer h-16 animate-pulse rounded-xl bg-purple-50" key={i} />)}</div>}
        {query.isError && <div className="mt-5"><ErrorState title="No pudimos cargar las cuentas" message={query.error.message} action={<Button variant="secondary" onClick={() => void query.refetch()}>Intentar de nuevo</Button>} /></div>}
        {query.isSuccess && users.length === 0 && <EmptyState title={q || role || state ? 'Todavía no hay usuarios que coincidan' : 'No hay cuentas creadas todavía'} description={q || role || state ? 'Prueba con otros filtros.' : 'Puedes crear la primera.'} />}
        {users.length > 0 && (
          <>
            <div className="mt-5 hidden max-[639px]:block">
              <ul className="space-y-3">
                {users.map((account, index) => (
                  <li key={account.id ?? `${account.correo}-${index}`}>
                    <Card className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <UserIdentity user={account} />
                        {account.id && <UserActionsMenu user={account} onAction={onUserAction} />}
                      </div>
                      <p className="mb-3 mt-3 break-all text-sm text-[var(--color-text-muted)]">{display(account.correo)}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <RoleBadge role={account.rol} />
                        <Badge variant={account.estado ? 'success' : 'attention'}>{account.estado ? 'Activo' : 'Inactivo'}</Badge>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
              <Pagination page={page} pages={pages} total={query.data?.total ?? users.length} setPage={setPage} />
            </div>
            <div className="mt-5 hidden max-[639px]:hidden min-[640px]:block">
              <div className="max-h-[70vh] overflow-auto rounded-xl border border-[var(--color-border)]">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-purple-50">
                    <tr className="border-b border-[var(--color-border)] text-xs tracking-wide text-[var(--color-text-muted)]">
                      <th scope="col" className="p-3">Usuario</th><th scope="col" className="p-3">Correo</th><th scope="col" className="p-3">Rol</th><th scope="col" className="p-3">Estado</th><th scope="col" className="p-3"><span className="sr-only">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody>{users.map((account, index) => (
                    <tr key={account.id ?? `${account.correo}-${index}`} className="border-b border-purple-100 transition-colors duration-150 hover:bg-purple-50/70 last:border-0">
                      <td className="p-3"><UserIdentity user={account} /></td>
                      <td className="p-3 text-[var(--color-text-muted)]">{display(account.correo)}</td>
                      <td className="p-3"><RoleBadge role={account.rol} /></td>
                      <td className="p-3"><Badge variant={account.estado ? 'success' : 'attention'}>{account.estado ? 'Activo' : 'Inactivo'}</Badge></td>
                      <td className="p-3">{account.id && <UserActionsMenu user={account} onAction={onUserAction} />}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <Pagination page={page} pages={pages} total={query.data?.total ?? users.length} setPage={setPage} />
            </div>
          </>
        )}
      </Card>

      {confirmAction && (
        <Dialog
          title={confirmAction.action === 'reset' ? 'Restablecer contraseña' : 'Desactivar usuario'}
          description={confirmAction.action === 'reset'
            ? `Enviaremos una contraseña temporal al correo de ${display(confirmAction.user.nombre)}.`
            : `${display(confirmAction.user.nombre)} ya no podrá ingresar al panel.`}
          onClose={() => setConfirmAction(null)}
        >
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmAction(null)}>Cancelar</Button>
            <Button
              onClick={() => void performAction(confirmAction.user, confirmAction.action)}
              disabled={resetPassword.isPending || updateState.isPending}
            >
              {confirmAction.action === 'reset' ? 'Restablecer' : 'Desactivar'}
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  )
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return <Card className="flex min-h-24 items-center justify-between gap-3 p-4">
    <p className="mb-0 text-sm font-semibold text-[var(--color-text-muted)]">{title}</p>
    <p className="mb-0 text-3xl font-semibold text-brand-heading">{value}</p>
  </Card>
}

function UserIdentity({ user }: { user: User }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className={`inline-grid size-10 shrink-0 place-items-center rounded-full font-semibold ${roleAvatarClass(user.rol)}`} aria-hidden="true">
        {initials(user.nombre)}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium text-[var(--color-text)]">{display(user.nombre)}</span>
        {user.fecha_creacion && (
          <time className="mt-0.5 block text-xs text-[var(--color-text-muted)]" dateTime={user.fecha_creacion}>
            Creado {formatDate(user.fecha_creacion, { dateStyle: 'medium' })}
          </time>
        )}
      </span>
    </div>
  )
}

function roleAvatarClass(role: string | undefined) {
  if (role === 'Administrador') return 'bg-[var(--color-role-admin-bg)] text-[var(--color-role-admin-text)]'
  if (role === 'Especialista') return 'bg-[var(--color-role-specialist-bg)] text-[var(--color-role-specialist-text)]'
  return 'bg-[var(--color-role-patient-bg)] text-[var(--color-role-patient-text)]'
}

function RoleBadge({ role }: { role: string | undefined }) {
  const Icon = role === 'Administrador' ? ShieldCheck : role === 'Especialista' ? Stethoscope : UserRound
  const roleClass = role === 'Administrador'
    ? 'bg-[var(--color-role-admin-bg)] text-[var(--color-role-admin-text)]'
    : role === 'Especialista'
      ? 'bg-[var(--color-role-specialist-bg)] text-[var(--color-role-specialist-text)]'
      : 'bg-[var(--color-role-patient-bg)] text-[var(--color-role-patient-text)]'
  return <Badge className={roleClass}><Icon aria-hidden="true" className="mr-1 size-3.5" />{display(role)}</Badge>
}

function UserActionsMenu({ user, onAction }: { user: User; onAction: (user: User, action: UserAction) => void }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    function closeOutside(event: PointerEvent) {
      if (!(event.target instanceof Node)) return
      if (!menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open])

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))
    const index = items.findIndex((item) => item === document.activeElement)
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      buttonRef.current?.focus()
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      items[(index + direction + items.length) % items.length]?.focus()
    } else if (event.key === 'Home') {
      event.preventDefault()
      items[0]?.focus()
    } else if (event.key === 'End') {
      event.preventDefault()
      items.at(-1)?.focus()
    }
  }

  function choose(action: UserAction) {
    setOpen(false)
    onAction(user, action)
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="inline-grid size-10 place-items-center rounded-lg text-brand-heading transition-colors duration-150 hover:bg-purple-100"
        aria-label={`Acciones para ${display(user.nombre)}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <Ellipsis aria-hidden="true" className="size-5" />
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={`Acciones para ${display(user.nombre)}`}
          className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-[var(--color-border)] bg-white p-1.5 shadow-brand-card"
          onKeyDown={handleKeyDown}
        >
          <MenuItem onClick={() => choose('edit')}>Editar</MenuItem>
          <MenuItem onClick={() => choose(user.estado ? 'deactivate' : 'activate')}>{user.estado ? 'Desactivar' : 'Activar'}</MenuItem>
          <MenuItem onClick={() => choose('reset')}>Restablecer contraseña</MenuItem>
        </div>
      )}
    </div>
  )
}

function MenuItem({ children, onClick }: { children: string; onClick: () => void }) {
  return <button type="button" role="menuitem" className="min-h-11 w-full rounded-lg px-3 text-left text-sm text-brand-heading transition-colors duration-150 hover:bg-purple-50" onClick={onClick}>{children}</button>
}

function Pagination({ page, pages, total, setPage }: { page: number; pages: number; total: number; setPage: React.Dispatch<React.SetStateAction<number>> }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm text-[var(--color-text-muted)]">Página {page} de {pages} · {total} usuarios</span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((number) => number - 1)}>Anterior</Button>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage((number) => number + 1)}>Siguiente</Button>
      </div>
    </div>
  )
}

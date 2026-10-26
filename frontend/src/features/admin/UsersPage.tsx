import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { queryKeys } from '../../api/queryKeys'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { initials, display } from '../../lib/text'
import { useDebouncedValue } from '../patients/useDebouncedValue'
import { getUsers, type UserFilters } from './api'

const PAGE_SIZE = 10

export function UsersPage() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [role, setRole] = useState('')
  const [state, setState] = useState('')
  const [newAccountOpen, setNewAccountOpen] = useState(false)
  const [page, setPage] = useState(1)
  const q = useDebouncedValue(text, 300)
  const filters = useMemo<UserFilters>(() => ({
    page, limit: PAGE_SIZE,
    ...(q ? { q } : {}),
    ...(role ? { rol: role as NonNullable<UserFilters['rol']> } : {}),
    ...(state ? { estado: state === 'true' } : {}),
  }), [page, q, role, state])
  const query = useQuery({ queryKey: queryKeys.users.list(filters), queryFn: () => getUsers(filters) })
  const users = query.data?.data ?? []
  const pages = Math.max(1, Math.ceil((query.data?.total ?? users.length) / PAGE_SIZE))
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="mb-1 text-3xl">Usuarios</h1><p className="mb-0 text-sm text-[var(--color-text-muted)]">Consulta y administra las cuentas de la plataforma.</p></div>
        <div className="relative">
          <Button aria-expanded={newAccountOpen} aria-haspopup="menu" onClick={() => setNewAccountOpen((open) => !open)}>
            <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} /> Nueva cuenta
          </Button>
          {newAccountOpen && <div role="menu" className="absolute right-0 z-10 mt-2 w-52 rounded-xl border border-[var(--color-border)] bg-white p-2 shadow-brand-card">
            <Link role="menuitem" className="block rounded-lg px-3 py-2 text-sm hover:bg-purple-50" to="/admin/usuarios/nuevo-especialista" onClick={() => setNewAccountOpen(false)}>Especialista</Link>
            <Link role="menuitem" className="block rounded-lg px-3 py-2 text-sm hover:bg-purple-50" to="/admin/usuarios/nuevo-administrador" onClick={() => setNewAccountOpen(false)}>Administrador</Link>
          </div>}
        </div>
      </header>
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
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead><tr className="border-b border-[var(--color-border)] text-xs tracking-wide text-[var(--color-text-muted)]"><th className="p-3">Usuario</th><th className="p-3">Correo</th><th className="p-3">Rol</th><th className="p-3">Estado</th><th className="p-3">Acción</th></tr></thead>
              <tbody>{users.map((user, index) => (
                <tr key={user.id ?? `${user.correo}-${index}`} className="border-b border-purple-100 last:border-0">
                  <td className="p-3 text-[var(--color-text)]"><span className="mr-2 inline-grid size-9 place-items-center rounded-full bg-purple-100 font-semibold text-brand-heading">{initials(user.nombre)}</span><span className="font-medium">{display(user.nombre)}</span></td>
                  <td className="p-3 text-[var(--color-text-muted)]">{display(user.correo)}</td>
                  <td className="p-3"><Badge>{display(user.rol)}</Badge></td>
                  <td className="p-3"><Badge variant={user.estado ? 'success' : 'attention'}>{user.estado ? 'Activo' : 'Inactivo'}</Badge></td>
                  <td className="p-3">{user.id ? <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/usuarios/${user.id}`)}>Editar</Button> : '—'}</td>
                </tr>
              ))}</tbody>
            </table>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-muted)]">Página {page} de {pages} · {query.data?.total ?? users.length} usuarios</span>
              <div className="flex gap-2"><Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>Anterior</Button><Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage((n) => n + 1)}>Siguiente</Button></div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

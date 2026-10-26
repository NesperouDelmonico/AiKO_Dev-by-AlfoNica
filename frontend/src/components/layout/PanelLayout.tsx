import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  ArrowLeft,
  Bell,
  Check,
  ChevronDown,
  Dumbbell,
  KeyRound,
  LogOut,
  Menu,
  Search,
  Users,
  X,
} from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { apiClient, getErrorMessage, requireResponse } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { queryKeys } from '../../api/queryKeys'
import type { components } from '../../api/schema'
import { cn } from '../../lib/utils'
import { ErrorState } from '../ui/ErrorState'
import { Logo } from '../ui/Logo'

type PanelRole = 'admin' | 'specialist'
type NavigationItem = { to: string; label: string; icon: typeof Users }

const navigation: Record<PanelRole, NavigationItem[]> = {
  admin: [
    { to: '/admin/usuarios', label: 'Usuarios', icon: Users },
    { to: '/admin/indicadores', label: 'Indicadores', icon: Activity },
  ],
  specialist: [
    { to: '/especialista/pacientes', label: 'Mis pacientes', icon: Users },
    { to: '/especialista/alertas', label: 'Alertas', icon: Bell },
    { to: '/especialista/ejercicios', label: 'Ejercicios', icon: Dumbbell },
  ],
}

const searchPatientsKey = (query: string) => ['pacientes', 'busqueda-rapida', query] as const

function PatientSearch({ onNavigate }: { onNavigate: (patientId: string) => void }) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobilePath, setMobilePath] = useState('')
  const [listOpen, setListOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const location = useLocation()
  const isMobileSearchOpen = mobileOpen && mobilePath === location.pathname
  const query = useQuery({
    queryKey: searchPatientsKey(debouncedSearch),
    queryFn: async () => {
      const result = await apiClient.GET('/pacientes/buscar', {
        params: { query: { page: 1, limit: 5, q: debouncedSearch } },
      })
      return requireResponse(result.data, result.response)
    },
    enabled: debouncedSearch.length > 0,
  })
  const results = query.data?.data ?? []
  const showList = listOpen && search.trim().length > 0

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timeout)
  }, [search])

  useEffect(() => {
    if (isMobileSearchOpen) inputRef.current?.focus()
  }, [isMobileSearchOpen])

  function selectPatient(patient: components['schemas']['PacienteListado']) {
    if (patient.id) onNavigate(patient.id)
    setSearch('')
    setDebouncedSearch('')
    setListOpen(false)
    setMobileOpen(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setListOpen(false)
      return
    }
    if (event.key === 'ArrowDown' && results.length > 0) {
      event.preventDefault()
      setListOpen(true)
      setActiveIndex((index) => (index + 1) % results.length)
    }
    if (event.key === 'ArrowUp' && results.length > 0) {
      event.preventDefault()
      setListOpen(true)
      setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1))
    }
    if (event.key === 'Enter' && results.length > 0) {
      event.preventDefault()
      const selected = results[activeIndex] ?? results[0]
      if (selected) selectPatient(selected)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-xl text-brand-heading hover:bg-purple-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary sm:hidden"
        aria-label={isMobileSearchOpen ? 'Cerrar búsqueda de pacientes' : 'Buscar pacientes'}
        aria-expanded={isMobileSearchOpen}
        onClick={() => {
          if (isMobileSearchOpen) {
            setMobileOpen(false)
            setSearch('')
          } else {
            setMobilePath(location.pathname)
            setMobileOpen(true)
          }
          setListOpen(false)
        }}
      >
        {isMobileSearchOpen ? <X aria-hidden="true" className="size-5" /> : <Search aria-hidden="true" className="size-5" />}
      </button>
      <div className={cn(
        'absolute right-0 top-12 z-30 w-[min(20rem,calc(100vw-2rem))] sm:static sm:block sm:w-64',
        isMobileSearchOpen ? 'block' : 'hidden sm:block',
      )}>
        <label className="sr-only" htmlFor="patient-quick-search">Buscar pacientes</label>
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            ref={inputRef}
            id="patient-quick-search"
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-controls="patient-quick-search-results"
            aria-activedescendant={activeIndex >= 0 ? `patient-quick-search-option-${activeIndex}` : undefined}
            autoComplete="off"
            className="min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-white pl-9 pr-3 text-sm text-brand-heading outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-purple-200"
            placeholder="Buscar pacientes"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setListOpen(true)
              setActiveIndex(-1)
            }}
            onFocus={() => {
              if (search.trim()) setListOpen(true)
            }}
            onKeyDown={handleKeyDown}
          />
        </div>
        {showList && (
          <div
            id="patient-quick-search-results"
            role="listbox"
            aria-label="Resultados de pacientes"
            className="absolute left-0 right-0 top-[calc(100%+0.5rem)] max-h-72 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-white p-1 shadow-brand-card"
          >
            {debouncedSearch.length === 0 || query.isPending ? (
              <p role="status" className="m-0 px-3 py-3 text-sm text-[var(--color-text-muted)]">Buscando pacientes…</p>
            ) : query.isError ? (
              <p role="alert" className="m-0 px-3 py-3 text-sm text-[var(--color-attention-text)]">No se pudo completar la búsqueda: {getErrorMessage(query.error)}</p>
            ) : results.length === 0 ? (
              <p role="status" className="m-0 px-3 py-3 text-sm text-[var(--color-text-muted)]">No se encontraron pacientes.</p>
            ) : results.map((patient, index) => (
              <div
                id={`patient-quick-search-option-${index}`}
                key={patient.id ?? `${patient.nombre}-${index}`}
                role="option"
                aria-selected={activeIndex === index}
                className={cn(
                  'cursor-pointer rounded-lg border-l-4 border-transparent px-3 py-2 text-sm text-brand-heading hover:bg-purple-50',
                  activeIndex === index && 'border-brand-primary bg-purple-50 font-semibold',
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectPatient(patient)}
              >
                <span className="block truncate font-semibold">{patient.nombre || 'Paciente'}</span>
                <span className="block text-xs font-normal text-[var(--color-text-muted)]">
                  {patient.edad == null ? 'Edad no disponible' : `${patient.edad} años`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function getPageInfo(pathname: string) {
  if (pathname === '/admin/usuarios') return { title: 'Usuarios' }
  if (pathname === '/admin/indicadores') return { title: 'Indicadores' }
  if (pathname.endsWith('/nuevo-especialista')) return { title: 'Nuevo especialista' }
  if (pathname.endsWith('/nuevo-administrador')) return { title: 'Nuevo administrador' }
  if (/^\/admin\/usuarios\/[^/]+$/.test(pathname)) return { title: 'Editar usuario', back: '/admin/usuarios' }
  if (pathname === '/especialista/pacientes') return { title: 'Mis pacientes' }
  if (pathname === '/especialista/pacientes/nuevo') return { title: 'Nuevo paciente' }
  const routeBuilder = pathname.match(/^\/especialista\/pacientes\/([^/]+)\/ruta$/)
  if (routeBuilder) return { title: 'Constructor de ruta', back: `/especialista/pacientes/${routeBuilder[1]}` }
  if (/^\/especialista\/pacientes\/[^/]+$/.test(pathname)) return { title: 'Detalle del paciente', back: '/especialista/pacientes' }
  if (pathname === '/especialista/alertas') return { title: 'Alertas' }
  if (pathname === '/especialista/ejercicios') return { title: 'Ejercicios' }
  return { title: 'Panel AiKO' }
}

function PanelLayoutBase({ role }: { role: PanelRole }) {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerPath, setDrawerPath] = useState(location.pathname)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [userMenuPath, setUserMenuPath] = useState(location.pathname)
  const [logoutError, setLogoutError] = useState('')
  const drawerRef = useRef<HTMLElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const userName = user?.nombre?.trim() || 'Usuario'
  const page = getPageInfo(location.pathname)
  const isDrawerOpen = drawerOpen && drawerPath === location.pathname
  const isUserMenuOpen = userMenuOpen && userMenuPath === location.pathname
  const alertsQuery = useQuery({
    queryKey: queryKeys.alerts.list({ estado: 'Activa' }),
    queryFn: async () => {
      const result = await apiClient.GET('/alertas', { params: { query: { estado: 'Activa' } } })
      return requireResponse(result.data, result.response)
    },
    enabled: role === 'specialist' && Boolean(user?.id),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
  const activeAlertCount = alertsQuery.data?.filter((alert) => alert.estado === 'Activa').length ?? 0

  useEffect(() => {
    if (!isDrawerOpen) return
    const previousOverflow = document.body.style.overflow
    const opener = menuButtonRef.current
    document.body.style.overflow = 'hidden'
    const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(focusableSelector)
    firstFocusable?.focus()

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setDrawerOpen(false)
        return
      }
      if (event.key !== 'Tab' || !drawerRef.current) return
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(focusableSelector))
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) {
        event.preventDefault()
      } else if (event.shiftKey && (document.activeElement === first || !drawerRef.current.contains(document.activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !drawerRef.current.contains(document.activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      opener?.focus()
    }
  }, [isDrawerOpen])

  function openDrawer() {
    setDrawerPath(location.pathname)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
  }

  function toggleUserMenu() {
    if (isUserMenuOpen) {
      setUserMenuOpen(false)
      return
    }
    setUserMenuPath(location.pathname)
    setUserMenuOpen(true)
  }

  async function handleLogout() {
    setLogoutError('')
    try {
      await signOut()
    } catch (error) {
      setLogoutError(getErrorMessage(error))
    }
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 flex min-h-[72px] items-center gap-2 border-b border-white/70 bg-white/90 px-2 backdrop-blur sm:gap-3 sm:px-5">
        <button
          ref={menuButtonRef}
          type="button"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-brand-heading hover:bg-purple-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          aria-label="Abrir menú"
          aria-expanded={isDrawerOpen}
          aria-controls="panel-navigation-dialog"
          onClick={openDrawer}
        >
          <Menu aria-hidden="true" className="size-5" strokeWidth={1.9} />
        </button>
        <Logo compact className="h-9 w-8 shrink-0" />
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
          {page.back && (
            <Link
              to={page.back}
              className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-brand-primary no-underline hover:bg-purple-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary sm:text-sm"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              <span>Volver</span>
            </Link>
          )}
          <span className="min-w-0 truncate font-brand-heading text-base font-semibold text-brand-heading sm:text-lg">{page.title}</span>
        </div>
        {role === 'specialist' && (
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <PatientSearch onNavigate={(patientId) => navigate(`/especialista/pacientes/${patientId}`)} />
            <Link
              to="/especialista/alertas"
              aria-label={alertsQuery.isError
                ? 'Alertas activas no disponibles'
                : activeAlertCount > 0
                  ? `${activeAlertCount} alerta${activeAlertCount === 1 ? '' : 's'} activa${activeAlertCount === 1 ? '' : 's'}`
                  : 'Alertas'}
              title={alertsQuery.isError ? 'No se pudieron cargar las alertas activas' : undefined}
              className="relative inline-flex size-11 items-center justify-center rounded-xl text-brand-heading no-underline hover:bg-purple-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            >
              <Bell aria-hidden="true" className="size-5" strokeWidth={1.75} />
              {activeAlertCount > 0 && (
                <span aria-hidden="true" className="absolute right-0.5 top-0.5 min-w-5 rounded-full bg-[var(--color-attention-bg)] px-1 text-center text-[10px] font-bold leading-5 text-[var(--color-attention-text)]">
                  {activeAlertCount}
                </span>
              )}
              {alertsQuery.isError && <span role="status" className="sr-only">No se pudieron cargar las alertas activas.</span>}
            </Link>
          </div>
        )}
        <div className="relative shrink-0">
          <button
            type="button"
            className="flex min-h-11 max-w-52 items-center gap-2 rounded-xl px-1.5 text-left text-sm text-brand-heading hover:bg-purple-50 sm:px-2"
            aria-haspopup="menu"
            aria-expanded={isUserMenuOpen}
            aria-label={`Menú de usuario: ${userName}`}
            onClick={toggleUserMenu}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-purple-100 font-semibold text-brand-heading">
              {user?.nombre?.slice(0, 1).toUpperCase() || 'U'}
            </span>
            <span className="hidden min-w-0 flex-col text-left sm:flex">
              <span className="max-w-28 truncate font-semibold">{userName}</span>
              <span className="text-xs text-[var(--color-text-muted)]">{user?.rol ?? ''}</span>
            </span>
            <ChevronDown aria-hidden="true" className="hidden size-4 sm:block" strokeWidth={1.75} />
          </button>
          {isUserMenuOpen && (
            <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-[var(--color-border)] bg-white p-2 shadow-brand-card">
              <div className="border-b border-[var(--color-border)] px-3 py-2">
                <p className="mb-0 truncate text-sm font-semibold text-brand-heading">{userName}</p>
                {user?.rol && <p className="mb-0 text-xs text-[var(--color-text-muted)]">{user.rol}</p>}
              </div>
              <button
                type="button"
                role="menuitem"
                className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-brand-heading hover:bg-purple-50"
                onClick={() => {
                  setUserMenuOpen(false)
                  navigate('/cambiar-contrasena')
                }}
              >
                <KeyRound aria-hidden="true" className="size-4" strokeWidth={1.75} />
                Cambiar contraseña
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-brand-heading hover:bg-purple-50"
                onClick={() => void handleLogout()}
              >
                <LogOut aria-hidden="true" className="size-4" strokeWidth={1.75} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl p-4 sm:p-8">
        {logoutError && <ErrorState title="No se pudo confirmar el cierre de sesión" message={logoutError} />}
        <Outlet />
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-purple-200 bg-white/95 px-4 py-3 text-center text-xs leading-5 text-[var(--color-text-muted)] backdrop-blur">
        AiKO complementa el tratamiento y no reemplaza la historia clínica ni realiza diagnósticos.
      </footer>

      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/45"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDrawer()
          }}
        >
          <aside
            ref={drawerRef}
            id="panel-navigation-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="panel-navigation-title"
            tabIndex={-1}
            className="drawer-enter flex h-full w-[min(20rem,calc(100vw-2.5rem))] flex-col overflow-y-auto border-r border-white/70 bg-white px-5 py-6 shadow-2xl"
          >
            <div className="mb-10 flex items-center justify-between">
              <Logo className="h-auto w-36" />
              <button
                type="button"
                className="inline-flex size-11 items-center justify-center rounded-xl text-brand-heading hover:bg-purple-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
                aria-label="Cerrar menú"
                onClick={closeDrawer}
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            <h2 id="panel-navigation-title" className="sr-only">Navegación principal</h2>
            <nav aria-label="Navegación principal" className="space-y-2">
              {navigation[role].map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={closeDrawer}
                  className={({ isActive }) => cn(
                    'flex min-h-12 items-center gap-3 rounded-xl border-l-4 border-transparent px-3 text-sm font-semibold text-[var(--color-text-muted)] no-underline transition-colors hover:bg-purple-50 hover:text-brand-heading',
                    isActive && 'border-brand-primary bg-purple-100 font-bold text-brand-heading',
                  )}
                >
                  <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
                  {label}
                  {location.pathname === to && <Check aria-hidden="true" className="ml-auto size-4" />}
                </NavLink>
              ))}
            </nav>
            <div className="mt-auto flex items-center gap-3 rounded-xl bg-purple-50 p-3 text-sm text-brand-heading">
              <Activity aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.75} />
              <span>Bienestar cognitivo</span>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

export function AdminLayout() {
  return <PanelLayoutBase role="admin" />
}

export function SpecialistLayout() {
  return <PanelLayoutBase role="specialist" />
}

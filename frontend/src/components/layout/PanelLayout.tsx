import { useState } from 'react'
import { Activity, Bell, ChevronDown, ClipboardList, KeyRound, LogOut, Users, Dumbbell } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { getErrorMessage } from '../../api/client'
import { Logo } from '../ui/Logo'
import { ErrorState } from '../ui/ErrorState'
import { cn } from '../../lib/utils'

type PanelRole = 'admin' | 'specialist'
type NavigationItem = { to: string; label: string; icon: typeof Users }

const navigation: Record<PanelRole, NavigationItem[]> = {
  admin: [{ to: '/admin/usuarios', label: 'Usuarios', icon: Users }],
  specialist: [
    { to: '/especialista/pacientes', label: 'Mis pacientes', icon: Users },
    { to: '/especialista/alertas', label: 'Alertas', icon: Bell },
    { to: '/especialista/ejercicios', label: 'Ejercicios', icon: Dumbbell },
  ],
}

function PanelLayoutBase({ role }: { role: PanelRole }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  async function handleLogout() {
    setLogoutError('')
    try {
      await signOut()
    } catch (error) {
      setLogoutError(getErrorMessage(error))
    }
  }

  return (
    <div className="min-h-screen pb-24 lg:pb-20">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-white/70 bg-white/85 px-5 py-7 shadow-sm backdrop-blur lg:flex">
        <Logo className="mb-10 h-auto w-32" />
        <nav aria-label="Navegación principal" className="space-y-2">
          {navigation[role].map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-purple-50 hover:text-brand-heading',
                  isActive && 'bg-purple-100 text-brand-heading',
                )
              }
            >
              <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-3 rounded-xl bg-purple-50 p-3 text-sm text-brand-heading">
          <Activity aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.75} />
          <span>Bienestar cognitivo</span>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex min-h-[76px] items-center justify-between border-b border-white/70 bg-white/80 px-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <Logo className="h-auto w-24" />
          </div>
          <span className="hidden text-sm font-medium text-[var(--color-text-muted)] lg:block">
            {role === 'admin' ? 'Panel de administración' : 'Panel del especialista'}
          </span>
          <div className="relative ml-auto">
            <button
              type="button"
              className="flex min-h-11 items-center gap-2 rounded-xl px-2 text-left text-sm text-brand-heading hover:bg-purple-50"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="grid size-9 place-items-center rounded-full bg-purple-100 font-semibold text-brand-heading">
                {user?.nombre?.slice(0, 1).toUpperCase() || 'U'}
              </span>
              <span className="hidden max-w-48 truncate sm:inline">{user?.nombre || 'Usuario'}</span>
              <ChevronDown aria-hidden="true" className="size-4" strokeWidth={1.75} />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 mt-2 w-56 rounded-xl border border-[var(--color-border)] bg-white p-2 shadow-brand-card">
                <button
                  type="button"
                  role="menuitem"
                  className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-brand-heading hover:bg-purple-50"
                  onClick={() => {
                    setMenuOpen(false)
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

        {role === 'specialist' && (
          <nav aria-label="Navegación principal móvil" className="flex gap-1 overflow-x-auto bg-white/70 px-3 py-2 lg:hidden">
            {navigation.specialist.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn('flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm text-brand-heading', isActive && 'bg-purple-100 font-semibold')
                }
              >
                <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
                {label}
              </NavLink>
            ))}
          </nav>
        )}
        {role === 'admin' && (
          <nav aria-label="Navegación principal móvil" className="px-4 py-2 lg:hidden">
            <NavLink to="/admin/usuarios" className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm text-brand-heading">
              <ClipboardList aria-hidden="true" className="size-4" strokeWidth={1.75} />
              Usuarios
            </NavLink>
          </nav>
        )}

        <main className="mx-auto max-w-7xl p-4 sm:p-8">
          {logoutError && <ErrorState title="No se pudo confirmar el cierre de sesión" message={logoutError} />}
          <Outlet />
        </main>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-purple-200 bg-white/95 px-4 py-3 text-center text-xs leading-5 text-[var(--color-text-muted)] backdrop-blur lg:pl-64">
        AiKO complementa el tratamiento y no reemplaza la historia clínica ni realiza diagnósticos.
      </footer>
    </div>
  )
}

export function AdminLayout() {
  return <PanelLayoutBase role="admin" />
}

export function SpecialistLayout() {
  return <PanelLayoutBase role="specialist" />
}

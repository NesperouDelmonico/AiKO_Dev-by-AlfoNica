import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { homeForRole, type PanelRole } from './roles'
import { UnsupportedRoleRedirect } from './RouteGuards'
import { SessionLoading } from './SessionLoading'

export function ProtectedRoute({ role }: { role?: PanelRole }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <SessionLoading />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!homeForRole(user.rol)) return <UnsupportedRoleRedirect />
  if (role && user.rol !== role) {
    const home = homeForRole(user.rol)
    if (home) return <Navigate to={home} replace />
  }
  return <Outlet />
}

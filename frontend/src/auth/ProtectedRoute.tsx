import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spinner } from '../components/ui/Spinner'
import { useAuth } from './AuthContext'
import { homeForRole, panelRole, type PanelRole } from './roles'

export function ProtectedRoute({ role }: { role?: PanelRole }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" aria-live="polite">
        <Spinner className="size-8" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (role && panelRole(user.rol) !== role) {
    return <Navigate to={homeForRole(user.rol) || '/login'} replace />
  }
  return <Outlet />
}

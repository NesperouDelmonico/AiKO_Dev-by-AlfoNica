import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { homeForRole } from './roles'
import { useAuth } from './AuthContext'
import { SessionLoading } from './SessionLoading'

export function PublicRoute() {
  const { user, loading } = useAuth()
  if (loading) return <SessionLoading />
  if (!user) return <Outlet />
  const home = homeForRole(user.rol)
  if (home) return <Navigate to={home} replace />
  return <UnsupportedRoleRedirect />
}

export function RoleHomeRedirect() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <SessionLoading />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  const home = homeForRole(user.rol)
  if (home) return <Navigate to={home} replace />
  return <UnsupportedRoleRedirect />
}

export function UnsupportedRoleRedirect() {
  const { user, rejectUnsupportedRole } = useAuth()
  useEffect(() => {
    if (user) void rejectUnsupportedRole()
  }, [rejectUnsupportedRole, user])
  return <SessionLoading />
}

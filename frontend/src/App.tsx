import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './auth/AuthProvider'
import { AdminLayout, SpecialistLayout } from './components/layout/PanelLayout'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { PublicRoute, RoleHomeRedirect } from './auth/RouteGuards'
import { PanelErrorBoundary } from './components/layout/PanelErrorBoundary'
import { ChangePasswordPage, ForgotPasswordPage, LoginPage, ResetPasswordPage } from './pages/AuthPages'
import { NewPatientPage } from './features/patients/NewPatientPage'
import { SessionLoading } from './auth/SessionLoading'

const PatientsListPage = lazy(() => import('./features/patients/PatientsListPage').then((module) => ({ default: module.PatientsListPage })))
const PatientDetailPage = lazy(() => import('./features/patients/PatientDetailPage').then((module) => ({ default: module.PatientDetailPage })))
const RouteBuilderPage = lazy(() => import('./features/patients/RouteBuilderPage').then((module) => ({ default: module.RouteBuilderPage })))
const UsersPage = lazy(() => import('./features/admin/UsersPage').then((module) => ({ default: module.UsersPage })))
const AccountFormPage = lazy(() => import('./features/admin/AccountFormPage').then((module) => ({ default: module.AccountFormPage })))
const EditUserPage = lazy(() => import('./features/admin/AccountFormPage').then((module) => ({ default: module.EditUserPage })))
const IndicatorsPage = lazy(() => import('./features/admin/IndicatorsPage').then((module) => ({ default: module.IndicatorsPage })))
const ExercisesPage = lazy(() => import('./features/exercises/ExercisesPage').then((module) => ({ default: module.ExercisesPage })))
const AlertsPage = lazy(() => import('./features/alerts/AlertsPage').then((module) => ({ default: module.AlertsPage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export function AppRoutes() {
  return (
    <Suspense fallback={<SessionLoading />}>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/olvide-contrasena" element={<ForgotPasswordPage />} />
          <Route path="/restablecer-contrasena" element={<ResetPasswordPage />} />
        </Route>
        <Route element={<ProtectedRoute role="Administrador" />}>
          <Route element={<PanelErrorBoundary />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="usuarios" replace />} />
              <Route path="usuarios">
                <Route index element={<UsersPage />} />
                <Route path="nuevo-especialista" element={<AccountFormPage role="Especialista" />} />
                <Route path="nuevo-administrador" element={<AccountFormPage role="Administrador" />} />
                <Route path=":id" element={<EditUserPage />} />
              </Route>
              <Route path="indicadores" element={<IndicatorsPage />} />
            </Route>
          </Route>
        </Route>
        <Route element={<ProtectedRoute role="Especialista" />}>
          <Route element={<PanelErrorBoundary />}>
            <Route path="/especialista" element={<SpecialistLayout />}>
              <Route index element={<Navigate to="pacientes" replace />} />
              <Route path="pacientes" element={<PatientsListPage />} />
              <Route path="pacientes/nuevo" element={<NewPatientPage />} />
              <Route path="pacientes/:id/ruta" element={<RouteBuilderPage />} />
              <Route path="pacientes/:id" element={<PatientDetailPage />} />
              <Route path="alertas" element={<AlertsPage />} />
              <Route path="ejercicios" element={<ExercisesPage />} />
            </Route>
          </Route>
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/cambiar-contrasena" element={<ChangePasswordPage />} />
        </Route>
        <Route path="/" element={<RoleHomeRedirect />} />
        <Route path="*" element={<RoleHomeRedirect />} />
      </Routes>
    </Suspense>
  )
}

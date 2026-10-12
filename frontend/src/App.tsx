import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './auth/AuthProvider'
import { AdminLayout, SpecialistLayout } from './components/layout/PanelLayout'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { PublicRoute, RoleHomeRedirect } from './auth/RouteGuards'
import { PanelErrorBoundary } from './components/layout/PanelErrorBoundary'
import { ChangePasswordPage, ForgotPasswordPage, LoginPage, ResetPasswordPage } from './pages/AuthPages'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { PatientsListPage } from './features/patients/PatientsListPage'
import { NewPatientPage } from './features/patients/NewPatientPage'
import { PatientDetailPage } from './features/patients/PatientDetailPage'

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
            <Route path="usuarios" element={<PlaceholderPage title="Usuarios" />} />
          </Route>
        </Route>
      </Route>
      <Route element={<ProtectedRoute role="Especialista" />}>
        <Route element={<PanelErrorBoundary />}>
          <Route path="/especialista" element={<SpecialistLayout />}>
            <Route index element={<Navigate to="pacientes" replace />} />
            <Route path="pacientes" element={<PatientsListPage />} />
            <Route path="pacientes/nuevo" element={<NewPatientPage />} />
            <Route path="pacientes/:id" element={<PatientDetailPage />} />
            <Route path="alertas" element={<PlaceholderPage title="Alertas" />} />
            <Route path="ejercicios" element={<PlaceholderPage title="Ejercicios" />} />
          </Route>
        </Route>
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/cambiar-contrasena" element={<ChangePasswordPage />} />
      </Route>
      <Route path="/" element={<RoleHomeRedirect />} />
      <Route path="*" element={<RoleHomeRedirect />} />
    </Routes>
  )
}

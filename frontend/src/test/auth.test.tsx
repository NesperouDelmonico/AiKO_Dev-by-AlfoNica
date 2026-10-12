import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
import { AuthProvider } from '../auth/AuthProvider'
import { ProtectedRoute } from '../auth/ProtectedRoute'
import { tokenStorage } from '../auth/tokenStorage'
import { LoginPage, ResetPasswordPage } from '../pages/AuthPages'
import { PlaceholderPage } from '../pages/PlaceholderPage'

const specialist = {
  id: 'user-id',
  nombre: 'Dra. Andrea',
  correo: 'andrea@example.com',
  rol: 'Especialista',
  estado: true,
  intentos_fallidos: 0,
} as const

const patient = { ...specialist, rol: 'Paciente', nombre: 'Paciente AiKO' } as const

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderAuth(initialPath: string, onFetch: (input: RequestInfo | URL, init?: RequestInit) => Response | Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn(onFetch))
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/usuarios" element={<ProtectedRoute role="administrador" />}>
            <Route index element={<PlaceholderPage title="Usuarios protegidos" />} />
          </Route>
          <Route path="/especialista/pacientes" element={<ProtectedRoute role="especialista" />}>
            <Route index element={<PlaceholderPage title="Pacientes protegidos" />} />
          </Route>
          <Route path="/especialista" element={<Navigate to="/especialista/pacientes" replace />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  tokenStorage.clear()
})

describe('autenticación y cliente API', () => {
  it('adjunta el token de sesión en las solicitudes', async () => {
    tokenStorage.set('test-session-token')
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      () => Promise.resolve(jsonResponse(200, specialist)),
    )
    vi.stubGlobal('fetch', fetchMock)

    await apiClient.GET('/auth/me')

    const [input, init] = fetchMock.mock.calls[0] || []
    const headers = new Headers(init?.headers)
    if (input instanceof Request) input.headers.forEach((value, name) => headers.set(name, value))
    expect(headers.get('Authorization')).toBe('Bearer test-session-token')
  })

  it('cierra la sesión local ante un 401 y vuelve al login', async () => {
    tokenStorage.set('expired-session')
    renderAuth('/admin/usuarios', () => jsonResponse(401, { statusCode: 401, message: 'No autorizado' }))

    expect(await screen.findByText('Inicia sesión en tu panel de AiKO')).toBeInTheDocument()
    expect(tokenStorage.get()).toBeNull()
  })

  it('redirige al panel correspondiente según el rol', async () => {
    tokenStorage.set('specialist-session')
    renderAuth('/admin/usuarios', () => jsonResponse(200, specialist))

    expect(await screen.findByRole('heading', { name: 'Pacientes protegidos' })).toBeInTheDocument()
  })

  it('rechaza al paciente y elimina su sesión del panel', async () => {
    tokenStorage.set('patient-session')
    renderAuth('/login', () => jsonResponse(200, patient))

    expect(await screen.findByText('Las cuentas de paciente deben usar la aplicación móvil.')).toBeInTheDocument()
    expect(tokenStorage.get()).toBeNull()
  })

  it('valida la política de contraseña al restablecerla', async () => {
    render(
      <MemoryRouter initialEntries={['/restablecer-contrasena']}>
        <ResetPasswordPage />
      </MemoryRouter>,
    )
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Correo electrónico'), 'persona@example.com')
    await user.type(screen.getByLabelText('Código de 6 dígitos'), '123456')
    await user.type(screen.getByLabelText('Nueva contraseña'), 'lowercase1')
    await user.click(screen.getByRole('button', { name: 'Restablecer contraseña' }))

    expect(await screen.findByText('Agrega al menos una mayúscula.')).toBeInTheDocument()
  })

  it.each([
    [423, 'Cuenta bloqueada: usa Olvidé mi contraseña o contacta al administrador'],
    [429, 'Demasiados intentos, espera un minuto'],
  ])('muestra el mensaje de login esperado para HTTP %i', async (status, expectedMessage) => {
    const user = userEvent.setup()
    renderAuth('/login', () => jsonResponse(status, { statusCode: status, message: 'Respuesta de error' }))
    await user.type(screen.getByLabelText('Correo electrónico'), 'persona@example.com')
    await user.type(screen.getByLabelText('Contraseña'), 'ClaveSegura1')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByText(expectedMessage)).toBeInTheDocument()
  })
})

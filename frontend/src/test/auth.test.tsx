import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useEffect, useRef } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppRoutes } from '../App'
import { apiClient } from '../api/client'
import { AuthProvider } from '../auth/AuthProvider'
import { ProtectedRoute } from '../auth/ProtectedRoute'
import { PanelErrorBoundary } from '../components/layout/PanelErrorBoundary'
import { tokenStorage } from '../auth/tokenStorage'
import { LoginPage, ResetPasswordPage } from '../pages/AuthPages'
import { PlaceholderPage } from '../pages/PlaceholderPage'
import { roleHomePaths } from '../auth/roles'
import type { components } from '../api/schema'

type AuthUser = Omit<typeof specialist, 'rol'> & {
  rol: components['schemas']['Rol'] | string
}

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

function routeFor(input: RequestInfo | URL): string {
  if (input instanceof Request) return input.url
  return input instanceof URL ? input.toString() : input
}

function renderAuth(initialPath: string, onFetch: (input: RequestInfo | URL, init?: RequestInit) => Response | Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn(onFetch))
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/usuarios" element={<ProtectedRoute role="Administrador" />}>
            <Route index element={<PlaceholderPage title="Usuarios protegidos" />} />
          </Route>
          <Route path="/especialista/pacientes" element={<ProtectedRoute role="Especialista" />}>
            <Route index element={<PlaceholderPage title="Pacientes protegidos" />} />
          </Route>
          <Route path="/especialista" element={<Navigate to="/especialista/pacientes" replace />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

function PathProbe({ onPath }: { onPath: (path: string) => void }) {
  const { pathname } = useLocation()
  const lastPath = useRef('')
  useEffect(() => {
    if (lastPath.current !== pathname) {
      lastPath.current = pathname
      onPath(pathname)
    }
  }, [onPath, pathname])
  return null
}

function renderApplication(
  initialPath: string,
  onFetch: (input: RequestInfo | URL, init?: RequestInit) => Response | Promise<Response>,
  token?: string,
  paths: string[] = [],
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  if (token) tokenStorage.set(token)
  vi.stubGlobal('fetch', vi.fn(onFetch))
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PathProbe onPath={(path) => paths.push(path)} />
          <AppRoutes />
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
  return paths
}

function applicationFetch(
  user: AuthUser,
  token = 'test-token',
  paths: string[] = [],
) {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(routeFor(input))
    paths.push(`${init?.method ?? 'GET'} ${url.pathname}`)
    if (url.pathname.endsWith('/auth/login')) {
      return jsonResponse(200, { token, rol: user.rol, usuario: user })
    }
    if (url.pathname.endsWith('/auth/me')) return jsonResponse(200, user)
    if (url.pathname.endsWith('/auth/logout')) return jsonResponse(204)
    if (url.pathname.endsWith('/pacientes')) {
      return jsonResponse(200, { total: 0, page: 1, limit: 12, data: [] })
    }
    return jsonResponse(404, { statusCode: 404, message: 'Not found' })
  }
}

afterEach(() => {
  tokenStorage.clear()
  vi.restoreAllMocks()
})

describe('autenticación y cliente API', () => {
  it('permite pasar el correo entre las pantallas públicas de recuperación', async () => {
    const locations: string[] = []
    const fetcher = (input: RequestInfo | URL) => {
      const url = new URL(routeFor(input))
      if (url.pathname.endsWith('/auth/olvide-contrasena')) return jsonResponse(202)
      return jsonResponse(404, { statusCode: 404, message: 'Not found' })
    }
    const user = userEvent.setup()
    renderApplication('/login', fetcher, undefined, locations)

    const forgotLink = await screen.findByRole('link', { name: '¿Olvidaste tu contraseña?' })
    await user.click(forgotLink)
    expect(await screen.findByText('Te ayudamos a recuperar el acceso a tu cuenta')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Correo electrónico'), 'persona@example.com')
    await user.click(screen.getByRole('button', { name: 'Enviar instrucciones' }))
    expect(await screen.findByText('Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ya tengo mi código' }))
    expect(await screen.findByLabelText('Correo electrónico')).toHaveValue('persona@example.com')
    expect(locations.at(-1)).toBe('/restablecer-contrasena')

    await user.click(screen.getByRole('link', { name: 'Pedir un código nuevo' }))
    expect(await screen.findByLabelText('Correo electrónico')).toHaveValue('persona@example.com')
    expect(locations.at(-1)).toBe('/olvide-contrasena')
    await user.click(screen.getByRole('link', { name: 'Volver al inicio de sesión' }))
    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(locations.at(-1)).toBe('/login')
  })

  it('permite volver al login desde restablecer contraseña', async () => {
    const locations: string[] = []
    renderApplication('/restablecer-contrasena', () => jsonResponse(404), undefined, locations)

    expect(await screen.findByText('El código tiene 6 dígitos, vence en 15 minutos y permite 5 intentos')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('link', { name: 'Volver al inicio de sesión' }))
    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(locations.at(-1)).toBe('/login')
  })

  it('lleva al login con el aviso al completar el restablecimiento', async () => {
    const locations: string[] = []
    const fetcher = (input: RequestInfo | URL) => {
      const url = new URL(routeFor(input))
      if (url.pathname.endsWith('/auth/restablecer-contrasena')) return jsonResponse(204)
      return jsonResponse(404, { statusCode: 404, message: 'Not found' })
    }
    const user = userEvent.setup()
    renderApplication('/restablecer-contrasena', fetcher, undefined, locations)
    await user.type(screen.getByLabelText('Correo electrónico'), 'persona@example.com')
    await user.type(screen.getByLabelText('Código de 6 dígitos'), '123456')
    await user.type(screen.getByLabelText('Nueva contraseña'), 'NuevaClave1')
    await user.click(screen.getByRole('button', { name: 'Restablecer contraseña' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Contraseña actualizada')
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(locations.at(-1)).toBe('/login')
  })

  it.each([
    ['/olvide-contrasena', { ...specialist, rol: 'Administrador' as const }, '/admin/usuarios', 'Usuarios'],
    ['/restablecer-contrasena', { ...specialist, rol: 'Administrador' as const }, '/admin/usuarios', 'Usuarios'],
    ['/olvide-contrasena', specialist, '/especialista/pacientes', 'Mis pacientes'],
    ['/restablecer-contrasena', specialist, '/especialista/pacientes', 'Mis pacientes'],
  ])('redirige desde %s al inicio por rol para una sesión activa', async (path, userData, home, heading) => {
    const locations: string[] = []
    const fetcher = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(routeFor(input))
      if (url.pathname.endsWith('/usuarios')) {
        return jsonResponse(200, { total: 0, page: 1, limit: 10, data: [] })
      }
      return applicationFetch(userData)(input, init)
    }
    renderApplication(path, fetcher, 'authenticated-token', locations)

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
    await waitFor(() => expect(locations.at(-1)).toBe(home))
    expect(locations.filter((location) => location === path)).toHaveLength(1)
  })

  it('mantiene Usuarios e Indicadores en el menú admin y muestra pacientes solo como cuentas', async () => {
    const admin = { ...specialist, rol: 'Administrador' as const }
    const calls: string[] = []
    const fetcher = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(routeFor(input))
      calls.push(`${init?.method ?? 'GET'} ${url.pathname}`)
      if (url.pathname.endsWith('/auth/me')) return jsonResponse(200, admin)
      if (url.pathname.endsWith('/usuarios')) return jsonResponse(200, {
        total: 1,
        page: 1,
        limit: 10,
        data: [{ id: 'patient-user', nombre: 'Paciente Uno', correo: 'patient@example.com', rol: 'Paciente', estado: true }],
      })
      return jsonResponse(404, { statusCode: 404, message: 'Not found' })
    }
    renderApplication('/admin/usuarios', fetcher, 'admin-token')

    expect(await screen.findByText('Paciente Uno')).toBeInTheDocument()
    const navigation = screen.getAllByRole('navigation', { name: 'Navegación principal' })
    for (const nav of navigation) {
      expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual(['Usuarios', 'Indicadores'])
    }
    expect(screen.queryByRole('link', { name: /pacientes|historial|ruta clínica/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    expect(calls.some((call) => call.includes('/pacientes'))).toBe(false)
  })

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

  it.each([
    ['Administrador', { ...specialist, rol: 'Administrador' as const }, '/admin/usuarios', 'Usuarios'],
    ['Especialista', specialist, '/especialista/pacientes', 'Mis pacientes'],
  ])('inicia sesión como %s y dibuja su ruta real de inicio', async (_role, userData, expectedPath, expectedHeading) => {
    const user = userEvent.setup()
    const apiCalls: string[] = []
    const locations: string[] = []
    renderApplication('/login', applicationFetch(userData, 'sign-in-token', apiCalls), undefined, locations)
    await user.type(screen.getByLabelText('Correo electrónico'), 'user@example.com')
    await user.type(screen.getByLabelText('Contraseña'), 'SafePassword1')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('heading', { name: expectedHeading })).toBeInTheDocument()
    await waitFor(() => expect(locations.at(-1)).toBe(expectedPath))
    expect(apiCalls.some((call) => call.endsWith('/auth/login'))).toBe(true)
    if (userData.rol === 'Administrador') expect(roleHomePaths.Administrador).toBe('/admin')
    else expect(roleHomePaths.Especialista).toBe('/especialista')
  })

  it.each([
    ['/ruta-inexistente', undefined, jsonResponse(401, { statusCode: 401 })],
    ['/ruta-inexistente', 'restored-admin-token', jsonResponse(200, { ...specialist, rol: 'Administrador' })],
  ])('resuelve una ruta desconocida sin bucle para sesión %s', async (initialPath, token, meResponse) => {
    const userData = { ...specialist, rol: 'Administrador' as const }
    const paths: string[] = []
    const fetcher = (input: RequestInfo | URL) => {
      const url = new URL(routeFor(input))
      if (url.pathname.endsWith('/auth/me')) return meResponse
      if (url.pathname.endsWith('/auth/logout')) return jsonResponse(204)
      if (url.pathname.endsWith('/usuarios')) return jsonResponse(200, { total: 0, page: 1, limit: 10, data: [] })
      if (url.pathname.endsWith('/pacientes')) return jsonResponse(200, { total: 0, page: 1, limit: 12, data: [] })
      return jsonResponse(401, { statusCode: 401 })
    }
    renderApplication(initialPath, fetcher, token, paths)

    if (token) expect(await screen.findByRole('heading', { name: 'Usuarios' })).toBeInTheDocument()
    else expect(await screen.findByText('Inicia sesión en tu panel de AiKO')).toBeInTheDocument()
    await waitFor(() => expect(paths.length).toBeGreaterThan(0))
    expect(paths.length - 1).toBeLessThanOrEqual(2)
    expect(userData.rol).toBe('Administrador')
  })

  it('cierra la sesión y muestra un mensaje si el login devuelve un rol desconocido', async () => {
    const user = userEvent.setup()
    const apiCalls: string[] = []
    const unknownUser = { ...specialist, rol: 'Supervisor' }
    renderApplication('/login', applicationFetch(unknownUser, 'unknown-role-token', apiCalls))
    await user.type(screen.getByLabelText('Correo electrónico'), 'user@example.com')
    await user.type(screen.getByLabelText('Contraseña'), 'SafePassword1')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByText(/No reconocemos el rol de esta cuenta/)).toBeInTheDocument()
    expect(tokenStorage.get()).toBeNull()
    expect(apiCalls.some((call) => call.endsWith('/auth/logout'))).toBe(true)
  })

  it('mantiene la ruta pública en estado de carga mientras restaura una sesión', async () => {
    let resolveCurrentUser!: (response: Response) => void
    tokenStorage.set('slow-restore-token')
    const paths: string[] = []
    renderApplication('/login', (input) => {
      const url = new URL(routeFor(input))
      if (url.pathname.endsWith('/auth/me')) {
        return new Promise<Response>((resolve) => { resolveCurrentUser = resolve })
      }
      return jsonResponse(204)
    }, undefined, paths)

    await waitFor(() => expect(resolveCurrentUser).toBeTypeOf('function'))
    expect(screen.getAllByRole('status').some((status) => status.textContent?.includes('Restaurando sesión'))).toBe(true)
    expect(screen.queryByText('Inicia sesión en tu panel de AiKO')).not.toBeInTheDocument()
    expect(paths).toEqual(['/login'])
    resolveCurrentUser(jsonResponse(200, { ...specialist, rol: 'Administrador' }))
    expect(await screen.findByRole('heading', { name: 'Usuarios' })).toBeInTheDocument()
  })

  it('muestra ErrorBoundary con botón para volver al inicio si una página falla al dibujarse', async () => {
    const user = userEvent.setup()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    function BrokenPage(): never {
      throw new Error('render failure')
    }
    render(
      <MemoryRouter initialEntries={['/throw']}>
        <Routes>
          <Route path="/throw" element={<PanelErrorBoundary><BrokenPage /></PanelErrorBoundary>} />
          <Route path="/" element={<p>Inicio de prueba</p>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { name: 'Ocurrió un error al mostrar el panel' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Volver al inicio' }))
    expect(await screen.findByText('Inicio de prueba')).toBeInTheDocument()
    errorSpy.mockRestore()
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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../auth/AuthContext'
import { AdminLayout, SpecialistLayout } from '../components/layout/PanelLayout'

type PanelRole = 'Administrador' | 'Especialista'

function response(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function routeFor(input: RequestInfo | URL): string {
  if (input instanceof Request) return input.url
  return input instanceof URL ? input.toString() : input
}

function userFor(role: PanelRole): AuthContextValue['user'] {
  return {
    id: role === 'Especialista' ? 'specialist-1' : 'admin-1',
    nombre: role === 'Especialista' ? 'Ana Pérez' : 'Carlos Ruiz',
    correo: role === 'Especialista' ? 'ana@example.com' : 'carlos@example.com',
    rol: role,
    estado: true,
    intentos_fallidos: 0,
  }
}

function authFor(role: PanelRole): AuthContextValue {
  return {
    user: userFor(role),
    loading: false,
    patientRejected: false,
    sessionError: null,
    signIn: async () => { throw new Error('No se usa en este test.') },
    signOut: async () => {},
    rejectPatient: async () => {},
    rejectUnsupportedRole: async () => {},
    clearPatientNotice: () => {},
  }
}

function CurrentPath() {
  const { pathname } = useLocation()
  return <output aria-label="Ruta actual">{pathname}</output>
}

function renderPanel({
  role = 'Administrador',
  path = role === 'Administrador' ? '/admin/usuarios' : '/especialista/pacientes',
  fetcher = () => response(200, []),
  greeting = false,
}: {
  role?: PanelRole
  path?: string
  fetcher?: (input: RequestInfo | URL) => Response | Promise<Response>
  greeting?: boolean
} = {}) {
  vi.stubGlobal('fetch', vi.fn(fetcher))
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false }, mutations: { retry: false } },
  })
  const Layout = role === 'Administrador' ? AdminLayout : SpecialistLayout
  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={authFor(role)}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="*" element={<><CurrentPath />{greeting && <p>Hola, {userFor(role)?.nombre?.split(' ')[0]}</p>}</>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('layout del panel', () => {
  it('no monta una barra lateral fija y el cajón especialista abre, cierra y devuelve el foco', async () => {
    const user = userEvent.setup()
    renderPanel({ role: 'Especialista' })

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const openButton = screen.getByRole('button', { name: 'Abrir menú' })
    expect(openButton).toHaveAttribute('aria-expanded', 'false')
    expect(openButton).toHaveAttribute('aria-controls', 'panel-navigation-dialog')

    await user.click(openButton)
    const drawer = screen.getByRole('dialog', { name: 'Navegación principal' })
    expect(drawer).toHaveAttribute('aria-modal', 'true')
    expect(document.body.style.overflow).toBe('hidden')
    expect(within(drawer).getByRole('link', { name: 'Mis pacientes' })).toHaveAttribute('aria-current', 'page')
    expect(within(drawer).getByRole('link', { name: 'Alertas' })).toBeInTheDocument()
    expect(within(drawer).getByRole('link', { name: 'Ejercicios' })).toBeInTheDocument()
    await user.tab({ shift: true })
    expect(within(drawer).getByRole('link', { name: 'Ejercicios' })).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
    expect(openButton).toHaveFocus()

    await user.click(openButton)
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement!)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(openButton).toHaveFocus()
  })

  it('cierra el cajón al elegir una ruta y conserva visible la página actual', async () => {
    const user = userEvent.setup()
    renderPanel({ role: 'Especialista' })
    await user.click(screen.getByRole('button', { name: 'Abrir menú' }))
    const drawer = screen.getByRole('dialog')

    await user.click(within(drawer).getByRole('link', { name: 'Alertas' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Ruta actual')).toHaveTextContent('/especialista/alertas')
    await user.click(screen.getByRole('button', { name: 'Abrir menú' }))
    expect(within(screen.getByRole('dialog')).getByRole('link', { name: 'Alertas' })).toHaveAttribute('aria-current', 'page')
  })

  it('muestra solo la navegación de administrador, sin buscador ni campana', async () => {
    const user = userEvent.setup()
    renderPanel({ role: 'Administrador' })
    await user.click(screen.getByRole('button', { name: 'Abrir menú' }))
    const drawer = screen.getByRole('dialog')

    expect(within(drawer).getByRole('link', { name: 'Usuarios' })).toHaveAttribute('aria-current', 'page')
    expect(within(drawer).getByRole('link', { name: 'Indicadores' })).toBeInTheDocument()
    expect(within(drawer).queryByRole('link', { name: 'Mis pacientes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Buscar pacientes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Alertas' })).not.toBeInTheDocument()
  })

  it('muestra una sola vez el saludo de la página principal, no en la barra superior', () => {
    renderPanel({ role: 'Especialista', greeting: true })
    expect(screen.getAllByText('Hola, Ana')).toHaveLength(1)
  })

  it('busca pacientes tras el debounce y permite seleccionar un resultado con flechas y Enter', async () => {
    const patient = {
      id: 'patient-7',
      nombre: 'Camila Pérez',
      edad: 39,
      estado: true,
      fecha_nacimiento: '1987-02-03',
      correo: 'camila@example.com',
      cedula: '12345',
      usuario_id: 'user-7',
      especialista_id: 'specialist-1',
      xp_total: 0,
      nivel_actual: 1,
      umbral_bajo_rendimiento: 50,
      umbral_dias_inactividad: 7,
      fecha_asignacion: '2026-01-01',
      alertas_activas: 0,
      progreso_ruta: null,
    }
    const fetcher = vi.fn((input: RequestInfo | URL) => {
      const url = new URL(routeFor(input))
      if (url.pathname.endsWith('/pacientes/buscar')) {
        return response(200, { total: 1, page: 1, limit: 5, data: [patient] })
      }
      return response(200, [])
    })
    const user = userEvent.setup()
    renderPanel({ role: 'Especialista', fetcher })
    const input = screen.getByRole('combobox', { name: 'Buscar pacientes' })

    await user.type(input, 'Camila')
    expect(fetcher.mock.calls.some(([request]) => new URL(routeFor(request)).pathname.endsWith('/pacientes/buscar'))).toBe(false)
    expect(await screen.findByRole('option', { name: /Camila Pérez.*39 años/ })).toBeInTheDocument()

    const searchRequest = fetcher.mock.calls
      .map(([request]) => new URL(routeFor(request)))
      .find((url) => url.pathname.endsWith('/pacientes/buscar'))
    expect(searchRequest?.searchParams.get('q')).toBe('Camila')
    expect(input).toHaveAttribute('role', 'combobox')
    expect(input).not.toHaveAttribute('aria-activedescendant')

    await user.keyboard('{ArrowDown}')
    expect(input).toHaveAttribute('aria-activedescendant', 'patient-quick-search-option-0')
    await user.keyboard('{Enter}')
    expect(screen.getByLabelText('Ruta actual')).toHaveTextContent('/especialista/pacientes/patient-7')
  })

  it('expone estados de carga, sin resultados y error en el buscador', async () => {
    const user = userEvent.setup()
    let resolveSearch: ((value: Response) => void) | undefined
    const fetcher = vi.fn((input: RequestInfo | URL) => {
      const url = new URL(routeFor(input))
      if (url.pathname.endsWith('/pacientes/buscar')) {
        return new Promise<Response>((resolve) => { resolveSearch = resolve })
      }
      return response(200, [])
    })
    renderPanel({ role: 'Especialista', fetcher })
    const input = screen.getByRole('combobox', { name: 'Buscar pacientes' })
    await user.type(input, 'inexistente')
    expect(await screen.findByText('Buscando pacientes…')).toBeInTheDocument()
    await waitFor(() => expect(resolveSearch).toBeDefined())
    resolveSearch?.(response(200, { total: 0, page: 1, limit: 5, data: [] }))
    expect(await screen.findByText('No se encontraron pacientes.')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('muestra errores explícitos cuando falla la búsqueda de pacientes', async () => {
    const user = userEvent.setup()
    renderPanel({
      role: 'Especialista',
      fetcher: (input) => {
        const url = new URL(routeFor(input))
        if (url.pathname.endsWith('/pacientes/buscar')) return response(500, { message: 'Error de búsqueda' })
        return response(200, [])
      },
    })
    await user.type(screen.getByRole('combobox', { name: 'Buscar pacientes' }), 'Camila')
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo completar la búsqueda')
  })

  it('muestra el contador accesible de alertas activas devuelto por el servidor', async () => {
    renderPanel({
      role: 'Especialista',
      fetcher: (input) => {
        const url = new URL(routeFor(input))
        if (url.pathname.endsWith('/alertas')) {
          return response(200, [{ id: 'a-1', estado: 'Activa' }, { id: 'a-2', estado: 'Resuelta' }])
        }
        return response(200, [])
      },
    })

    expect(await screen.findByRole('link', { name: '1 alerta activa' })).toHaveAttribute('href', '/especialista/alertas')
    expect(screen.getByText('1', { selector: 'span' })).toBeInTheDocument()
  })

  it('oculta el contador de alertas cuando no hay alertas activas', async () => {
    renderPanel({
      role: 'Especialista',
      fetcher: (input) => {
        const url = new URL(routeFor(input))
        if (url.pathname.endsWith('/alertas')) return response(200, [])
        return response(200, [])
      },
    })

    expect(await screen.findByRole('link', { name: 'Alertas' })).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})

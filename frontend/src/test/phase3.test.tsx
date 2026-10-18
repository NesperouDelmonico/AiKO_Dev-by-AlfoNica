import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AccountFormPage, EditUserPage } from '../features/admin/AccountFormPage'
import { UsersPage } from '../features/admin/UsersPage'
import { ExercisesPage } from '../features/exercises/ExercisesPage'
import { AlertsPage } from '../features/alerts/AlertsPage'
import { RouteBuilderPage } from '../features/patients/RouteBuilderPage'
import { AuthContext, type AuthContextValue } from '../auth/AuthContext'

function response(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function requestUrl(input: RequestInfo | URL): URL {
  return new URL(input instanceof Request ? input.url : input instanceof URL ? input.toString() : input)
}

function requestBody(input: RequestInfo | URL): Promise<unknown> {
  return input instanceof Request ? input.clone().json() : Promise.resolve(undefined)
}

function renderPage(path: string, routes: Array<{ path: string; element: React.ReactNode }>, fetcher: (input: RequestInfo | URL) => Response | Promise<Response>, auth?: AuthContextValue) {
  vi.stubGlobal('fetch', vi.fn(fetcher))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={auth ?? null}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>{routes.map((route) => <Route key={route.path} path={route.path} element={route.element} />)}</Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

const adminRoutes = [{ path: '/admin/usuarios', element: <UsersPage /> }]

afterEach(() => vi.unstubAllGlobals())

describe('fase 3: administración y catálogo', () => {
  it('espera el debounce en la búsqueda de usuarios y presenta badges textuales', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL) => Promise<Response>>(() => Promise.resolve(response(200, {
      total: 1, page: 1, limit: 10,
      data: [{ id: 'u1', nombre: 'Laura Pérez', correo: 'laura@example.com', rol: 'Especialista', estado: true, intentos_fallidos: 0 }],
    })))
    renderPage('/admin/usuarios', adminRoutes, fetchMock)
    expect(await screen.findByText('Laura Pérez')).toBeInTheDocument()
    expect(screen.getByText('Especialista', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('Activo', { selector: 'span' })).toBeInTheDocument()
    const before = fetchMock.mock.calls.length
    const user = userEvent.setup()
    await user.type(screen.getByRole('textbox', { name: 'Buscar por nombre o correo' }), 'laura')
    expect(fetchMock.mock.calls.length).toBe(before)
    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => requestUrl(input).searchParams.get('q') === 'laura')).toBe(true))
  })

  it.each([
    [409, 'El correo ya existe.'],
    [503, 'No se pudo enviar el correo; la cuenta quedó inactiva. Restablece su contraseña desde la edición del usuario.'],
  ])('crea una cuenta sin contraseña y muestra el error %i', async (status, expected) => {
    const fetcher = async (input: RequestInfo | URL) => {
      const url = requestUrl(input)
      if (url.pathname.endsWith('/usuarios/especialistas')) {
        expect(await requestBody(input)).toEqual({ nombre: 'Ana Pérez', cedula: '123456', correo: 'ana@example.com' })
        return response(status, { statusCode: status, message: 'El correo ya existe.' })
      }
      return response(404, { message: 'No encontrado' })
    }
    renderPage('/admin/usuarios/nuevo-especialista', [{ path: '/admin/usuarios/nuevo-especialista', element: <AccountFormPage role="Especialista" /> }], fetcher)
    expect(screen.queryByLabelText(/contraseña/i)).not.toBeInTheDocument()
    expect(screen.getByText('Se enviará una contraseña temporal al correo.')).toBeInTheDocument()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Nombre'), 'Ana Pérez')
    await user.type(screen.getByLabelText('Cédula'), '123456')
    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@example.com')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(await screen.findByText(expected)).toBeInTheDocument()
  })

  it('confirma antes de desactivar y muestra el conflicto de último administrador', async () => {
    const fetcher = (input: RequestInfo | URL) => {
      const url = requestUrl(input)
      if (url.pathname.endsWith('/usuarios/user-1') && (input instanceof Request ? input.method : 'GET') === 'GET') return response(200, { id: 'user-1', nombre: 'Ana Admin', cedula: '12345', correo: 'ana@example.com', rol: 'Administrador', estado: true, intentos_fallidos: 0 })
      if (url.pathname.endsWith('/usuarios/user-1/estado')) return response(409, { statusCode: 409, message: 'No se puede desactivar el último administrador activo.' })
      return response(404, { message: 'No encontrado' })
    }
    renderPage('/admin/usuarios/user-1', [{ path: '/admin/usuarios/:id', element: <EditUserPage /> }], fetcher)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Desactivar usuario' }))
    expect(await screen.findByRole('dialog', { name: 'Desactivar usuario' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Desactivar$/ }))
    expect(await screen.findByText('No se puede desactivar el último administrador activo.')).toBeInTheDocument()
  })

  it('pide confirmación para restablecer contraseña y muestra el error 503', async () => {
    const fetcher = (input: RequestInfo | URL) => {
      const url = requestUrl(input)
      if (url.pathname.endsWith('/usuarios/user-2') && (input instanceof Request ? input.method : 'GET') === 'GET') return response(200, { id: 'user-2', nombre: 'Especialista', cedula: '12345', correo: 'esp@example.com', rol: 'Especialista', estado: true, intentos_fallidos: 0 })
      if (url.pathname.endsWith('/restablecer-contrasena')) return response(503, { statusCode: 503, message: 'Error' })
      return response(404, { message: 'No encontrado' })
    }
    renderPage('/admin/usuarios/user-2', [{ path: '/admin/usuarios/:id', element: <EditUserPage /> }], fetcher)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Restablecer contraseña' }))
    expect(await screen.findByRole('dialog', { name: 'Restablecer contraseña' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Restablecer$/ }))
    expect(await screen.findByText('No se pudo entregar la contraseña; la cuenta no se modificó.')).toBeInTheDocument()
  })

  it('valida JSON y nivel de dificultad; explica el conflicto 409 al editar', async () => {
    const seen: string[] = []
    const fetcher = (input: RequestInfo | URL) => {
      const url = requestUrl(input)
      seen.push(`${input instanceof Request ? input.method : 'GET'} ${url.pathname}`)
      if (url.pathname.endsWith('/ejercicios') && (input instanceof Request ? input.method : 'GET') === 'GET') return response(200, [{ id: 'ex1', nombre: 'Memoria', categoria: 'Memoria', nivel_dificultad: 2, estado: 'Activo', instrucciones: 'Instrucciones', parametros: {} }])
      if (url.pathname.endsWith('/ejercicios/ex1')) return response(409, { statusCode: 409, message: 'Ejercicio en uso activo.' })
      return response(404, { message: 'No encontrado' })
    }
    renderPage('/especialista/ejercicios', [{ path: '/especialista/ejercicios', element: <ExercisesPage /> }], fetcher)
    const user = userEvent.setup()
    expect(await screen.findByRole('button', { name: 'Editar' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Editar' }))
    const dialog = await screen.findByRole('dialog', { name: 'Editar ejercicio' })
    await user.clear(within(dialog).getByLabelText('Parámetros (JSON)'))
    fireEvent.change(within(dialog).getByLabelText('Parámetros (JSON)'), { target: { value: '{bad' } })
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    expect(await within(dialog).findByText('Ingresa un objeto JSON válido para los parámetros.')).toBeInTheDocument()
    await user.clear(within(dialog).getByLabelText('Parámetros (JSON)'))
    fireEvent.change(within(dialog).getByLabelText('Parámetros (JSON)'), { target: { value: '{}' } })
    await user.clear(within(dialog).getByLabelText('Nivel de dificultad'))
    await user.type(within(dialog).getByLabelText('Nivel de dificultad'), '0')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    expect(await within(dialog).findByText('El nivel de dificultad debe ser un entero mayor que 0.')).toBeInTheDocument()
    await user.clear(within(dialog).getByLabelText('Nivel de dificultad'))
    await user.type(within(dialog).getByLabelText('Nivel de dificultad'), '2')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(seen).toContain('PUT /v1/ejercicios/ex1'))
    expect(await within(dialog).findByText('No se puede editar este ejercicio porque está en una ruta activa.')).toBeInTheDocument()
  })
})

describe('fase 3: alertas y rutas', () => {
  const auth: AuthContextValue = {
    user: { id: 'specialist-1', nombre: 'Especialista', correo: 's@example.com', rol: 'Especialista', estado: true, intentos_fallidos: 0 },
    loading: false, patientRejected: false, sessionError: null,
    signIn: vi.fn(), signOut: vi.fn(), rejectPatient: vi.fn(), rejectUnsupportedRole: vi.fn(), clearPatientNotice: vi.fn(),
  }

  it('presenta el estado textual de las alertas y enlaza al paciente', async () => {
    const fetcher = () => response(200, [{ id: 'a1', paciente_id: 'p1', tipo: 'BajoRendimiento', estado: 'Activa', fecha_generada: '2026-10-01T12:00:00Z' }])
    renderPage('/especialista/alertas', [{ path: '/especialista/alertas', element: <AlertsPage /> }], fetcher, auth)
    expect(await screen.findByText('Bajo rendimiento')).toBeInTheDocument()
    expect(screen.getByText('Activa')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Ver paciente' })).toHaveAttribute('href', '/especialista/pacientes/p1')
  })

  it('excluye ejercicios de nivel superior y envía orden consecutivo al crear ruta', async () => {
    let createdOrder: unknown
    const fetcher = async (input: RequestInfo | URL) => {
      const url = requestUrl(input)
      const method = input instanceof Request ? input.method : 'GET'
      if (url.pathname.endsWith('/pacientes/p1') && method === 'GET') return response(200, { id: 'p1', nombre: 'Paciente', especialista_id: 's1', nivel_actual: 2 })
      if (url.pathname.endsWith('/rutas/activa')) return response(404, { statusCode: 404, message: 'Sin ruta activa' })
      if (url.pathname.endsWith('/ejercicios') && method === 'GET') return response(200, [
        { id: 'e1', nombre: 'Ejercicio uno', categoria: 'Memoria', nivel_dificultad: 1, estado: 'Activo' },
        { id: 'e2', nombre: 'Ejercicio dos', categoria: 'Atención', nivel_dificultad: 2, estado: 'Activo' },
        { id: 'e3', nombre: 'Ejercicio avanzado', categoria: 'Velocidad', nivel_dificultad: 3, estado: 'Activo' },
      ])
      if (url.pathname.endsWith('/pacientes/p1/rutas') && method === 'POST') {
        createdOrder = (await requestBody(input)) as { ejercicios: Array<{ ejercicio_id: string; orden: number }> }
        return response(201, { id: 'r1', estado: 'Activa' })
      }
      return response(404, { message: 'No encontrado' })
    }
    renderPage('/especialista/pacientes/p1/ruta', [{ path: '/especialista/pacientes/:id/ruta', element: <RouteBuilderPage /> }], fetcher)
    const user = userEvent.setup()
    expect(await screen.findByText('Ejercicio avanzado')).toBeInTheDocument()
    const select = screen.getByRole('combobox', { name: 'Ejercicio para agregar' })
    expect(within(select).queryByRole('option', { name: /Ejercicio avanzado/ })).not.toBeInTheDocument()
    await user.selectOptions(select, 'e1')
    await user.click(screen.getByRole('button', { name: 'Agregar al borrador' }))
    await user.selectOptions(select, 'e2')
    await user.click(screen.getByRole('button', { name: 'Agregar al borrador' }))
    await user.click(screen.getByRole('button', { name: 'Crear ruta' }))
    await waitFor(() => expect(createdOrder).toEqual({ ejercicios: [{ ejercicio_id: 'e1', orden: 1 }, { ejercicio_id: 'e2', orden: 2 }] }))
  })

  it('etiqueta el primer paso pendiente como En curso y no ofrece acciones al completado', async () => {
    const fetcher = (input: RequestInfo | URL) => {
      const url = requestUrl(input)
      if (url.pathname.endsWith('/pacientes/p1')) return response(200, { id: 'p1', nombre: 'Paciente', especialista_id: 's1', nivel_actual: 3 })
      if (url.pathname.endsWith('/rutas/activa')) return response(200, { id: 'r1', estado: 'Activa', ejercicios: [
        { id: 'step1', ejercicio_id: 'e1', orden: 1, estado: 'Completado' },
        { id: 'step2', ejercicio_id: 'e2', orden: 2, estado: 'Pendiente' },
        { id: 'step3', ejercicio_id: 'e3', orden: 3, estado: 'Pendiente' },
      ] })
      if (url.pathname.endsWith('/ejercicios')) return response(200, [
        { id: 'e1', nombre: 'Paso completado', nivel_dificultad: 1, estado: 'Activo' },
        { id: 'e2', nombre: 'Paso en curso', nivel_dificultad: 1, estado: 'Activo' },
        { id: 'e3', nombre: 'Paso pendiente', nivel_dificultad: 1, estado: 'Activo' },
      ])
      if (url.pathname.endsWith('/rutas/r1/progreso')) return response(200, { porcentaje: 33, completados: 1, pendientes: 2 })
      return response(404, { message: 'No encontrado' })
    }
    renderPage('/especialista/pacientes/p1/ruta', [{ path: '/especialista/pacientes/:id/ruta', element: <RouteBuilderPage /> }], fetcher)
    expect(await screen.findByText('En curso')).toBeInTheDocument()
    expect(screen.getByText('Completado')).toBeInTheDocument()
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Eliminar' })).toHaveLength(2)
  })
})

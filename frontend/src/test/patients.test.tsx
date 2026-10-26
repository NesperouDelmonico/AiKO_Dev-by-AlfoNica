import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NewPatientPage } from '../features/patients/NewPatientPage'
import { PatientDetailPage } from '../features/patients/PatientDetailPage'
import { PatientsListPage } from '../features/patients/PatientsListPage'

function response(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function routeFor(call: readonly (RequestInfo | URL | RequestInit | undefined)[]): string {
  const request = call[0]
  return request instanceof Request ? request.url : String(request)
}

function renderPage(path: string, element: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/especialista/pacientes" element={<PatientsListPage />} />
          <Route path="/especialista/pacientes/nuevo" element={<NewPatientPage />} />
          <Route path="/especialista/pacientes/:id" element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const patient = {
  id: 'patient-1',
  nombre: 'María Gómez',
  correo: 'maria@example.com',
  cedula: '12345',
  estado: false,
  fecha_nacimiento: null,
  edad: null,
  fecha_asignacion: '2026-02-10',
  nivel_actual: 3,
  xp_total: 40,
  umbral_bajo_rendimiento: 50,
  umbral_dias_inactividad: 7,
  alertas_activas: 1,
  progreso_ruta: { ruta_id: 'route-1', total: 3, completados: 1, porcentaje: 33 },
}

async function fillPatientForm(user: ReturnType<typeof userEvent.setup>, date = '1990-01-01') {
  await user.type(screen.getByLabelText('Nombre completo'), 'María Gómez')
  await user.type(screen.getByLabelText('Cédula'), '987654')
  await user.type(screen.getByLabelText('Correo electrónico'), 'maria@example.com')
  await user.type(screen.getByLabelText('Fecha de nacimiento'), date)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('pantallas de pacientes', () => {
  it('presenta los pacientes asignados y comunica las alertas e inactividad con texto', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(response(200, { total: 1, page: 1, limit: 12, data: [patient] }))))
    renderPage('/especialista/pacientes', <PatientsListPage />)

    expect(await screen.findByRole('link', { name: 'Ver detalle de María Gómez' })).toBeInTheDocument()
    expect(screen.getByText('Requiere atención', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('Cuenta inactiva', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Progreso de ruta: 33%' })).toBeInTheDocument()
  })

  it('espera el debounce antes de buscar por nombre', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      () => Promise.resolve(response(200, { total: 0, page: 1, limit: 12, data: [] })),
    )
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderPage('/especialista/pacientes', <PatientsListPage />)
    await screen.findByText('Aún no tienes pacientes asignados')
    const callsBeforeTyping = fetchMock.mock.calls.length

    await user.type(screen.getByRole('textbox', { name: 'Buscar paciente por nombre' }), 'Ana')
    expect(fetchMock.mock.calls.length).toBe(callsBeforeTyping)
    await waitFor(() => {
      expect(fetchMock.mock.calls.some((call) => new URL(routeFor(call)).searchParams.get('q') === 'Ana')).toBe(true)
    }, { timeout: 1500 })
  })

  it('muestra el estado vacío cuando la lista no tiene pacientes', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(response(200, { total: 0, page: 1, limit: 12, data: [] }))))
    renderPage('/especialista/pacientes', <PatientsListPage />)

    expect(await screen.findByText('Aún no tienes pacientes asignados')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Nuevo paciente' })).toHaveLength(2)
  })

  it('usa la respuesta paginada con métricas de alertas y ruta al filtrar por estado', async () => {
    const searchPatient = {
      id: 'patient-search',
      nombre: 'Camila Pérez',
      correo: 'camila@example.com',
      cedula: '1234',
      estado: false,
      fecha_nacimiento: null,
      edad: null,
      xp_total: 0,
      nivel_actual: 1,
      alertas_activas: 1,
      progreso_ruta: null,
    }
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = new URL(input instanceof Request ? input.url : String(input))
      if (url.pathname.endsWith('/pacientes/buscar')) {
        return Promise.resolve(response(200, {
          total: 1,
          page: 1,
          limit: 12,
          data: [searchPatient],
        }))
      }
      return Promise.resolve(response(200, { total: 0, page: 1, limit: 12, data: [] }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderPage('/especialista/pacientes', <PatientsListPage />)
    await screen.findByText('Aún no tienes pacientes asignados')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrar por estado de cuenta' }), 'false')

    expect(await screen.findByRole('link', { name: 'Ver detalle de Camila Pérez' })).toBeInTheDocument()
    expect(screen.getByText('Requiere atención')).toBeInTheDocument()
    const patientCard = screen.getByRole('link', { name: 'Ver detalle de Camila Pérez' })
    expect(within(patientCard).getByText('Cuenta inactiva')).toBeInTheDocument()
    expect(within(patientCard).getByText('Sin ruta activa')).toBeInTheDocument()
    const searchUrl = fetchMock.mock.calls
      .map(([input]) => new URL(input instanceof Request ? input.url : String(input)))
      .find((url) => url.pathname.endsWith('/pacientes/buscar'))
    expect(searchUrl?.searchParams.get('page')).toBe('1')
    expect(searchUrl?.searchParams.get('limit')).toBe('12')
  })

  it('rechaza la fecha futura antes de enviar el nuevo paciente', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(response(201, { ...patient, id: 'new-patient' })))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderPage('/especialista/pacientes/nuevo', <NewPatientPage />)
    await fillPatientForm(user, '2099-01-01')
    await user.click(screen.getByRole('button', { name: 'Crear paciente' }))

    expect(await screen.findByText('Ingresa una fecha válida, no futura y con edad máxima de 120 años.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('valida que los umbrales estén dentro del rango y que los días sean enteros positivos', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(response(201, { ...patient, id: 'new-patient' })))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderPage('/especialista/pacientes/nuevo', <NewPatientPage />)
    await fillPatientForm(user)
    const performanceThreshold = screen.getByLabelText('Umbral de bajo rendimiento (%)')
    const inactivityDays = screen.getByLabelText('Días de inactividad')
    await user.clear(performanceThreshold)
    await user.type(performanceThreshold, '101')
    await user.clear(inactivityDays)
    await user.type(inactivityDays, '1.5')
    await user.click(screen.getByRole('button', { name: 'Crear paciente' }))

    expect(await screen.findByText('El umbral máximo es 100.')).toBeInTheDocument()
    expect(screen.getByText('Ingresa un número entero de días.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    [409, 'El correo o la cédula ya existen. Verifica ambos datos.'],
    [503, 'No se pudo enviar el correo; la cuenta quedó inactiva. Pide al administrador que restablezca la contraseña'],
  ])('presenta mensaje específico al crear paciente en HTTP %i', async (status, expectedMessage) => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(response(status, { statusCode: status, message: 'conflicto de datos' }))))
    const user = userEvent.setup()
    renderPage('/especialista/pacientes/nuevo', <NewPatientPage />)
    await fillPatientForm(user)
    await user.click(screen.getByRole('button', { name: 'Crear paciente' }))

    expect(await screen.findByText(expectedMessage)).toBeInTheDocument()
  })

  it.each([
    [403, 'No tienes acceso a este paciente'],
    [404, 'No encontramos este paciente'],
  ])('muestra un estado explícito si el detalle responde HTTP %i', async (status, title) => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(response(status, { statusCode: status, message: 'error' }))))
    renderPage('/especialista/pacientes/patient-1', <PatientDetailPage />)

    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a mis pacientes' })).toBeInTheDocument()
  })

  it('muestra edad nula como raya y etiqueta como no aprobado el intento sin XP', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const url = new URL(input instanceof Request ? input.url : String(input))
      if (url.pathname === '/v1/pacientes/patient-1') return Promise.resolve(response(200, patient))
      if (url.pathname === '/v1/pacientes/patient-1/rutas/activa') return Promise.resolve(response(404, { statusCode: 404, message: 'sin ruta' }))
      if (url.pathname === '/v1/pacientes/patient-1/progreso/dominio') return Promise.resolve(response(200, []))
      if (url.pathname === '/v1/pacientes/patient-1/progreso/temporal') return Promise.resolve(response(200, { serie: [] }))
      if (url.pathname === '/v1/pacientes/patient-1/historial') return Promise.resolve(response(200, {
        total: 1,
        page: 1,
        limit: 10,
        data: [{ id: 'attempt-1', ejercicio_nombre: 'Memoria breve', categoria: 'Memoria', puntaje: 25, aciertos: 1, tiempo_reaccion_ms: null, xp_ganado: 0, fecha: '2026-04-03T14:30:00.000Z' }],
      }))
      if (url.pathname === '/v1/pacientes/patient-1/alertas') return Promise.resolve(response(200, []))
      if (url.pathname === '/v1/pacientes/patient-1/perfil-logros') return Promise.resolve(response(200, { nivel_actual: 3, xp_total: 40, insignias: [] }))
      if (url.pathname === '/v1/pacientes/patient-1/observaciones') return Promise.resolve(response(200, { total: 0, data: [] }))
      return Promise.resolve(response(200, []))
    }))
    renderPage('/especialista/pacientes/patient-1', <PatientDetailPage />)

    expect(await screen.findByRole('heading', { name: 'María Gómez' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reasignar/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/reasignar/i)).not.toBeInTheDocument()
    const ageLabel = screen.getByText('Edad')
    expect(ageLabel.parentElement).toHaveTextContent('—')
    expect(await screen.findByText('Memoria breve')).toBeInTheDocument()
    expect(screen.getByText('No aprobado')).toBeInTheDocument()
  })

  it('valida la longitud mínima de observación y al guardar actualiza la lista', async () => {
    let observations: Array<{ id: string; texto: string; fecha: string }> = []
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init)
      const url = new URL(request.url)
      if (url.pathname === '/v1/pacientes/patient-1') return Promise.resolve(response(200, patient))
      if (url.pathname === '/v1/pacientes/patient-1/rutas/activa') return Promise.resolve(response(404, { statusCode: 404 }))
      if (url.pathname === '/v1/pacientes/patient-1/progreso/dominio') return Promise.resolve(response(200, []))
      if (url.pathname === '/v1/pacientes/patient-1/progreso/temporal') return Promise.resolve(response(200, { serie: [] }))
      if (url.pathname === '/v1/pacientes/patient-1/historial') return Promise.resolve(response(200, { total: 0, data: [] }))
      if (url.pathname === '/v1/pacientes/patient-1/alertas') return Promise.resolve(response(200, []))
      if (url.pathname === '/v1/pacientes/patient-1/perfil-logros') return Promise.resolve(response(200, { nivel_actual: 3, xp_total: 40, insignias: [] }))
      if (url.pathname === '/v1/pacientes/patient-1/observaciones' && request.method === 'POST') {
        const item = { id: 'observation-1', texto: 'Seguimiento realizado', fecha: '2026-04-03T14:30:00.000Z' }
        observations = [item]
        return Promise.resolve(response(201, item))
      }
      if (url.pathname === '/v1/pacientes/patient-1/observaciones') return Promise.resolve(response(200, { total: observations.length, data: observations }))
      return Promise.resolve(response(200, []))
    }))
    const user = userEvent.setup()
    renderPage('/especialista/pacientes/patient-1', <PatientDetailPage />)
    await screen.findByRole('heading', { name: 'María Gómez' })
    await user.click(screen.getByRole('button', { name: 'Nueva observación' }))
    expect(screen.getByRole('dialog', { name: 'Nueva observación' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Nueva observación' }))
    const dialog = screen.getByRole('dialog', { name: 'Nueva observación' })
    const textarea = within(dialog).getByLabelText('Observación')
    await user.type(textarea, 'No')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('La observación debe tener al menos 5 caracteres.')

    await user.clear(textarea)
    await user.type(textarea, 'Seguimiento realizado')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Seguimiento realizado')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('mantiene texto descriptivo en badges de estado', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(response(200, { total: 1, page: 1, limit: 12, data: [patient] }))))
    renderPage('/especialista/pacientes', <PatientsListPage />)

    const alertBadge = await screen.findByText('Requiere atención')
    const inactiveBadge = screen.getByText('Cuenta inactiva', { selector: 'span' })
    expect(alertBadge.tagName).toBe('SPAN')
    expect(inactiveBadge.tagName).toBe('SPAN')
    expect(alertBadge).toHaveTextContent('Requiere atención')
  })
})

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../auth/AuthContext'
import { ToastProvider } from '../components/ui/ToastProvider'
import { ExercisesPage } from '../features/exercises/ExercisesPage'
import { parameterSummary } from '../features/workshop/parameterSummary'
import { WorkshopPage } from '../features/workshop/WorkshopPage'

function response(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function requestUrl(input: RequestInfo | URL): URL {
  return new URL(input instanceof Request ? input.url : input instanceof URL ? input.toString() : input)
}

const emptyAuth: AuthContextValue = {
  user: null,
  loading: false,
  patientRejected: false,
  sessionError: null,
  signIn: async () => { throw new Error('No se usa en este test.') },
  signOut: async () => {},
  rejectPatient: async () => {},
  rejectUnsupportedRole: async () => {},
  clearPatientNotice: () => {},
}

function renderPage(path: string, element: React.ReactNode, fetcher: (input: RequestInfo | URL) => Response | Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn(fetcher))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={emptyAuth}>
        <MemoryRouter initialEntries={[path]}>
          <ToastProvider>
            <Routes><Route path={path} element={element} /></Routes>
          </ToastProvider>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

const logic = {
  id: 'w1', nombre: 'Sumas del mercado', categoria: 'Atención', tipo: 'logica', nivel_dificultad: 2, estado: 'Activo',
  instrucciones: 'Resuelve cada problema con calma.', publicado: true, autor: 'Dra. Ana', veces_importado: 3,
  es_propio: false, ya_importado: false,
  parametros: { preguntas: [{ enunciado: '¿Cuánto es 2 + 2?', opciones: ['3', '4'], correcta: 1 }] },
}
const mine = { ...logic, id: 'w2', nombre: 'Mi reacción', tipo: 'reaccion', autor: 'Yo', veces_importado: 0, es_propio: true, parametros: { intentos: 10, tiempo_limite_ms: 1500 } }

afterEach(() => vi.unstubAllGlobals())

describe('taller de ejercicios', () => {
  it('resume los parámetros de cada tipo de juego', () => {
    expect(parameterSummary(logic as never).lines).toEqual(['1 pregunta', '1. ¿Cuánto es 2 + 2?'])
    expect(parameterSummary({ tipo: 'recordar_imagenes', parametros: { imagenes: [{ imagen_id: 'a' }, { imagen_id: 'b' }], tiempo_visualizacion_segundos: 8 } } as never))
      .toEqual({ lines: ['2 imágenes para recordar', '8 s para memorizar'], images: ['a', 'b'] })
  })

  it('el especialista ve la vista previa e importa como copia', async () => {
    const seen: string[] = []
    let imported = false
    renderPage('/especialista/taller', <WorkshopPage />, (input) => {
      const url = requestUrl(input)
      const method = input instanceof Request ? input.method : 'GET'
      seen.push(`${method} ${url.pathname}`)
      if (url.pathname.endsWith('/taller/w1/importar')) { imported = true; return response(201, { ...logic, id: 'copy', origen_id: 'w1', publicado: false }) }
      if (url.pathname.endsWith('/taller')) return response(200, { total: 2, page: 1, limit: 12, data: [{ ...logic, ya_importado: imported }, mine] })
      return response(404, { message: 'No encontrado' })
    })
    const user = userEvent.setup()
    const list = await screen.findByRole('list', { name: 'Ejercicios del taller' })
    expect(await within(list).findByText('Tuyo')).toBeInTheDocument()
    expect(within(list).getByText(/Dra\. Ana · importado 3 veces/)).toBeInTheDocument()
    // Lo propio no se importa: se puede retirar.
    expect(within(list).getByRole('button', { name: 'Retirar Mi reacción del taller' })).toBeInTheDocument()

    await user.click(within(list).getByRole('button', { name: 'Ver Sumas del mercado' }))
    const dialog = await screen.findByRole('dialog', { name: 'Sumas del mercado' })
    expect(within(dialog).getByText('Resuelve cada problema con calma.')).toBeInTheDocument()
    expect(within(dialog).getByText('1. ¿Cuánto es 2 + 2?')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Importar Sumas del mercado' }))
    expect(await screen.findByText(/se agregó a tu catálogo/)).toBeInTheDocument()
    expect(seen).toContain('POST /v1/taller/w1/importar')
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Ejercicios del taller' })).getByText('Ya lo tienes')).toBeInTheDocument())
  })

  it('el administrador modera retirando ejercicios', async () => {
    const seen: string[] = []
    renderPage('/admin/taller', <WorkshopPage moderation />, (input) => {
      const url = requestUrl(input)
      const method = input instanceof Request ? input.method : 'GET'
      seen.push(`${method} ${url.pathname}`)
      if (url.pathname.endsWith('/ejercicios/w1/retirar')) return response(200, { ...logic, publicado: false })
      if (url.pathname.endsWith('/taller')) return response(200, { total: 1, page: 1, limit: 12, data: [logic] })
      return response(404, { message: 'No encontrado' })
    })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Retirar Sumas del mercado del taller' }))
    expect(await screen.findByText(/se retiró del taller/)).toBeInTheDocument()
    expect(seen).toContain('PATCH /v1/ejercicios/w1/retirar')
    expect(screen.queryByRole('button', { name: /^Importar/ })).not.toBeInTheDocument()
  })

  it('publica un ejercicio propio desde el catálogo', async () => {
    const seen: string[] = []
    let published = false
    renderPage('/especialista/ejercicios', <ExercisesPage />, (input) => {
      const url = requestUrl(input)
      const method = input instanceof Request ? input.method : 'GET'
      seen.push(`${method} ${url.pathname}`)
      const exercise = { id: 'ex1', nombre: 'Reacción', categoria: 'Velocidad', tipo: 'reaccion', nivel_dificultad: 1, estado: 'Activo', publicado: published, archivado_en: null }
      if (url.pathname.endsWith('/ejercicios/ex1/publicar')) { published = true; return response(200, { ...exercise, publicado: true }) }
      if (url.pathname.endsWith('/ejercicios')) return response(200, [exercise])
      return response(404, { message: 'No encontrado' })
    })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Publicar Reacción en el taller' }))
    expect(await screen.findByText(/ya está en el taller/)).toBeInTheDocument()
    expect(seen).toContain('PATCH /v1/ejercicios/ex1/publicar')
    expect(await screen.findByText('En el taller')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retirar Reacción del taller' })).toBeInTheDocument()
  })
})

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RouteIslands } from '../features/patients/RouteIslands'
import { RouteBuilderPage } from '../features/patients/RouteBuilderPage'
import { islandFor, routeDays } from '../features/patients/islands'
import { formatPercent, roundPercent } from '../lib/percent'
import { AikoBear } from '../components/aiko/AikoBear'
import { ToastProvider } from '../components/ui/ToastProvider'
import type { TherapyRoute } from '../features/patients/api'

function response(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
const urlOf = (input: RequestInfo | URL) => new URL(input instanceof Request ? input.url : input.toString())

afterEach(() => vi.unstubAllGlobals())

const exercises = [
  { id: 'e1', nombre: 'Palabras de la casa', tipo: 'completar_palabras' as const, categoria: 'Atención' as const, nivel_dificultad: 1, estado: 'Activo' as const },
  { id: 'e2', nombre: 'Melodía', tipo: 'memoria_secuencias' as const, categoria: 'Memoria' as const, nivel_dificultad: 1, estado: 'Activo' as const },
]

const route: TherapyRoute = {
  id: 'r1',
  estado: 'Activa',
  duracion_dias: 7,
  agenda: { dia_actual: 2, disponible: true, completada: false },
  ejercicios: [
    { id: 's1', ejercicio_id: 'e1', orden: 1, dia: 1, estado: 'Completado' },
    { id: 's2', ejercicio_id: 'e1', orden: 2, dia: 1, estado: 'Completado' },
    { id: 's3', ejercicio_id: 'e2', orden: 3, dia: 2, estado: 'Pendiente' },
    { id: 's4', ejercicio_id: 'e2', orden: 4, dia: 3, estado: 'Pendiente' },
  ],
}

describe('porcentajes', () => {
  it('redondea al entero más cercano y acota a 0–100', () => {
    expect(formatPercent(33.3333333)).toBe('33%')
    expect(formatPercent(66.6666)).toBe('67%')
    expect(roundPercent(140)).toBe(100)
    expect(formatPercent(undefined)).toBe('0%')
  })
})

describe('islas de la ruta', () => {
  it('agrupa por día con su isla y estado', () => {
    const days = routeDays(route, (id) => exercises.find((e) => e.id === id)?.tipo)
    expect(days.map((d) => [d.day, d.state, d.theme.name])).toEqual([
      [1, 'done', 'Isla de las Palabras'],
      [2, 'current', 'Isla del Gran Árbol'],
      [3, 'locked', 'Isla del Gran Árbol'],
    ])
    expect(islandFor(['logica', 'toque_color']).name).toBe('Isla de Cristal')
    expect(islandFor(['logica', 'toque_color', 'busca_imagen']).name).toBe('Isla de AiKO')
  })

  it('al tocar una isla muestra el informe del día', async () => {
    const user = userEvent.setup()
    render(
      <RouteIslands
        route={route}
        exercises={exercises}
        accessory="gafas"
        results={[
          { id: 'x1', ruta_ejercicio_id: 's1', puntaje: 58, aciertos: 5, xp_ganado: 0, fecha: '2026-11-01T15:00:00Z', monedas_ganadas: 0 },
          { id: 'x2', ruta_ejercicio_id: 's1', puntaje: 92.4, aciertos: 9, xp_ganado: 12, fecha: '2026-11-01T15:10:00Z', monedas_ganadas: 14, xp_doble: true },
          { id: 'x3', ruta_ejercicio_id: 's2', puntaje: 70, aciertos: 7, xp_ganado: 8, fecha: '2026-11-01T15:20:00Z', monedas_ganadas: 17, dibujos: ['d1'] },
        ]}
      />,
    )
    // Abre en el día en curso (día 2), que aún no tiene intentos.
    expect(screen.getByRole('region', { name: 'Informe del día 2' })).toHaveTextContent('Aún no lo ha jugado.')
    expect(screen.getByRole('img', { name: 'AiKO con gafas' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Día 1, Isla de las Palabras: Completada/ }))
    const report = screen.getByRole('region', { name: 'Informe del día 1' })
    expect(within(report).getAllByText('92%')[0]).toBeInTheDocument()
    expect(within(report).getByText('XP ×2')).toBeInTheDocument()
    expect(within(report).getByText('31')).toBeInTheDocument() // monedas del día
    expect(within(report).getByRole('link', { name: /Ver dibujo 1/ })).toBeInTheDocument()
  })
})

describe('osito', () => {
  it('usa sin accesorio si el valor no existe', () => {
    render(<AikoBear accessory="capa" />)
    expect(screen.getByRole('img', { name: 'AiKO' })).toBeInTheDocument()
  })
})

describe('editor de ruta único', () => {
  it('en una ruta activa agrega al día elegido y bloquea los días pasados', async () => {
    let added: unknown
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = urlOf(input)
      const method = input instanceof Request ? input.method : 'GET'
      if (url.pathname.endsWith('/pacientes/p1')) return response(200, { id: 'p1', nombre: 'Carlos', nivel_actual: 2 })
      if (url.pathname.endsWith('/rutas/activa')) return response(200, route)
      if (url.pathname.endsWith('/ejercicios') && method === 'GET') return response(200, exercises)
      if (url.pathname.endsWith('/rutas/r1/progreso')) return response(200, { porcentaje: 33.3333, completados: 2, pendientes: 2 })
      if (url.pathname.endsWith('/rutas/r1/ejercicios') && method === 'POST') {
        added = await (input as Request).clone().json()
        return response(201, { id: 's5' })
      }
      return response(404, { message: 'No encontrado' })
    }))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/especialista/pacientes/p1/ruta']}>
          <ToastProvider>
            <Routes><Route path="/especialista/pacientes/:id/ruta" element={<RouteBuilderPage />} /></Routes>
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    const user = userEvent.setup()
    expect(await screen.findByText('33% · 2 completados')).toBeInTheDocument()
    // Abre en el día en curso.
    expect(screen.getByRole('heading', { name: 'Día 2' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Día 1,/ }))
    expect(screen.getByText(/Este día ya pasó/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Día 5,/ }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Ejercicio para agregar al día 5' }), 'e2')
    await user.click(screen.getByRole('button', { name: 'Agregar al día 5' }))
    await waitFor(() => expect(added).toEqual({ ejercicio_id: 'e2', orden: 5, dia: 5 }))
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { deleteRouteExercise } from '../features/patients/api'

describe('deleteRouteExercise', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('accepts a 204 response with no body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(deleteRouteExercise('route-1', 'step-1')).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledOnce()
    const input = fetchMock.mock.calls[0]?.[0]
    const url = input instanceof Request ? input.url : String(input)
    expect(url).toContain('/rutas/route-1/ejercicios/step-1')
  })
})

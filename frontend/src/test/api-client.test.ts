import { describe, expect, it } from 'vitest'
import { requireResponse } from '../api/client'

describe('API error messages', () => {
  it.each([500, 502, 504])('does not expose server details for HTTP %i', async (status) => {
    const response = new Response(JSON.stringify({
      statusCode: status,
      message: 'Internal Server Error: database connection details',
    }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })

    await expect(requireResponse(undefined, response)).rejects.toMatchObject({
      status,
      message: 'Ocurrió un error en el servicio. Inténtalo de nuevo.',
    })
  })

  it('keeps actionable server messages for client errors', async () => {
    const response = new Response(JSON.stringify({ statusCode: 409, message: 'Correo duplicado' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    })

    await expect(requireResponse(undefined, response)).rejects.toMatchObject({
      status: 409,
      message: 'Correo duplicado',
    })
  })
})

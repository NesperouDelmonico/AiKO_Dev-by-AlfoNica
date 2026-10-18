import createClient from 'openapi-fetch'
import type { paths } from './schema'
import { tokenStorage } from '../auth/tokenStorage'

type UnauthorizedHandler = () => void
let unauthorizedHandler: UnauthorizedHandler | undefined
const responseErrorBodies = new WeakMap<Response, Promise<unknown>>()

export function setUnauthorizedHandler(handler: UnauthorizedHandler): () => void {
  unauthorizedHandler = handler
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = undefined
  }
}

export const apiBaseUrl: string = import.meta.env.VITE_API_URL || 'http://localhost:3000/v1'

/** URL pública de una imagen de ejercicio subida al backend. */
export function imageUrl(id: string): string {
  return `${apiBaseUrl}/imagenes/${id}`
}

export const apiClient = createClient<paths>({
  baseUrl: apiBaseUrl,
  fetch: async (request: Request) => {
    const response = await globalThis.fetch(request)
    if (!response.ok) {
      responseErrorBodies.set(response, response.clone().json().catch(() => undefined))
    }
    return response
  },
})

apiClient.use({
  async onRequest({ request }) {
    const token = tokenStorage.get()
    if (token) request.headers.set('Authorization', `Bearer ${token}`)
    return request
  },
  onResponse({ response }) {
    if (response.status === 401) unauthorizedHandler?.()
    return response
  },
})

export class ApiError extends Error {
  public readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const fixedMessages: Record<number, string> = {
  401: 'Tu sesión venció. Inicia sesión nuevamente.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'No encontramos el recurso solicitado.',
  429: 'Demasiados intentos, espera un minuto',
  503: 'Servicio no disponible',
}

async function errorFromResponse(response: Response): Promise<ApiError> {
  let serverMessage: string | undefined
  try {
    const body: unknown = await (responseErrorBodies.get(response) ?? response.clone().json())
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const message = body.message
      if (typeof message === 'string') serverMessage = message
      if (Array.isArray(message) && message.every((item): item is string => typeof item === 'string')) {
        serverMessage = message.join('. ')
      }
    }
  } catch {
    serverMessage = undefined
  }
  const message =
    response.status === 400 || response.status === 409
      ? serverMessage || 'No pudimos procesar la solicitud.'
      : fixedMessages[response.status] || serverMessage || 'Ocurrió un error al comunicarse con el servicio.'
  return new ApiError(response.status, message)
}

export async function requireResponse<T>(data: T | undefined, response: Response): Promise<T> {
  if (!response.ok) throw await errorFromResponse(response)
  if (data === undefined) throw new ApiError(response.status, 'El servicio respondió sin datos.')
  return data
}

export async function requireSuccess(response: Response): Promise<void> {
  if (!response.ok) throw await errorFromResponse(response)
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.'
}

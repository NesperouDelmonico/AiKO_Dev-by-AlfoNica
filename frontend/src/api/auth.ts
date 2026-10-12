import { apiClient, requireResponse, requireSuccess } from './client'

export async function loginRequest(correo: string, contraseña: string) {
  const result = await apiClient.POST('/auth/login', { body: { correo, contraseña } })
  return requireResponse(result.data, result.response)
}

export async function currentUserRequest() {
  const result = await apiClient.GET('/auth/me')
  return requireResponse(result.data, result.response)
}

export async function logoutRequest() {
  const result = await apiClient.POST('/auth/logout')
  await requireSuccess(result.response)
}

export async function requestPasswordReset(correo: string) {
  const result = await apiClient.POST('/auth/olvide-contrasena', { body: { correo } })
  await requireSuccess(result.response)
}

export async function resetPassword(correo: string, codigo: string, nueva_contraseña: string) {
  const result = await apiClient.POST('/auth/restablecer-contrasena', {
    body: { correo, codigo, nueva_contraseña },
  })
  await requireSuccess(result.response)
}

export async function changePassword(contraseña_actual: string, nueva_contraseña: string) {
  const result = await apiClient.PATCH('/auth/contrasena', {
    body: { contraseña_actual, nueva_contraseña },
  })
  await requireSuccess(result.response)
}

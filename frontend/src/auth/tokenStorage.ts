const TOKEN_KEY = 'aiko.session.token'

export const tokenStorage = {
  get(): string | null {
    return typeof window === 'undefined' ? null : window.sessionStorage.getItem(TOKEN_KEY)
  },
  set(token: string): void {
    window.sessionStorage.setItem(TOKEN_KEY, token)
  },
  clear(): void {
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(TOKEN_KEY)
  },
}

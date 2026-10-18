import { Spinner } from '../components/ui/Spinner'

export function SessionLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center" aria-live="polite" role="status">
      <span className="sr-only">Restaurando sesión</span>
      <Spinner className="size-8" />
    </div>
  )
}

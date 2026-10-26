import { Card } from '../../components/ui/Card'
import { ErrorState } from '../../components/ui/ErrorState'
import { Spinner } from '../../components/ui/Spinner'
import { getErrorMessage } from '../../api/client'

export function PatientListSkeleton() {
  return (
    <div aria-label="Cargando pacientes" aria-busy="true" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <Card key={index} className="animate-pulse skeleton-shimmer">
          <div className="mb-4 h-12 w-12 rounded-full bg-purple-100" />
          <div className="mb-2 h-4 w-2/3 rounded bg-purple-100" />
          <div className="h-3 w-1/2 rounded bg-purple-50" />
        </Card>
      ))}
      <Spinner className="sr-only" />
    </div>
  )
}

export function SectionSkeleton({ title }: { title: string }) {
  return (
    <Card aria-label={`Cargando ${title}`} aria-busy="true" className="animate-pulse skeleton-shimmer space-y-3">
      <div className="h-5 w-1/3 rounded bg-purple-100" />
      <div className="h-4 w-full rounded bg-purple-50" />
      <div className="h-4 w-3/4 rounded bg-purple-50" />
    </Card>
  )
}

export function QueryError({ error, retry, title }: { error: unknown; retry: () => void; title?: string }) {
  return (
    <ErrorState
      {...(title ? { title } : {})}
      message={getErrorMessage(error)}
      action={
        <button
          type="button"
          className="min-h-11 rounded-xl border border-[var(--color-border)] px-4 text-sm font-semibold text-brand-heading hover:bg-purple-50"
          onClick={retry}
        >
          Reintentar
        </button>
      }
    />
  )
}

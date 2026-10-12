import { Card } from '../components/ui/Card'

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-1 text-sm font-semibold text-brand-primary">AiKO · Panel</p>
        <h1 className="mb-0 text-3xl">{title}</h1>
      </div>
      <Card className="min-h-64">
        <h2 className="text-xl">Próximamente</h2>
        <p className="mb-0 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
          Esta sección estará disponible cuando se implemente su experiencia completa.
        </p>
      </Card>
    </div>
  )
}

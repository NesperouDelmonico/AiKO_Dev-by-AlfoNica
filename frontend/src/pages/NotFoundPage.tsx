import { Link } from 'react-router-dom'
import { Mascot } from '../components/ui/Mascot'
import { PageHeader } from '../components/ui/PageHeader'

export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-5 p-6 text-center">
      <Mascot className="size-24" />
      <PageHeader title="No encontramos esta página" description="El enlace puede haber cambiado o ya no estar disponible." />
      <Link to="/" className="inline-flex min-h-11 items-center rounded-xl bg-brand-primary px-4 font-semibold text-white no-underline hover:opacity-95">
        Volver al inicio
      </Link>
    </main>
  )
}

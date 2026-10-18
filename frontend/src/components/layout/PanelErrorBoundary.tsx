import { Component, type ReactNode } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { ErrorState } from '../ui/ErrorState'

type BoundaryProps = {
  children: ReactNode
  onGoHome: () => void
}
type BoundaryState = { failed: boolean }

class Boundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false }

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="min-h-screen p-6">
        <ErrorState
          title="Ocurrió un error al mostrar el panel"
          message="Puedes volver al inicio de tu panel e intentarlo de nuevo."
          action={
            <button
              type="button"
              className="min-h-11 rounded-xl bg-brand-primary px-4 py-2 font-semibold text-white hover:bg-[var(--color-primary-hover)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brand-primary"
              onClick={this.props.onGoHome}
            >
              Volver al inicio
            </button>
          }
        />
      </main>
    )
  }
}

export function PanelErrorBoundary({ children }: { children?: ReactNode }) {
  const navigate = useNavigate()
  return (
    <Boundary onGoHome={() => navigate('/')}>
      {children ?? <Outlet />}
    </Boundary>
  )
}

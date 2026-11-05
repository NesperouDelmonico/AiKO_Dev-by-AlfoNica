import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Mascot } from '../components/ui/Mascot'
import { ToastProvider } from '../components/ui/ToastProvider'
import { useToast } from '../components/ui/toastContext'

function ToastButtons() {
  const { notify } = useToast()
  return (
    <>
      <button onClick={() => notify({ type: 'success', message: 'Guardado.' })}>Éxito</button>
      <button onClick={() => notify({ type: 'error', message: 'No se pudo guardar.' })}>Error</button>
    </>
  )
}

describe('toasts y mascota', () => {
  afterEach(() => vi.useRealTimers())

  it('mantiene la bandeja fija, anunciada y sin bloquear el control principal', () => {
    const mainAction = vi.fn()
    render(
      <ToastProvider>
        <button onClick={mainAction}>Acción principal</button>
        <ToastButtons />
      </ToastProvider>,
    )
    const region = screen.getByRole('region', { name: 'Notificaciones' })
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toHaveAttribute('aria-relevant', 'additions text')
    expect(region).toHaveClass('fixed', 'bottom-4', 'right-4', 'z-[100]', 'pointer-events-none')
    expect(region).toHaveClass('w-[min(24rem,calc(100vw-2rem))]', 'max-h-[45vh]')

    fireEvent.click(screen.getByRole('button', { name: 'Éxito' }))
    expect(screen.getByRole('status')).toHaveClass('pointer-events-auto')
    fireEvent.click(screen.getByRole('button', { name: 'Acción principal' }))
    expect(mainAction).toHaveBeenCalledOnce()
  })

  it('usa status para éxito, alert para error, y solo cierra automáticamente el éxito', () => {
    vi.useFakeTimers()
    render(<ToastProvider><ToastButtons /></ToastProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Éxito' }))
    fireEvent.click(screen.getByRole('button', { name: 'Error' }))

    expect(screen.getByRole('status')).toHaveTextContent('Guardado.')
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo guardar.')

    act(() => { vi.advanceTimersByTime(6000) })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo guardar.')

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('muestra un marcador accesible si falta el archivo de la mascota', () => {
    const { container } = render(<Mascot src="/assets/brand/no-existe.svg" />)
    const image = container.querySelector('img')
    expect(image).toHaveAttribute('alt', '')
    if (!image) throw new Error('El componente debe renderizar la imagen solicitada.')
    fireEvent.error(image)
    expect(screen.getByText('AiKO')).toHaveAttribute('aria-hidden', 'true')
  })
})

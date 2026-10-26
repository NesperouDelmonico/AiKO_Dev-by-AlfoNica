import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthContext, type AuthContextValue } from '../auth/AuthContext'
import { AdminLayout } from '../components/layout/PanelLayout'

const auth: AuthContextValue = {
  user: {
    id: 'admin-1',
    nombre: 'Ana Pérez',
    correo: 'ana@example.com',
    rol: 'Administrador',
    estado: true,
    intentos_fallidos: 0,
  },
  loading: false,
  patientRejected: false,
  sessionError: null,
  signIn: async () => { throw new Error('No se usa en este test.') },
  signOut: async () => {},
  rejectPatient: async () => {},
  rejectUnsupportedRole: async () => {},
  clearPatientNotice: () => {},
}

function renderPanel() {
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={['/admin/usuarios']}>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route path="/admin/usuarios" element={<h1>Usuarios</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('layout del panel', () => {
  it('muestra un solo saludo con el nombre y permite ocultar y restaurar la barra lateral', async () => {
    const user = userEvent.setup()
    renderPanel()

    expect(screen.getAllByText('Hola, Ana')).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Abrir menú de usuario' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.queryByText('Ana Pérez')).not.toBeInTheDocument()

    const sidebar = screen.getByRole('complementary')
    const content = screen.getByRole('main').parentElement
    const footer = screen.getByText(/AiKO complementa el tratamiento/)

    expect(sidebar).toHaveClass('translate-x-0')
    expect(content).toHaveClass('lg:pl-64')
    expect(footer).toHaveClass('lg:left-64')

    await user.click(screen.getByRole('button', { name: 'Ocultar barra lateral' }))
    expect(sidebar).toHaveClass('-translate-x-full')
    expect(content).not.toHaveClass('lg:pl-64')
    expect(footer).not.toHaveClass('lg:left-64')

    await user.click(screen.getByRole('button', { name: 'Mostrar barra lateral' }))
    expect(sidebar).toHaveClass('translate-x-0')
    expect(content).toHaveClass('lg:pl-64')
    expect(footer).toHaveClass('lg:left-64')
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthGuard } from '../AuthGuard'
import { useAuthStore } from '../../stores/authStore'

function renderWithRouter(isAuthenticated: boolean) {
  useAuthStore.setState({
    token: isAuthenticated ? 'test-token' : null,
    serverUrl: '',
    isAuthenticated,
  })

  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/login" element={<div>Login-Seite</div>} />
        <Route
          path="/protected"
          element={
            <AuthGuard>
              <div>Geschützter Inhalt</div>
            </AuthGuard>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useAuthStore.setState({ token: null, serverUrl: '', isAuthenticated: false })
})

describe('AuthGuard', () => {
  it('zeigt Inhalt wenn authentifiziert', () => {
    renderWithRouter(true)
    expect(screen.getByText('Geschützter Inhalt')).toBeInTheDocument()
  })

  it('leitet zu /login weiter wenn nicht authentifiziert', () => {
    renderWithRouter(false)
    expect(screen.getByText('Login-Seite')).toBeInTheDocument()
    expect(screen.queryByText('Geschützter Inhalt')).not.toBeInTheDocument()
  })
})

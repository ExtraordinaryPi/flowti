import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '../authStore'

// Vor jedem Test Store auf Ausgangszustand zurücksetzen
beforeEach(() => {
  useAuthStore.setState({
    token: null,
    serverUrl: '',
    isAuthenticated: false,
  })
})

describe('authStore', () => {
  describe('Initialzustand', () => {
    it('ist initial nicht authentifiziert', () => {
      const { isAuthenticated } = useAuthStore.getState()
      expect(isAuthenticated).toBe(false)
    })

    it('hat initial kein Token', () => {
      const { token } = useAuthStore.getState()
      expect(token).toBeNull()
    })

    it('hat initial eine leere serverUrl', () => {
      const { serverUrl } = useAuthStore.getState()
      expect(serverUrl).toBe('')
    })
  })

  describe('login()', () => {
    it('setzt isAuthenticated auf true', () => {
      useAuthStore.getState().login('http://localhost:8080', 'test-token')
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
    })

    it('speichert das Token', () => {
      useAuthStore.getState().login('http://localhost:8080', 'my-token-123')
      expect(useAuthStore.getState().token).toBe('my-token-123')
    })

    it('speichert die serverUrl', () => {
      useAuthStore.getState().login('http://example.com', 'token')
      expect(useAuthStore.getState().serverUrl).toBe('http://example.com')
    })
  })

  describe('logout()', () => {
    it('setzt isAuthenticated auf false', () => {
      useAuthStore.getState().login('http://localhost:8080', 'token')
      useAuthStore.getState().logout()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })

    it('löscht das Token', () => {
      useAuthStore.getState().login('http://localhost:8080', 'token')
      useAuthStore.getState().logout()
      expect(useAuthStore.getState().token).toBeNull()
    })
  })
})

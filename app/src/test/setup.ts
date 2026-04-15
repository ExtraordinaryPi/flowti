import '@testing-library/jest-dom'
import { server } from './mocks/server'

// MSW: Server vor allen Tests starten
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// MSW: Handler nach jedem Test zurücksetzen
afterEach(() => server.resetHandlers())

// MSW: Server nach allen Tests stoppen
afterAll(() => server.close())

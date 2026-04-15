import { describe, it, expect } from 'vitest'
import { apiYToCanvas, apiRectYToCanvas, mouseYToApiY } from '../canvasUtils'

describe('apiYToCanvas', () => {
  it('konvertiert API-Y=0 (unten) zu Canvas-Y=canvasH (unten)', () => {
    expect(apiYToCanvas(0, 400)).toBe(400)
  })

  it('konvertiert API-Y=1 (oben) zu Canvas-Y=0 (oben)', () => {
    expect(apiYToCanvas(1, 400)).toBe(0)
  })

  it('konvertiert API-Y=0.5 zur Mitte des Canvas', () => {
    expect(apiYToCanvas(0.5, 400)).toBe(200)
  })
})

describe('apiRectYToCanvas', () => {
  it('berechnet Canvas-Oberkante eines Rechtecks', () => {
    // API-Y=0.8, Höhe=0.2, Canvas=500 → 500 - 0.8*500 - 0.2*500 = 500 - 400 - 100 = 0
    expect(apiRectYToCanvas(0.8, 0.2, 500)).toBe(0)
  })

  it('gibt negativen Wert zurück wenn Rechteck über Canvas-Rand geht', () => {
    expect(apiRectYToCanvas(1, 0.1, 400)).toBe(-40)
  })
})

describe('mouseYToApiY', () => {
  it('konvertiert Klick oben im Container zu API-Y nahe 1', () => {
    // Klick bei 50px, Container von 0 bis 400px → (1 - 50/400) = 0.875
    expect(mouseYToApiY(50, 0, 400)).toBeCloseTo(0.875)
  })

  it('konvertiert Klick unten im Container zu API-Y nahe 0', () => {
    // Klick bei 390px, Container von 0 bis 400px → (1 - 390/400) = 0.025
    expect(mouseYToApiY(390, 0, 400)).toBeCloseTo(0.025)
  })

  it('Invertierung ist symmetrisch zu apiYToCanvas', () => {
    const canvasH = 600
    const apiY = 0.3
    const canvasY = apiYToCanvas(apiY, canvasH)
    // mouseYToApiY(canvasY, 0, canvasH) soll wieder apiY ergeben
    expect(mouseYToApiY(canvasY, 0, canvasH)).toBeCloseTo(apiY)
  })
})

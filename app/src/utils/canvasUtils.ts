/**
 * Canvas-Koordinaten-Hilfsfunktionen.
 *
 * Das API liefert normalisierte Koordinaten im mathematischen KS (y=0 unten, y=1 oben).
 * HTML-Canvas verwendet y=0 oben. Diese Funktionen konvertieren zwischen beiden Systemen.
 */

/** API-Y-Koordinate → Canvas-Y-Koordinate für einen Punkt. */
export function apiYToCanvas(y: number, canvasH: number): number {
  return canvasH - y * canvasH;
}

/** API-Y-Koordinate → Canvas-Y-Koordinate für die Oberkante eines Rechtecks. */
export function apiRectYToCanvas(y: number, rectH: number, canvasH: number): number {
  return canvasH - y * canvasH - rectH * canvasH;
}

/** Maus-Y in CSS-Pixel → normalisiertes API-Y (0=unten, 1=oben). */
export function mouseYToApiY(clientY: number, rectTop: number, rectHeight: number): number {
  return 1 - (clientY - rectTop) / rectHeight;
}

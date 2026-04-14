import type { Page } from '../types/common';

/**
 * Normalisiert API-Antworten, die entweder ein Array oder ein Page-Objekt sein können.
 * Manche Endpunkte liefern je nach Parametern unterschiedliche Formate.
 */
export function toArray<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  return (v as Page<T>)?.content ?? [];
}

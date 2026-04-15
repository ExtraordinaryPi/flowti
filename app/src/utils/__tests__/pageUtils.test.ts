import { describe, it, expect } from 'vitest'
import { toArray } from '../pageUtils'
import type { Page } from '../../types/common'

interface Item {
  id: number
  name: string
}

describe('toArray', () => {
  it('gibt ein Array direkt zurück', () => {
    const items: Item[] = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }]
    expect(toArray<Item>(items)).toEqual(items)
  })

  it('extrahiert content aus einem Page-Objekt', () => {
    const page: Page<Item> = {
      content: [{ id: 1, name: 'A' }],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 20,
      first: true,
      last: true,
      numberOfElements: 1,
      empty: false,
    }
    expect(toArray<Item>(page)).toEqual([{ id: 1, name: 'A' }])
  })

  it('gibt leeres Array zurück wenn content fehlt', () => {
    expect(toArray<Item>({})).toEqual([])
  })

  it('gibt leeres Array bei null zurück', () => {
    expect(toArray<Item>(null)).toEqual([])
  })

  it('gibt leeres Array bei undefined zurück', () => {
    expect(toArray<Item>(undefined)).toEqual([])
  })
})

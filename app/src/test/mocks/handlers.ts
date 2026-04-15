import { http, HttpResponse } from 'msw'
import type { Portfolio } from '../../types/portfolio'
import type { Page } from '../../types/common'

const mockPortfolios: Portfolio[] = [
  {
    id: 1,
    name: 'Mathematik WS 2024',
    state: 'ACTIVE',
    config: [],
  },
  {
    id: 2,
    name: 'Physik SS 2024',
    state: 'CLOSED',
    config: [],
  },
]

export const handlers = [
  http.get('/rest/app/portfolio', () => {
    const page: Page<Portfolio> = {
      content: mockPortfolios,
      totalElements: mockPortfolios.length,
      totalPages: 1,
      number: 0,
      size: 20,
      first: true,
      last: true,
      numberOfElements: mockPortfolios.length,
      empty: false,
    }
    return HttpResponse.json(page)
  }),

  http.get('/rest/app/portfolio/:id', ({ params }) => {
    const portfolio = mockPortfolios.find((p) => p.id === Number(params.id))
    if (!portfolio) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(portfolio)
  }),

  http.post('/perform_login', () => {
    return new HttpResponse(null, { status: 200 })
  }),
]

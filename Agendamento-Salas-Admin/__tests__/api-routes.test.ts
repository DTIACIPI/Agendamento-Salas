import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { configureAuthFetch, authFetch } from '@/lib/auth/auth-fetch'
import { API_BASE_URL } from '@/lib/utils'
import type { NewBookingPayload } from '@/lib/types'

const mockFetch = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
  configureAuthFetch(async () => 'token-abc', () => {})
  mockFetch.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function mockJsonResponse(data: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  }))
}

function mockErrorResponse(status: number) {
  mockFetch.mockResolvedValueOnce(new Response('', { status }))
}

// ═══════════════════════════════════════════════════════════
// GET /api/bookings (listagem paginada)
// ═══════════════════════════════════════════════════════════
describe('GET /api/bookings — listagem paginada', () => {
  const BOOKINGS_URL = `${API_BASE_URL}/webhook/api/bookings`

  it('envia limit e offset como query params', async () => {
    mockJsonResponse({ data: [], total: 0 })

    await authFetch(`${BOOKINGS_URL}?limit=20&offset=0`)

    const calledUrl = mockFetch.mock.calls[0][0]
    expect(calledUrl).toContain('limit=20')
    expect(calledUrl).toContain('offset=0')
  })

  it('parseia resposta com data e total', async () => {
    const mockData = {
      data: [
        { id: '1', event_name: 'Teste', status: 'Confirmada', total_amount: 1000, company_name: 'Emp', event_date: '2026-04-22' },
      ],
      total: 1,
    }
    mockJsonResponse(mockData)

    const res = await authFetch(`${BOOKINGS_URL}?limit=20&offset=0`)
    const json = await res.json()

    expect(json.data).toHaveLength(1)
    expect(json.total).toBe(1)
    expect(json.data[0].id).toBe('1')
  })
})

// ═══════════════════════════════════════════════════════════
// GET /api/bookings/:id (detalhe — dossier)
// ═══════════════════════════════════════════════════════════
describe('GET /api/bookings/:id — dossier', () => {
  const DETAIL_BASE = `${API_BASE_URL}/webhook/details-booking-webhook/api/bookings`

  it('faz GET para a rota correta com o ID', async () => {
    mockJsonResponse({ id: 'abc-123', event_name: 'Teste' })

    await authFetch(`${DETAIL_BASE}/abc-123`, { cache: 'no-store' })

    expect(mockFetch.mock.calls[0][0]).toBe(`${DETAIL_BASE}/abc-123`)
  })

  it('parseia resposta quando API retorna array', async () => {
    const detail = { id: 'abc', event_name: 'Teste', status: 'Confirmada' }
    mockJsonResponse([detail])

    const res = await authFetch(`${DETAIL_BASE}/abc`)
    const data = await res.json()
    const parsed = Array.isArray(data) ? data[0] : data

    expect(parsed.id).toBe('abc')
  })

  it('parseia resposta quando API retorna objeto direto', async () => {
    const detail = { id: 'abc', event_name: 'Teste' }
    mockJsonResponse(detail)

    const res = await authFetch(`${DETAIL_BASE}/abc`)
    const data = await res.json()
    const parsed = Array.isArray(data) ? data[0] : data

    expect(parsed.id).toBe('abc')
  })
})

// ═════════════════════════════════════════════════��═════════
// PATCH /api/bookings/:id (edicao dossier)
// ═══════════════════════════════════════════════════════════
describe('PATCH /api/bookings/:id — edicao dossier', () => {
  const EDIT_BASE = `${API_BASE_URL}/webhook/533b9ad5-25db-4194-802d-667c7637e919/api/bookings`

  it('envia payload com responsavelData e eventoData', async () => {
    mockJsonResponse({ message: 'success' })

    await authFetch(`${EDIT_BASE}/abc-123`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        responsavelData: {
          nome: 'Joao',
          email: 'joao@test.com',
          telefone: '19999999999',
          cargo: '',
        },
        eventoData: {
          nome: 'Conferencia',
          finalidade: 'Treinamento',
          participantes: 50,
          responsavelDia: 'Maria',
          contatoDia: '19988888888',
          pagamento: 'Boleto',
          valorTotal: 3000,
          status: 'Confirmada',
        },
      }),
    })

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`${EDIT_BASE}/abc-123`)
    expect(init.method).toBe('PATCH')

    const body = JSON.parse(init.body)
    expect(body.responsavelData.nome).toBe('Joao')
    expect(body.eventoData.valorTotal).toBe(3000)
    expect(body.eventoData.status).toBe('Confirmada')
  })

  it('NAO envia companyData (empresa somente leitura)', async () => {
    mockJsonResponse({ message: 'success' })

    await authFetch(`${EDIT_BASE}/abc-123`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        responsavelData: { nome: 'Test', email: '', telefone: '', cargo: '' },
        eventoData: { nome: 'Test', finalidade: '', participantes: null, responsavelDia: '', contatoDia: '', pagamento: '', valorTotal: 0, status: 'Pre-reserva' },
      }),
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.companyData).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════
// PATCH /api/bookings/:id/status (mudanca de status)
// ═══════════════════════════════════════════════════════════
describe('PATCH /api/bookings/:id/status — mudanca de status', () => {
  const STATUS_BASE = `${API_BASE_URL}/webhook/e8bca4a7-1d71-4adb-8c0f-ed0e96d1383b/api/bookings`

  it('envia status correto para aprovacao', async () => {
    mockJsonResponse({ message: 'success' })

    await authFetch(`${STATUS_BASE}/abc-123/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ status: 'Confirmada' }),
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.status).toBe('Confirmada')
  })

  it('envia status correto para rejeicao', async () => {
    mockJsonResponse({ message: 'success' })

    await authFetch(`${STATUS_BASE}/abc-123/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ status: 'Cancelada' }),
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.status).toBe('Cancelada')
  })

  it('envia status Perdida', async () => {
    mockJsonResponse({ message: 'success' })

    await authFetch(`${STATUS_BASE}/abc-123/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ status: 'Perdida' }),
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.status).toBe('Perdida')
  })

  it('envia status Concluida', async () => {
    mockJsonResponse({ message: 'success' })

    await authFetch(`${STATUS_BASE}/abc-123/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ status: 'Concluída' }),
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.status).toBe('Concluída')
  })

  it('usa rota correta (UUID)', async () => {
    mockJsonResponse({ message: 'success' })

    await authFetch(`${STATUS_BASE}/xyz-456/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ status: 'Confirmada' }),
    })

    expect(mockFetch.mock.calls[0][0]).toBe(`${STATUS_BASE}/xyz-456/status`)
  })
})

// ═══════════════════════════════════════════════════════════
// POST /api/bookings (nova reserva)
// ═══════════════════════════════════════════════════════════
describe('POST /api/bookings — nova reserva', () => {
  const CREATE_URL = `${API_BASE_URL}/webhook/api/bookings`

  it('envia payload de locacao cliente completo', async () => {
    mockJsonResponse({ id: 'new-123' }, 201)

    const payload: NewBookingPayload = {
      booking: {
        space_id: 'room-1',
        booking_date: '2026-04-22',
        start_time: '08:00',
        end_time: '12:00',
        event_name: 'Conferencia',
        event_purpose: 'Treinamento',
        estimated_attendees: 50,
        booking_type: 'Locação Cliente',
        total_amount: 3700,
        onsite_contact_name: 'Joao',
        onsite_contact_phone: '19999999999',
        payment_method: 'Boleto',
        cleaning_buffer: 0,
      },
      company: { cnpj: '11222333000181', razao_social: 'Empresa Teste', inscricao_estadual: '', cep: '13560000', endereco: 'Rua Teste 100, Centro' },
      user: { name: 'Joao', email: 'joao@test.com', phone: '19999999999', role: 'Admin' },
    }

    await authFetch(CREATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    })

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(CREATE_URL)
    expect(init.method).toBe('POST')

    const body = JSON.parse(init.body)
    expect(body.booking.booking_type).toBe('Locação Cliente')
    expect(body.company.cnpj).toBe('11222333000181')
    expect(body.user.email).toBe('joao@test.com')
  })

  it('envia payload de cessao com company=null e total=0', async () => {
    mockJsonResponse({ id: 'new-456' }, 201)

    const payload: NewBookingPayload = {
      booking: {
        space_id: 'room-2',
        booking_date: '2026-04-23',
        start_time: '14:00',
        end_time: '16:00',
        event_name: 'Cessao Prefeitura',
        event_purpose: '',
        estimated_attendees: null,
        booking_type: 'Cessão',
        total_amount: 0,
        onsite_contact_name: 'Maria',
        onsite_contact_phone: '',
        payment_method: 'Isento',
        cleaning_buffer: 0,
      },
      company: null,
      user: { name: 'Maria', email: 'maria@gov.br', phone: '', role: 'Admin' },
    }

    await authFetch(CREATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.booking.total_amount).toBe(0)
    expect(body.company).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════
// POST /api/pricing/calculate
// ═══════════════════════════════════════════════════════════
describe('POST /api/pricing/calculate — calculo automatico', () => {
  const CALC_URL = `${API_BASE_URL}/webhook/api/pricing/calculate`

  it('envia space_id, data e horarios para calculo', async () => {
    mockJsonResponse({ total: 3700 })

    await authFetch(CALC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        space_id: 'room-1',
        booking_date: '2026-04-22',
        start_time: '08:00',
        end_time: '12:00',
      }),
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.space_id).toBe('room-1')
    expect(body.booking_date).toBe('2026-04-22')
    expect(body.start_time).toBe('08:00')
    expect(body.end_time).toBe('12:00')
  })

  it('parseia total da resposta (campo total)', async () => {
    mockJsonResponse({ total: 2500 })

    const res = await authFetch(CALC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ space_id: 'room-1', booking_date: '2026-04-22', start_time: '08:00', end_time: '10:00' }),
    })
    const data = await res.json()
    const val = data?.total ?? data?.total_amount ?? 0

    expect(val).toBe(2500)
  })

  it('parseia total da resposta (campo total_amount)', async () => {
    mockJsonResponse({ total_amount: 1800 })

    const res = await authFetch(CALC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ space_id: 'room-1', booking_date: '2026-04-22', start_time: '08:00', end_time: '10:00' }),
    })
    const data = await res.json()
    const val = data?.total ?? data?.total_amount ?? 0

    expect(val).toBe(1800)
  })
})

// ═══════════════════════════════════════════════════════════
// Error handling geral
// ═══════════════════════════════════════════════════════════
describe('tratamento de erros nas rotas', () => {
  it('res.ok e false para status 500', async () => {
    mockErrorResponse(500)

    const res = await authFetch(`${API_BASE_URL}/webhook/api/bookings`)
    expect(res.ok).toBe(false)
  })

  it('res.ok e false para status 404', async () => {
    mockErrorResponse(404)

    const res = await authFetch(`${API_BASE_URL}/webhook/details-booking-webhook/api/bookings/invalid`)
    expect(res.ok).toBe(false)
  })

  it('401 dispara onUnauthorized', async () => {
    const onUnauth = vi.fn()
    configureAuthFetch(async () => 'token', onUnauth)
    mockErrorResponse(401)

    await authFetch(`${API_BASE_URL}/webhook/api/bookings`)
    expect(onUnauth).toHaveBeenCalledOnce()
  })
})

/**
 * Testes de integração E2E — chamadas reais à API n8n
 *
 * Usa token de bypass para automações: Bearer ACIPI-TESTE-AUTOMACOES
 *
 * Para rodar:
 *   cd Agendamento-Salas-Admin && npx vitest run __tests__/integration-api.test.ts
 */
import { describe, it, expect } from 'vitest'

const BASE = 'https://acipiapi.eastus.cloudapp.azure.com'
const TOKEN = 'ACIPI-TESTE-AUTOMACOES'

const ROUTES = {
  // Bookings
  bookings:        `${BASE}/webhook/api/bookings`,
  publicBookings:  `${BASE}/webhook/api/public/bookings`,
  bookingDetail:   `${BASE}/webhook/details-booking-webhook/api/bookings`,
  bookingEdit:     `${BASE}/webhook/533b9ad5-25db-4194-802d-667c7637e919/api/bookings`,
  bookingStatus:   `${BASE}/webhook/e8bca4a7-1d71-4adb-8c0f-ed0e96d1383b/api/bookings`,
  // Spaces
  spaces:          `${BASE}/webhook/api/spaces`,
  spaceDetail:     `${BASE}/webhook/977b3245-3a83-43db-97be-cbc2eb07f9dc/api/spaces`,
  spaceEdit:       `${BASE}/webhook/59aa012a-1f02-424f-9ba5-90cea11a1468/api/spaces`,
  spaceDelete:     `${BASE}/webhook/b843ead7-f97c-4674-ab95-82c9ee731171/api/spaces`,
  // Coupons
  coupons:         `${BASE}/webhook/api/coupons`,
  couponDetail:    `${BASE}/webhook/0539f424-9e52-4eb8-b49f-1ae221cd2e80/api/coupons`,
  couponEdit:      `${BASE}/webhook/4506df66-209d-443d-bc88-1e3aac67ea49/api/coupons`,
  couponDelete:    `${BASE}/webhook/859fd086-48d2-4255-a555-956f4a56e8c7/api/coupons`,
  couponValidate:  `${BASE}/webhook/api/coupons/validate`,
  // Companies
  companies:       `${BASE}/webhook/api/companies`,
  companyEdit:     `${BASE}/webhook/b40fd427-347c-42bf-a144-12010a448bb3/api/companies`,
  companyBookings: `${BASE}/webhook/523d40e7-a7e8-476e-9ee1-2a0ecffe2738/api/companies`,
  // Others
  pricingCalc:     `${BASE}/webhook/api/pricing/calculate`,
  settings:        `${BASE}/webhook/api/settings`,
  users:           `${BASE}/webhook/api/users`,
}

const TIMEOUT = 30_000

const AUTH_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json; charset=utf-8',
  'Authorization': `Bearer ${TOKEN}`,
}

// ── Helpers ──────────────────────────────────────────────

async function apiGet(url: string) {
  const res = await fetch(url, { headers: AUTH_HEADERS })
  const text = await res.text()
  let data: any = text
  try { data = JSON.parse(text) } catch {}
  return { res, data }
}

async function apiPost(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST', headers: AUTH_HEADERS, body: JSON.stringify(body),
  })
  const text = await res.text()
  let data: any = text
  try { data = JSON.parse(text) } catch {}
  return { res, data }
}

async function apiPatch(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'PATCH', headers: AUTH_HEADERS, body: JSON.stringify(body),
  })
  const text = await res.text()
  let data: any = text
  try { data = JSON.parse(text) } catch {}
  return { res, data }
}

async function apiDelete(url: string) {
  const res = await fetch(url, { method: 'DELETE', headers: AUTH_HEADERS })
  const text = await res.text()
  let data: any = text
  try { data = JSON.parse(text) } catch {}
  return { res, data }
}

function unwrap(data: unknown): any {
  return Array.isArray(data) ? data[0] : data
}

function extractList(data: any): any[] {
  if (Array.isArray(data)) {
    if (data[0]?.data) return data[0].data
    return data
  }
  if (data?.data) return Array.isArray(data.data) ? data.data : []
  return []
}

function expectOk(status: number) {
  expect(status).toBeGreaterThanOrEqual(200)
  expect(status).toBeLessThan(300)
}

let sharedSpaceId: string | null = null
let permanentRoomId: string | null = null
let lastCreatedBookingId: string | null = null
async function getActiveSpaceId(): Promise<string> {
  if (sharedSpaceId) return sharedSpaceId
  if (permanentRoomId) { sharedSpaceId = permanentRoomId; return sharedSpaceId }
  const { data } = await apiGet(ROUTES.spaces)
  const rooms = extractList(data)
  const active = rooms.find((r: any) => r.is_active !== false && r.available !== false)
  sharedSpaceId = active?.id ?? null
  expect(sharedSpaceId).toBeTruthy()
  return sharedSpaceId!
}

// ═══════════════════════════════════════════════════════════════
//  1. ROTA PUBLICA
// ═══════════════════════════════════════════════════════════════
describe('GET /api/settings — configuracoes (publica)', () => {
  it('retorna 200 e settings validos', async () => {
    const { res, data } = await apiGet(ROUTES.settings)
    expect(res.status).toBe(200)
    const settings = (unwrap(data))?.settings ?? unwrap(data)
    expect(settings).toHaveProperty('open_time')
  }, TIMEOUT)
})

// ═══════════════════════════════════════════════════════════════
//  2. VERIFICACAO 401 SEM TOKEN
// ═══════════════════════════════════════════════════════════════
describe('rotas protegidas retornam 401 sem token', () => {
  const NO_AUTH = { 'Content-Type': 'application/json; charset=utf-8' }
  const routes = [
    ['bookings', `${ROUTES.bookings}?limit=1&offset=0`],
    ['coupons', ROUTES.coupons],
    ['companies', `${ROUTES.companies}?page=1&limit=5`],
    ['users', ROUTES.users],
    ['spaces', ROUTES.spaces],
  ]
  for (const [label, url] of routes) {
    it(`GET /api/${label} retorna 401`, async () => {
      const res = await fetch(url, { headers: NO_AUTH })
      expect(res.status).toBe(401)
    }, TIMEOUT)
  }
})

// ═══════════════════════════════════════════════════════════════
//  3. GET ENDPOINTS AUTENTICADOS
// ═══════════════════════════════════════════════════════════════
describe('GET /api/bookings — listagem paginada', () => {
  it('retorna 200', async () => {
    const { res } = await apiGet(`${ROUTES.bookings}?limit=5&offset=0`)
    expect(res.status).toBe(200)
  }, TIMEOUT)

  it('se retornar dados, cada booking tem id, event_name, status', async () => {
    const { data } = await apiGet(`${ROUTES.bookings}?limit=3&offset=0`)
    const list = data?.data ?? extractList(data)
    if (list.length > 0) {
      for (const key of ['id', 'event_name', 'status']) {
        expect(list[0]).toHaveProperty(key)
      }
    }
  }, TIMEOUT)
})

describe('GET /api/spaces — listagem de salas', () => {
  it('retorna 200', async () => {
    const { res } = await apiGet(ROUTES.spaces)
    expect(res.status).toBe(200)
  }, TIMEOUT)

  it('se retornar salas, cada sala tem id, name, capacity', async () => {
    const { data } = await apiGet(ROUTES.spaces)
    const rooms = extractList(data)
    if (rooms.length > 0) {
      for (const key of ['id', 'name', 'capacity']) {
        expect(rooms[0]).toHaveProperty(key)
      }
    }
  }, TIMEOUT)
})

describe('GET /api/coupons — listagem de cupons', () => {
  it('retorna 200', async () => {
    const { res } = await apiGet(ROUTES.coupons)
    expect(res.status).toBe(200)
  }, TIMEOUT)
})

describe('GET /api/companies — listagem de empresas', () => {
  it('retorna 200 com data array', async () => {
    const { res, data } = await apiGet(`${ROUTES.companies}?page=1&limit=5`)
    expect(res.status).toBe(200)
    const parsed = unwrap(data)
    expect(parsed).toHaveProperty('data')
  }, TIMEOUT)
})

describe('GET /api/users — listagem de usuarios', () => {
  it('retorna 200', async () => {
    const { res } = await apiGet(ROUTES.users)
    expect(res.status).toBe(200)
  }, TIMEOUT)
})

// ═══════════════════════════════════════════════════════════════
//  3b. SALA PERMANENTE — criada antes dos testes de reserva
// ═══════════════════════════════════════════════════════════════
describe('Salas — Criar sala permanente (mantida no banco)', () => {
  it('POST cria sala permanente', async () => {
    const { res } = await apiPost(ROUTES.spaces, {
      name: 'TESTE E2E Sala Permanente',
      description: 'Sala criada por teste E2E — mantida no banco para validacao',
      floor: 'Primeiro Andar',
      inventory: 'Mesa de reuniao, 10 cadeiras',
      amenities: ['Wi-Fi', 'Ar-condicionado', 'Projetor', 'Quadro branco'],
      capacity: 20,
      cleaning_buffer: 15,
      status: 'Ativa',
      images: [
        'https://via.placeholder.com/600x400?text=Permanente+01',
        'https://via.placeholder.com/600x400?text=Permanente+02',
      ],
      price_per_hour_weekday: 200,
      price_per_hour_weekend: 300,
      min_hours_wd: 2,
      min_hours_we: 3,
      price_morning_wd: 200,
      extra_hour_morning_wd: 100,
      price_afternoon_wd: 200,
      extra_hour_afternoon_wd: 100,
      price_night_wd: 250,
      extra_hour_night_wd: 125,
      price_morning_we: 300,
      extra_hour_morning_we: 150,
      price_afternoon_we: 300,
      extra_hour_afternoon_we: 150,
      price_night_we: 350,
      extra_hour_night_we: 175,
      allows_assembly: true,
      assembly_half_price: 500,
      assembly_full_price: 900,
    })
    expectOk(res.status)
  }, TIMEOUT)

  it('sala permanente aparece na listagem e obtem ID', async () => {
    const { data } = await apiGet(ROUTES.spaces)
    const rooms = extractList(data)
    const found = rooms.find((r: any) => r.name?.includes('Permanente'))
    expect(found).toBeTruthy()
    permanentRoomId = found?.id ?? null
  }, TIMEOUT)

  it('GET detalhe da sala permanente', async () => {
    if (!permanentRoomId) return
    const { res, data } = await apiGet(`${ROUTES.spaceDetail}/${permanentRoomId}`)
    expect(res.status).toBe(200)
    const room = unwrap(data)
    expect(room.name).toContain('Permanente')
    expect(room.capacity).toBe(20)
    expect(room).toHaveProperty('pricing')
  }, TIMEOUT)
})

// ═══════════════════════════════════════════════════════════════
//  4. LOCATÁRIO — reserva publica (Locação Cliente)
// ═══════════════════════════════════════════════════════════════
describe('Locatario: POST /api/public/bookings — Locacao Cliente', () => {
  let spaceId: string
  let bookingId: string | null = null

  it('obtem sala ativa', async () => {
    spaceId = await getActiveSpaceId()
  }, TIMEOUT)

  it('cria reserva via formulario publico', async () => {
    const { res, data } = await apiPost(ROUTES.publicBookings, {
      company: {
        cnpj: '11222333000181',
        razao_social: 'Empresa Teste Locatario',
        inscricao_estadual: '123456789',
        cep: '13560000',
        endereco: 'Rua Teste 123, Centro',
      },
      user: {
        name: 'Locatario Bot',
        email: 'locatario@teste.com',
        phone: '19999999999',
        role: 'Locatario',
      },
      booking: {
        booking_type: 'Locação Cliente',
        space_id: spaceId,
        space_name: 'Sala Teste',
        date: '2026-12-20',
        startTime: '08:00',
        endTime: '10:00',
        event_name: '[TESTE E2E] Locacao via Locatario',
        event_purpose: 'Teste automatizado',
        estimated_attendees: 20,
        onsite_contact_name: 'Responsavel Dia',
        onsite_contact_phone: '19988887777',
        payment_method: 'Boleto',
        total_amount: 1500,
        coupon_code: null,
        coupon_discount: null,
        cleaning_buffer: 0,
      },
    })
    expectOk(res.status)
    bookingId = unwrap(data)?.id ?? unwrap(data)?.booking_id ?? null
    if (bookingId) lastCreatedBookingId = bookingId
  }, TIMEOUT)

  it('reserva aparece como Pre-reserva no dossier', async () => {
    if (!bookingId) return
    const { res, data } = await apiGet(`${ROUTES.bookingDetail}/${bookingId}`)
    expect(res.status).toBe(200)
    const d = unwrap(data)
    expect(d.event_name).toContain('TESTE E2E')
    expect(d.status).toBe('Pre-reserva')
  }, TIMEOUT)
})

// ═══════════════════════════════════════════════════════════════
//  5. ADMIN — 3 tipos internos (Cessão, Uso Interno, Curso)
// ═══════════════════════════════════════════════════════════════
describe('Admin: POST /api/bookings — Cessao', () => {
  it('cria cessao com sucesso', async () => {
    const spaceId = await getActiveSpaceId()
    const { res } = await apiPost(ROUTES.bookings, {
      booking: {
        space_id: spaceId, booking_date: '2026-12-21',
        start_time: '08:00', end_time: '10:00',
        event_name: '[TESTE E2E] Cessao Prefeitura',
        event_purpose: 'Cessao municipal', estimated_attendees: 50,
        booking_type: 'Cessão', total_amount: 0,
        onsite_contact_name: 'Bot Cessao', onsite_contact_phone: '19999998888',
        payment_method: 'Isento', cleaning_buffer: 0,
      },
      company: null,
      user: { name: 'Bot Cessao', email: 'cessao@acipi.com.br', phone: '19999998888', role: 'Admin' },
    })
    expectOk(res.status)
  }, TIMEOUT)
})

describe('Admin: POST /api/bookings — Uso Interno', () => {
  it('cria uso interno com sucesso', async () => {
    const spaceId = await getActiveSpaceId()
    const { res } = await apiPost(ROUTES.bookings, {
      booking: {
        space_id: spaceId, booking_date: '2026-12-22',
        start_time: '14:00', end_time: '16:00',
        event_name: '[TESTE E2E] Reuniao Diretoria',
        event_purpose: 'Reuniao interna', estimated_attendees: 10,
        booking_type: 'Uso Interno', total_amount: 0,
        onsite_contact_name: 'Bot Interno', onsite_contact_phone: '19999997777',
        payment_method: 'Isento', cleaning_buffer: 0,
      },
      company: null,
      user: { name: 'Bot Interno', email: 'interno@acipi.com.br', phone: '19999997777', role: 'Admin' },
    })
    expectOk(res.status)
  }, TIMEOUT)
})

describe('Admin: POST /api/bookings — Curso', () => {
  it('cria curso com sucesso', async () => {
    const spaceId = await getActiveSpaceId()
    const { res } = await apiPost(ROUTES.bookings, {
      booking: {
        space_id: spaceId, booking_date: '2026-12-23',
        start_time: '08:00', end_time: '12:00',
        event_name: '[TESTE E2E] Curso NR-10',
        event_purpose: 'Treinamento seguranca', estimated_attendees: 25,
        booking_type: 'Curso', total_amount: 0,
        onsite_contact_name: 'Bot Curso', onsite_contact_phone: '19999996666',
        payment_method: 'Isento', cleaning_buffer: 0,
      },
      company: null,
      user: { name: 'Bot Curso', email: 'curso@acipi.com.br', phone: '19999996666', role: 'Admin' },
    })
    expectOk(res.status)
  }, TIMEOUT)
})

// ═══════════════════════════════════════════════════════════════
//  6. TRANSIÇÕES DE STATUS — todos os 6 status
// ═══════════════════════════════════════════════════════════════
describe('Transicao de status — cobre todos os 6 status', () => {
  let bookingId: string | null = null

  it('cria reserva base para transicoes', async () => {
    const spaceId = await getActiveSpaceId()
    const { res, data } = await apiPost(ROUTES.bookings, {
      booking: {
        space_id: spaceId, booking_date: '2026-12-24',
        start_time: '08:00', end_time: '09:00',
        event_name: '[TESTE E2E] Transicao Status',
        event_purpose: 'Teste status', estimated_attendees: 5,
        booking_type: 'Locação Cliente', total_amount: 100,
        onsite_contact_name: 'Bot', onsite_contact_phone: '19999990000',
        payment_method: 'Boleto', cleaning_buffer: 0,
      },
      company: { cnpj: '99888777000100', razao_social: 'Empresa Status', inscricao_estadual: '', cep: '13560000', endereco: 'Rua Status 10' },
      user: { name: 'Bot Status', email: 'status@teste.com', phone: '19999990000', role: 'Locatario' },
    })
    expectOk(res.status)
    bookingId = unwrap(data)?.id ?? unwrap(data)?.booking_id ?? null
  }, TIMEOUT)

  async function changeAndVerify(status: string) {
    if (!bookingId) return
    const { res } = await apiPatch(`${ROUTES.bookingStatus}/${bookingId}/status`, { status })
    expectOk(res.status)
    const { data } = await apiGet(`${ROUTES.bookingDetail}/${bookingId}`)
    expect(unwrap(data).status).toBe(status)
  }

  it('→ Pendente', async () => { await changeAndVerify('Pendente') }, TIMEOUT)
  it('→ Pre-reserva', async () => { await changeAndVerify('Pre-reserva') }, TIMEOUT)
  it('→ Confirmada', async () => { await changeAndVerify('Confirmada') }, TIMEOUT)
  it('→ Concluida', async () => { await changeAndVerify('Concluída') }, TIMEOUT)
  it('→ Cancelada', async () => { await changeAndVerify('Cancelada') }, TIMEOUT)
  it('→ Perdida', async () => { await changeAndVerify('Perdida') }, TIMEOUT)
})

// ═══════════════════════════════════════════════════════════════
//  7. FLUXO COMPLETO: Criar → Detalhar → Editar → Status
// ═══════════════════════════════════════════════════════════════
describe('Fluxo completo E2E: criar → detalhar → editar → status', () => {
  let createdId: string | null = null

  it('POST cria reserva', async () => {
    const spaceId = await getActiveSpaceId()
    const { res, data } = await apiPost(ROUTES.bookings, {
      booking: {
        space_id: spaceId, booking_date: '2026-12-31',
        start_time: '08:00', end_time: '09:00',
        event_name: '[TESTE E2E] Fluxo Completo',
        event_purpose: 'Teste E2E', estimated_attendees: 5,
        booking_type: 'Uso Interno', total_amount: 0,
        onsite_contact_name: 'Bot', onsite_contact_phone: '19999999999',
        payment_method: 'Isento', cleaning_buffer: 0,
      },
      company: null,
      user: { name: 'Bot', email: 'teste@acipi.com.br', phone: '19999999999', role: 'Admin' },
    })
    expectOk(res.status)
    createdId = unwrap(data)?.id ?? unwrap(data)?.booking_id ?? null
  }, TIMEOUT)

  it('GET detalha reserva', async () => {
    if (!createdId) return
    const { res, data } = await apiGet(`${ROUTES.bookingDetail}/${createdId}`)
    expect(res.status).toBe(200)
    expect(unwrap(data).event_name).toContain('TESTE E2E')
  }, TIMEOUT)

  it('PATCH edita dados', async () => {
    if (!createdId) return
    const { res } = await apiPatch(`${ROUTES.bookingEdit}/${createdId}`, {
      responsavelData: {
        nome: 'Bot Editado', email: 'teste@acipi.com.br',
        telefone: '19988888888', cargo: '',
      },
      eventoData: {
        nome: '[TESTE E2E] Editado', finalidade: 'Edicao',
        participantes: 10, responsavelDia: 'Bot Resp',
        contatoDia: '19977777777', pagamento: '',
        valorTotal: 0, status: 'Confirmada',
      },
    })
    expectOk(res.status)
  }, TIMEOUT)

  it('PATCH → Confirmada', async () => {
    if (!createdId) return
    const { res } = await apiPatch(`${ROUTES.bookingStatus}/${createdId}/status`, { status: 'Confirmada' })
    expectOk(res.status)
  }, TIMEOUT)

  it('PATCH → Concluida', async () => {
    if (!createdId) return
    const { res } = await apiPatch(`${ROUTES.bookingStatus}/${createdId}/status`, { status: 'Concluída' })
    expectOk(res.status)
  }, TIMEOUT)

  it('GET verifica status final', async () => {
    if (!createdId) return
    const { data } = await apiGet(`${ROUTES.bookingDetail}/${createdId}`)
    expect(unwrap(data).status).toBe('Concluída')
  }, TIMEOUT)
})

// ═══════════════════════════════════════════════════════════════
//  8. SALAS — CRUD completo (Criar → Detalhe → Atualizar → Excluir)
// ═══════════════════════════════════════════════════════════════
describe('CRUD Salas — Criar, Detalhar, Atualizar, Excluir (descartavel)', () => {
  let createdRoomId: string | null = null

  it('POST cria sala descartavel', async () => {
    const { res, data } = await apiPost(ROUTES.spaces, {
      name: 'TESTE E2E Sala Descartavel',
      description: 'Sala criada por teste E2E — sera excluida ao final',
      floor: 'Terreo',
      inventory: '',
      amenities: ['Wi-Fi', 'Ar-condicionado'],
      capacity: 15,
      cleaning_buffer: 30,
      status: 'Ativa',
      images: [
        'https://via.placeholder.com/600x400?text=Sala+E2E+01',
        'https://via.placeholder.com/600x400?text=Sala+E2E+02',
      ],
      price_per_hour_weekday: 100,
      price_per_hour_weekend: 150,
      min_hours_wd: 2,
      min_hours_we: 2,
      price_morning_wd: 100,
      extra_hour_morning_wd: 50,
      price_afternoon_wd: 100,
      extra_hour_afternoon_wd: 50,
      price_night_wd: 120,
      extra_hour_night_wd: 60,
      price_morning_we: 150,
      extra_hour_morning_we: 75,
      price_afternoon_we: 150,
      extra_hour_afternoon_we: 75,
      price_night_we: 180,
      extra_hour_night_we: 90,
      allows_assembly: false,
    })
    expectOk(res.status)
  }, TIMEOUT)

  it('obtem ID da sala descartavel na listagem', async () => {
    const { data } = await apiGet(ROUTES.spaces)
    const rooms = extractList(data)
    const found = rooms.find((r: any) => r.name?.includes('Descartavel'))
    expect(found).toBeTruthy()
    createdRoomId = found?.id ?? null
  }, TIMEOUT)

  it('GET detalhe da sala criada', async () => {
    if (!createdRoomId) return
    const { res, data } = await apiGet(`${ROUTES.spaceDetail}/${createdRoomId}`)
    expect(res.status).toBe(200)
    const room = unwrap(data)
    expect(room).toHaveProperty('id')
    expect(room).toHaveProperty('name')
    expect(room).toHaveProperty('capacity')
    expect(room).toHaveProperty('floor')
    expect(room).toHaveProperty('amenities')
    expect(room).toHaveProperty('pricing')
    expect(room.name).toContain('TESTE E2E')
  }, TIMEOUT)

  it('PATCH atualiza nome e capacidade', async () => {
    if (!createdRoomId) return
    const { res } = await apiPatch(`${ROUTES.spaceEdit}/${createdRoomId}`, {
      name: 'TESTE E2E Sala Atualizada',
      capacity: 30,
      description: 'Sala atualizada por teste E2E',
    })
    expectOk(res.status)
  }, TIMEOUT)

  it('GET verifica atualizacao aplicada', async () => {
    if (!createdRoomId) return
    const { res, data } = await apiGet(`${ROUTES.spaceDetail}/${createdRoomId}`)
    expect(res.status).toBe(200)
    const room = unwrap(data)
    expect(room.name).toContain('Atualizada')
    expect(room.capacity).toBe(30)
  }, TIMEOUT)

  it('DELETE exclui sala de teste', async () => {
    if (!createdRoomId) return
    const { res } = await apiDelete(`${ROUTES.spaceDelete}/${createdRoomId}`)
    expectOk(res.status)
  }, TIMEOUT)

  it('sala excluida nao aparece mais', async () => {
    if (!createdRoomId) return
    const { data } = await apiGet(ROUTES.spaces)
    const rooms = extractList(data)
    const found = rooms.find((r: any) => r.id === createdRoomId)
    expect(found).toBeFalsy()
  }, TIMEOUT)
})


// ═══════════════════════════════════════════════════════════════
//  9. CUPONS — CRUD completo (Criar → Atualizar → Excluir)
// ═══════════════════════════════════════════════════════════════
describe('CRUD Cupons — Criar, Atualizar, Excluir', () => {
  let couponId: string | null = null
  const couponCode = `E2E${Date.now().toString(36).toUpperCase()}`

  it('POST cria cupom de teste', async () => {
    const { res, data } = await apiPost(ROUTES.coupons, {
      code: couponCode,
      discount_type: 'percentage',
      discount_value: 15,
      max_uses: 5,
      valid_until: '2026-12-31',
      is_active: true,
    })
    expectOk(res.status)
    couponId = unwrap(data)?.id ?? unwrap(data)?.coupon_id ?? null
  }, TIMEOUT)

  it('cupom aparece na listagem', async () => {
    if (!couponId) return
    const { data } = await apiGet(ROUTES.coupons)
    const coupons = extractList(data)
    const found = coupons.find((c: any) => c.id === couponId || c.code === couponCode)
    expect(found).toBeTruthy()
    expect(found.discount_value).toBe(15)
  }, TIMEOUT)

  it('GET detalhe do cupom', async () => {
    if (!couponId) return
    const { res, data } = await apiGet(`${ROUTES.couponDetail}/${couponId}`)
    expect(res.status).toBe(200)
    const c = unwrap(data)
    expect(c.code).toBe(couponCode)
  }, TIMEOUT)

  it('PATCH atualiza desconto para 25%', async () => {
    if (!couponId) return
    const { res } = await apiPatch(`${ROUTES.couponEdit}/${couponId}`, {
      code: couponCode,
      discount_type: 'percentage',
      discount_value: 25,
      max_uses: 10,
      valid_until: '2026-12-31',
      is_active: true,
    })
    expectOk(res.status)
  }, TIMEOUT)

  it('GET verifica atualizacao', async () => {
    if (!couponId) return
    const { res, data } = await apiGet(`${ROUTES.couponDetail}/${couponId}`)
    expect(res.status).toBe(200)
    const c = unwrap(data)
    expect(c.discount_value).toBe(25)
    expect(c.max_uses).toBe(10)
  }, TIMEOUT)

  it('DELETE exclui cupom', async () => {
    if (!couponId) return
    const { res } = await apiDelete(`${ROUTES.couponDelete}/${couponId}`)
    expectOk(res.status)
  }, TIMEOUT)

  it('cupom nao aparece mais na listagem', async () => {
    if (!couponId) return
    const { data } = await apiGet(ROUTES.coupons)
    const coupons = extractList(data)
    const found = coupons.find((c: any) => c.id === couponId)
    expect(found).toBeFalsy()
  }, TIMEOUT)
})

// ═══════════════════════════════════════════════════════════════
//  10. EMPRESAS — Listagem, Atualização, Histórico
// ═══════════════════════════════════════════════════════════════
describe('Empresas — Listagem, Atualizacao, Historico', () => {
  let companyId: string | null = null
  let original: any = null

  it('GET lista empresas', async () => {
    const { res, data } = await apiGet(`${ROUTES.companies}?page=1&limit=5`)
    expect(res.status).toBe(200)
    const companies = extractList(data)
    if (companies.length > 0) {
      companyId = companies[0].id
      original = companies[0]
      expect(companies[0]).toHaveProperty('id')
      expect(companies[0]).toHaveProperty('cnpj')
      expect(companies[0]).toHaveProperty('razao_social')
    }
  }, TIMEOUT)

  it('PATCH atualiza endereco da empresa', async () => {
    if (!companyId || !original) return
    const { res } = await apiPatch(`${ROUTES.companyEdit}/${companyId}`, {
      razao_social: original.razao_social,
      inscricao_estadual: original.inscricao_estadual || null,
      cep: original.cep || null,
      endereco: 'Rua Teste E2E, 123',
    })
    expectOk(res.status)
  }, TIMEOUT)

  it('PATCH restaura endereco original', async () => {
    if (!companyId || !original) return
    const { res } = await apiPatch(`${ROUTES.companyEdit}/${companyId}`, {
      razao_social: original.razao_social,
      inscricao_estadual: original.inscricao_estadual || null,
      cep: original.cep || null,
      endereco: original.endereco || null,
    })
    expectOk(res.status)
  }, TIMEOUT)

  it('GET historico de reservas da empresa', async () => {
    if (!companyId) return
    const { res } = await apiGet(`${ROUTES.companyBookings}/${companyId}/bookings`)
    expect(res.status).toBe(200)
  }, TIMEOUT)
})

// ═══════════════════════════════════════════════════════════════
//  11. PRICING — calculo automatico
// ═══════════════════════════════════════════════════════════════
describe('POST /api/pricing/calculate', () => {
  it('retorna 200 para sala e horario validos', async () => {
    const spaceId = await getActiveSpaceId()
    const { res } = await apiPost(ROUTES.pricingCalc, {
      space_id: spaceId,
      booking_date: '2026-06-15',
      start_time: '08:00',
      end_time: '12:00',
    })
    expect(res.status).toBe(200)
  }, TIMEOUT)
})

// ═══════════════════════════════════════════════════════════════
//  12. DOSSIER — detalhe de reserva existente
// ═══════════════════════════════════════════════════════════════
describe('GET /api/bookings/:id — dossier', () => {
  it('retorna detalhes de reserva criada anteriormente', async () => {
    if (!lastCreatedBookingId) return
    const { res, data } = await apiGet(`${ROUTES.bookingDetail}/${lastCreatedBookingId}`)
    expect(res.status).toBe(200)
    const d = unwrap(data)
    for (const key of ['id', 'event_name', 'status']) {
      expect(d).toHaveProperty(key)
    }
  }, TIMEOUT)
})

import { describe, it, expect } from 'vitest'
import type { BookingListItem, BookingStatus } from '@/lib/types'

const INTERNAL_TYPES = ['Cessão', 'Uso Interno', 'Curso']

function filterBookings(
  bookings: BookingListItem[],
  tab: 'external' | 'internal',
  statusFilter: BookingStatus | 'all',
  searchQuery: string,
): BookingListItem[] {
  const isInternal = tab === 'internal'
  return bookings.filter((b) => {
    const bIsInternal = INTERNAL_TYPES.includes(b.booking_type ?? '')
    if (isInternal !== bIsInternal) return false
    if (statusFilter !== 'all' && b.status !== statusFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchName = b.event_name?.toLowerCase().includes(q)
      const matchCompany = b.company_name?.toLowerCase().includes(q)
      const matchId = b.id?.toLowerCase().includes(q)
      if (!matchName && !matchCompany && !matchId) return false
    }
    return true
  })
}

function formatEventDate(raw: string | null): string {
  if (!raw) return '—'
  const d = new Date(raw.includes(' ') ? raw.replace(' ', 'T') : raw)
  if (isNaN(d.getTime())) return raw
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const sampleBookings: BookingListItem[] = [
  { id: '1', event_name: 'Reuniao Diretoria', status: 'Confirmada', total_amount: 3000, company_name: 'Caterpillar', event_date: '2026-04-22', booking_type: 'Locação Cliente' },
  { id: '2', event_name: 'Treinamento RH', status: 'Confirmada', total_amount: 0, company_name: '', event_date: '2026-04-23', booking_type: 'Uso Interno' },
  { id: '3', event_name: 'Cessao Prefeitura', status: 'Pre-reserva', total_amount: 0, company_name: '', event_date: '2026-04-24', booking_type: 'Cessão' },
  { id: '4', event_name: 'Curso NR10', status: 'Pendente', total_amount: 0, company_name: '', event_date: '2026-04-25', booking_type: 'Curso' },
  { id: '5', event_name: 'Lancamento Produto', status: 'Cancelada', total_amount: 5000, company_name: 'Drogal', event_date: '2026-04-26', booking_type: 'Locação Cliente' },
  { id: '6', event_name: 'Evento Legado', status: 'Pendente', total_amount: 1000, company_name: 'Empresa X', event_date: '2026-04-27' },
]

// ═══════════════════════════════════════════════════════════
// Separacao de abas
// ═══════════════════════════════════════════════════════════
describe('separacao de abas (external/internal)', () => {
  it('aba externa mostra somente Locacao Cliente e legados', () => {
    const result = filterBookings(sampleBookings, 'external', 'all', '')
    expect(result.map(b => b.id)).toEqual(['1', '5', '6'])
  })

  it('aba interna mostra Cessao, Uso Interno e Curso', () => {
    const result = filterBookings(sampleBookings, 'internal', 'all', '')
    expect(result.map(b => b.id)).toEqual(['2', '3', '4'])
  })

  it('booking sem booking_type vai para aba externa', () => {
    const result = filterBookings(sampleBookings, 'external', 'all', '')
    expect(result.find(b => b.id === '6')).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════
// Filtro por status
// ═══════════════════════════════════════════════════════════
describe('filtro por status', () => {
  it('filtra Confirmada na aba externa', () => {
    const result = filterBookings(sampleBookings, 'external', 'Confirmada', '')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('filtra Pre-reserva na aba interna', () => {
    const result = filterBookings(sampleBookings, 'internal', 'Pre-reserva', '')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('3')
  })

  it('all mostra todos da aba', () => {
    const result = filterBookings(sampleBookings, 'external', 'all', '')
    expect(result.length).toBeGreaterThan(1)
  })
})

// ═══════════════════════════════════════════════════════════
// Busca textual
// ═══════════════════════════════════════════════════════════
describe('busca textual', () => {
  it('busca por nome do evento (case insensitive)', () => {
    const result = filterBookings(sampleBookings, 'external', 'all', 'lancamento')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('5')
  })

  it('busca por nome da empresa', () => {
    const result = filterBookings(sampleBookings, 'external', 'all', 'caterpillar')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('busca por ID', () => {
    const result = filterBookings(sampleBookings, 'internal', 'all', '4')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('4')
  })

  it('busca vazia retorna todos da aba', () => {
    const result = filterBookings(sampleBookings, 'internal', 'all', '')
    expect(result).toHaveLength(3)
  })

  it('combina busca com filtro de status', () => {
    const result = filterBookings(sampleBookings, 'external', 'Cancelada', 'drogal')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('5')
  })

  it('retorna vazio quando busca nao encontra nada', () => {
    const result = filterBookings(sampleBookings, 'external', 'all', 'inexistente')
    expect(result).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════
// Formatacao de data
// ═══════════════════════════════════════════════════════════
describe('formatEventDate', () => {
  it('formata data ISO padrao', () => {
    // Date-only ISO é parsed como UTC; toLocaleDateString pode exibir dia anterior em timezones negativos
    const result = formatEventDate('2026-04-22')
    expect(result).toMatch(/\d{2}\/04\/2026/)
  })

  it('formata data com espaco (formato API)', () => {
    // Com horario, Date interpreta como local
    expect(formatEventDate('2026-04-22 08:00:00')).toBe('22/04/2026')
  })

  it('retorna travessao para null', () => {
    expect(formatEventDate(null)).toBe('—')
  })

  it('retorna string original para data invalida', () => {
    expect(formatEventDate('abc-def')).toBe('abc-def')
  })
})

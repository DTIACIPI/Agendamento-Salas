import { describe, it, expect } from 'vitest'
import type { BookingType, NewBookingPayload, Room } from '@/lib/types'

const EXEMPT_TYPES: BookingType[] = ['Cessão', 'Uso Interno']

function isExempt(type: BookingType): boolean {
  return EXEMPT_TYPES.includes(type)
}

function generateTimeSlots(start = '08:00', end = '22:00'): string[] {
  const slots: string[] = []
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let mins = sh * 60 + sm
  const endMins = eh * 60 + em
  while (mins <= endMins) {
    slots.push(`${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`)
    mins += 30
  }
  return slots
}

function filterEndTimeSlots(timeSlots: string[], startTime: string): string[] {
  if (!startTime) return timeSlots
  return timeSlots.filter((t) => t > startTime)
}

function filterActiveRooms(rooms: Room[]): Room[] {
  return rooms.filter((r) => r.is_active !== false && r.status !== 'Inativa')
}

function validate(opts: {
  spaceId: string
  bookingDate: string
  startTime: string
  endTime: string
  eventName: string
  contactName: string
  contactEmail: string
  cnpj: string
  razaoSocial: string
  totalAmount: string
  isExempt: boolean
}): string | null {
  if (!opts.spaceId) return 'Selecione uma sala.'
  if (!opts.bookingDate) return 'Selecione a data.'
  if (!opts.startTime || !opts.endTime) return 'Selecione horario de inicio e termino.'
  if (opts.startTime >= opts.endTime) return 'Horario de termino deve ser posterior ao inicio.'
  if (!opts.eventName.trim()) return 'Informe o nome do evento.'
  if (!opts.contactName.trim()) return 'Informe o nome do contato.'
  if (!opts.contactEmail.trim()) return 'Informe o email do contato.'
  if (!opts.isExempt && !opts.cnpj.trim()) return 'Informe o CNPJ.'
  if (!opts.isExempt && !opts.razaoSocial.trim()) return 'Informe a Razao Social.'
  if (!opts.isExempt && !opts.totalAmount.trim()) return 'Informe o valor total.'
  return null
}

function buildPayload(opts: {
  spaceId: string
  bookingDate: string
  startTime: string
  endTime: string
  eventName: string
  eventPurpose: string
  estimatedAttendees: string
  bookingType: BookingType
  totalAmount: string
  contactName: string
  contactEmail: string
  contactPhone: string
  cnpj: string
  razaoSocial: string
  isExempt: boolean
}): NewBookingPayload {
  const parsedAmount = opts.isExempt ? 0 : parseFloat(opts.totalAmount.replace(/\./g, '').replace(',', '.')) || 0
  return {
    booking: {
      space_id: opts.spaceId,
      booking_date: opts.bookingDate,
      start_time: opts.startTime,
      end_time: opts.endTime,
      event_name: opts.eventName.trim(),
      event_purpose: opts.eventPurpose.trim(),
      estimated_attendees: opts.estimatedAttendees ? Number(opts.estimatedAttendees) : null,
      booking_type: opts.bookingType,
      total_amount: parsedAmount,
      onsite_contact_name: opts.contactName.trim(),
      onsite_contact_phone: opts.contactPhone.replace(/\D/g, ''),
    },
    company: opts.isExempt ? null : {
      cnpj: opts.cnpj.replace(/\D/g, ''),
      razao_social: opts.razaoSocial.trim(),
    },
    user: {
      name: opts.contactName.trim(),
      email: opts.contactEmail.trim(),
      phone: opts.contactPhone.replace(/\D/g, ''),
    },
  }
}

// ═══════════════════════════════════════════════════════════
// Tipo isento
// ═══════════════════════════════════════════════════════════
describe('isExempt (tipos isentos de cobranca)', () => {
  it('Cessao e isento', () => expect(isExempt('Cessão')).toBe(true))
  it('Uso Interno e isento', () => expect(isExempt('Uso Interno')).toBe(true))
  it('Locacao Cliente NAO e isento', () => expect(isExempt('Locação Cliente')).toBe(false))
  it('Curso NAO e isento de cobranca', () => expect(isExempt('Curso')).toBe(false))
})

// ═══════════════════════════════════════════════════════════
// Time slots
// ═══════════════════════════════════════════════════════════
describe('generateTimeSlots', () => {
  it('gera slots de 08:00 a 22:00 em intervalos de 30min', () => {
    const slots = generateTimeSlots()
    expect(slots[0]).toBe('08:00')
    expect(slots[1]).toBe('08:30')
    expect(slots[slots.length - 1]).toBe('22:00')
    expect(slots).toHaveLength(29)
  })

  it('gera slots customizados', () => {
    const slots = generateTimeSlots('10:00', '12:00')
    expect(slots).toEqual(['10:00', '10:30', '11:00', '11:30', '12:00'])
  })
})

describe('filterEndTimeSlots', () => {
  const allSlots = generateTimeSlots()

  it('retorna todos quando startTime vazio', () => {
    expect(filterEndTimeSlots(allSlots, '')).toEqual(allSlots)
  })

  it('filtra slots posteriores ao startTime', () => {
    const result = filterEndTimeSlots(allSlots, '20:00')
    expect(result[0]).toBe('20:30')
    expect(result).not.toContain('20:00')
    expect(result).not.toContain('19:30')
  })

  it('retorna vazio se startTime = ultimo slot', () => {
    expect(filterEndTimeSlots(allSlots, '22:00')).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════
// Filtro de salas ativas
// ═══════════════════════════════════════════════════════════
describe('filterActiveRooms', () => {
  const rooms: Room[] = [
    { id: '1', name: 'Ativa', capacity: 20, is_active: true, status: 'Ativa' },
    { id: '2', name: 'Inativa por flag', capacity: 10, is_active: false, status: 'Ativa' },
    { id: '3', name: 'Inativa por status', capacity: 15, is_active: true, status: 'Inativa' },
    { id: '4', name: 'Sem flags', capacity: 30 },
  ]

  it('inclui sala ativa', () => {
    const result = filterActiveRooms(rooms)
    expect(result.map(r => r.id)).toContain('1')
  })

  it('exclui sala com is_active=false', () => {
    const result = filterActiveRooms(rooms)
    expect(result.map(r => r.id)).not.toContain('2')
  })

  it('exclui sala com status=Inativa', () => {
    const result = filterActiveRooms(rooms)
    expect(result.map(r => r.id)).not.toContain('3')
  })

  it('inclui sala sem flags definidos (is_active undefined)', () => {
    const result = filterActiveRooms(rooms)
    expect(result.map(r => r.id)).toContain('4')
  })
})

// ═══════════════════════════════════════════════════════════
// Validacao do formulario
// ═══════════════════════════════════════════════════════════
describe('validate (formulario nova reserva)', () => {
  const validBase = {
    spaceId: 'room-1',
    bookingDate: '2026-04-22',
    startTime: '08:00',
    endTime: '10:00',
    eventName: 'Conferencia',
    contactName: 'Joao',
    contactEmail: 'joao@test.com',
    cnpj: '11222333000181',
    razaoSocial: 'Empresa Teste',
    totalAmount: '1000,00',
    isExempt: false,
  }

  it('retorna null para formulario valido (locacao)', () => {
    expect(validate(validBase)).toBeNull()
  })

  it('requer sala', () => {
    expect(validate({ ...validBase, spaceId: '' })).toContain('sala')
  })

  it('requer data', () => {
    expect(validate({ ...validBase, bookingDate: '' })).toContain('data')
  })

  it('requer horario de inicio', () => {
    expect(validate({ ...validBase, startTime: '' })).toContain('horario')
  })

  it('requer horario de termino', () => {
    expect(validate({ ...validBase, endTime: '' })).toContain('horario')
  })

  it('rejeita horario inicio >= termino', () => {
    expect(validate({ ...validBase, startTime: '10:00', endTime: '08:00' })).toContain('posterior')
    expect(validate({ ...validBase, startTime: '10:00', endTime: '10:00' })).toContain('posterior')
  })

  it('requer nome do evento', () => {
    expect(validate({ ...validBase, eventName: '  ' })).toContain('evento')
  })

  it('requer nome do contato', () => {
    expect(validate({ ...validBase, contactName: '' })).toContain('contato')
  })

  it('requer email do contato', () => {
    expect(validate({ ...validBase, contactEmail: '' })).toContain('email')
  })

  it('requer CNPJ para nao-isento', () => {
    expect(validate({ ...validBase, cnpj: '' })).toContain('CNPJ')
  })

  it('requer Razao Social para nao-isento', () => {
    expect(validate({ ...validBase, razaoSocial: '' })).toContain('Razao Social')
  })

  it('requer valor total para nao-isento', () => {
    expect(validate({ ...validBase, totalAmount: '' })).toContain('valor')
  })

  it('NAO requer CNPJ para isento', () => {
    expect(validate({ ...validBase, isExempt: true, cnpj: '', razaoSocial: '', totalAmount: '' })).toBeNull()
  })

  it('NAO requer Razao Social para isento', () => {
    expect(validate({ ...validBase, isExempt: true, razaoSocial: '' })).toBeNull()
  })

  it('NAO requer valor total para isento', () => {
    expect(validate({ ...validBase, isExempt: true, totalAmount: '' })).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════
// Montagem do payload
// ═══════════════════════════════════════════════════════════
describe('buildPayload', () => {
  it('monta payload de locacao com empresa', () => {
    const payload = buildPayload({
      spaceId: 'room-1',
      bookingDate: '2026-04-22',
      startTime: '08:00',
      endTime: '12:00',
      eventName: '  Conferencia  ',
      eventPurpose: 'Treinamento',
      estimatedAttendees: '50',
      bookingType: 'Locação Cliente',
      totalAmount: '3.700,00',
      contactName: ' Joao ',
      contactEmail: 'joao@test.com',
      contactPhone: '(19) 99999-9999',
      cnpj: '11.222.333/0001-81',
      razaoSocial: ' Empresa Teste ',
      isExempt: false,
    })

    expect(payload.booking.event_name).toBe('Conferencia')
    expect(payload.booking.total_amount).toBe(3700)
    expect(payload.booking.estimated_attendees).toBe(50)
    expect(payload.booking.onsite_contact_phone).toBe('19999999999')
    expect(payload.company).not.toBeNull()
    expect(payload.company?.cnpj).toBe('11222333000181')
    expect(payload.company?.razao_social).toBe('Empresa Teste')
    expect(payload.user.name).toBe('Joao')
    expect(payload.user.phone).toBe('19999999999')
  })

  it('monta payload de cessao sem empresa e valor zero', () => {
    const payload = buildPayload({
      spaceId: 'room-2',
      bookingDate: '2026-04-23',
      startTime: '14:00',
      endTime: '16:00',
      eventName: 'Cessao Prefeitura',
      eventPurpose: '',
      estimatedAttendees: '',
      bookingType: 'Cessão',
      totalAmount: '0,00',
      contactName: 'Maria',
      contactEmail: 'maria@gov.br',
      contactPhone: '',
      cnpj: '',
      razaoSocial: '',
      isExempt: true,
    })

    expect(payload.booking.total_amount).toBe(0)
    expect(payload.booking.estimated_attendees).toBeNull()
    expect(payload.company).toBeNull()
    expect(payload.user.phone).toBe('')
  })

  it('faz trim em todos os campos de texto', () => {
    const payload = buildPayload({
      spaceId: 'room-1',
      bookingDate: '2026-04-22',
      startTime: '08:00',
      endTime: '10:00',
      eventName: '  Evento  ',
      eventPurpose: '  Proposito  ',
      estimatedAttendees: '',
      bookingType: 'Uso Interno',
      totalAmount: '',
      contactName: '  Nome  ',
      contactEmail: '  email@test.com  ',
      contactPhone: '',
      cnpj: '',
      razaoSocial: '',
      isExempt: true,
    })

    expect(payload.booking.event_name).toBe('Evento')
    expect(payload.booking.event_purpose).toBe('Proposito')
    expect(payload.user.name).toBe('Nome')
    expect(payload.user.email).toBe('email@test.com')
  })

  it('parse de valor formatado em BRL para numero', () => {
    const payload = buildPayload({
      spaceId: 'room-1',
      bookingDate: '2026-04-22',
      startTime: '08:00',
      endTime: '10:00',
      eventName: 'Teste',
      eventPurpose: '',
      estimatedAttendees: '',
      bookingType: 'Locação Cliente',
      totalAmount: '12.500,50',
      contactName: 'Teste',
      contactEmail: 'test@test.com',
      contactPhone: '',
      cnpj: '11222333000181',
      razaoSocial: 'Empresa',
      isExempt: false,
    })

    expect(payload.booking.total_amount).toBe(12500.50)
  })
})

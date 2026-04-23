import { describe, it, expect } from 'vitest'
import type {
  BookingStatus, BookingType, BookingListItem, BookingDetail, BookingSlot,
  Room, RoomPricing, RoomPayload, ShiftPrice,
  Company, CompanyBooking, Coupon, CouponPayload,
  AgendaEvent, User, SystemSettings, NewBookingPayload,
} from '@/lib/types'

describe('BookingStatus type', () => {
  it('aceita todos os status validos', () => {
    const statuses: BookingStatus[] = [
      'Pre-reserva', 'Confirmada', 'Cancelada', 'Pendente', 'Concluída', 'Perdida',
    ]
    expect(statuses).toHaveLength(6)
  })
})

describe('BookingType type', () => {
  it('aceita todos os tipos validos', () => {
    const types: BookingType[] = [
      'Locação Cliente', 'Cessão', 'Curso', 'Uso Interno',
    ]
    expect(types).toHaveLength(4)
  })
})

describe('BookingListItem interface', () => {
  it('aceita item com booking_type definido', () => {
    const item: BookingListItem = {
      id: '123',
      event_name: 'Teste',
      status: 'Confirmada',
      total_amount: 1000,
      company_name: 'Empresa',
      event_date: '2026-04-22',
      booking_type: 'Locação Cliente',
    }
    expect(item.booking_type).toBe('Locação Cliente')
  })

  it('aceita item sem booking_type (opcional)', () => {
    const item: BookingListItem = {
      id: '123',
      event_name: 'Teste',
      status: 'Pendente',
      total_amount: '500.00',
      company_name: 'Empresa',
      event_date: null,
    }
    expect(item.booking_type).toBeUndefined()
  })
})

describe('BookingSlot interface', () => {
  it('aceita slot com event_end_time opcional', () => {
    const slot: BookingSlot = {
      booking_date: '2026-04-22',
      start_time: '08:00',
      end_time: '12:30',
    }
    expect(slot.event_end_time).toBeUndefined()

    const slotWithEnd: BookingSlot = {
      ...slot,
      event_end_time: '12:00',
    }
    expect(slotWithEnd.event_end_time).toBe('12:00')
  })
})

describe('AgendaEvent interface', () => {
  it('aceita evento com event_end_time opcional', () => {
    const ev: AgendaEvent = {
      id: '1',
      space_id: 'room-1',
      space_name: 'Sala 1',
      event_name: 'Reuniao',
      company_name: 'ACIPI',
      status: 'Confirmada',
      date: '2026-04-22',
      start_time: '08:00',
      end_time: '10:30',
    }
    expect(ev.event_end_time).toBeUndefined()
  })
})

describe('Room interface', () => {
  it('aceita sala com pricing completo', () => {
    const room: Room = {
      id: 'room-1',
      name: 'Auditorio',
      capacity: 100,
      pricing: {
        weekdays: {
          morning: { base: 925, extra: 0 },
          afternoon: { base: 925, extra: 0 },
          night: { base: 925, extra: 0 },
          min_hours: 4,
        },
        weekends: {
          morning: { base: 1200, extra: 0 },
          afternoon: { base: 1480, extra: 0 },
          night: { base: 1480, extra: 0 },
          min_hours: 5,
        },
        assembly: { allowed: true, half_price: 500, full_price: 750 },
      },
    }
    expect(room.pricing?.weekdays.min_hours).toBe(4)
    expect(room.pricing?.assembly.allowed).toBe(true)
  })

  it('aceita sala sem pricing (opcional)', () => {
    const room: Room = { id: 'room-2', name: 'Sala 2', capacity: 20 }
    expect(room.pricing).toBeUndefined()
  })
})

describe('NewBookingPayload interface', () => {
  it('monta payload de locacao cliente com empresa', () => {
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
      },
      company: { cnpj: '11222333000181', razao_social: 'Empresa Teste' },
      user: { name: 'Joao', email: 'joao@teste.com', phone: '19999999999' },
    }
    expect(payload.company).not.toBeNull()
    expect(payload.booking.booking_type).toBe('Locação Cliente')
  })

  it('monta payload de cessao sem empresa', () => {
    const payload: NewBookingPayload = {
      booking: {
        space_id: 'room-1',
        booking_date: '2026-04-22',
        start_time: '08:00',
        end_time: '10:00',
        event_name: 'Cessao Prefeitura',
        event_purpose: 'Palestra',
        estimated_attendees: null,
        booking_type: 'Cessão',
        total_amount: 0,
        onsite_contact_name: 'Maria',
        onsite_contact_phone: '',
      },
      company: null,
      user: { name: 'Maria', email: 'maria@prefeitura.gov.br', phone: '' },
    }
    expect(payload.company).toBeNull()
    expect(payload.booking.total_amount).toBe(0)
  })
})

describe('Coupon interface', () => {
  it('aceita cupom percentual', () => {
    const coupon: Coupon = {
      id: '1', code: 'DESC10', discount_type: 'percentage',
      discount_value: 10, max_uses: 100, current_uses: 5,
      valid_until: '2026-12-31', is_active: true,
    }
    expect(coupon.discount_type).toBe('percentage')
  })

  it('aceita cupom fixo sem limite de uso', () => {
    const coupon: Coupon = {
      id: '2', code: 'FIXO50', discount_type: 'fixed',
      discount_value: 50, max_uses: null, current_uses: 0,
      valid_until: null, is_active: true,
    }
    expect(coupon.max_uses).toBeNull()
  })
})

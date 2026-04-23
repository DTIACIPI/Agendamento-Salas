import { describe, it, expect } from 'vitest'
import {
  formatDateToISO,
  calculateDurationHours,
  getPriceForTimeSlot,
  calculateRoomPrice,
  isValidCNPJ,
} from '@/lib/utils'
import type { Room } from '@/components/room-list'

// ─── Helper: cria uma Room mínima para testes de pricing ───
// base = valor POR HORA do turno
// extra = valor por hora além da franquia (0 = usa base)
// min_hours = franquia mínima
function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'room-1',
    name: 'Sala Teste',
    description: '',
    capacity: 20,
    image: '/img.jpg',
    amenities: [],
    pricing: {
      weekdays: {
        morning:   { base: 100, extra: 0 },
        afternoon: { base: 150, extra: 0 },
        night:     { base: 200, extra: 0 },
        min_hours: 2,
      },
      weekends: {
        morning:   { base: 120, extra: 0 },
        afternoon: { base: 180, extra: 0 },
        night:     { base: 240, extra: 0 },
        min_hours: 2,
      },
      assembly: {
        allowed: false,
        half_price: 0,
        full_price: 0,
      },
    },
    available: true,
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════
// formatDateToISO
// ═══════════════════════════════════════════════════════════
describe('formatDateToISO', () => {
  it('formata data com mês e dia de dois dígitos', () => {
    expect(formatDateToISO(new Date(2026, 11, 25))).toBe('2026-12-25')
  })

  it('adiciona zero à esquerda em mês e dia', () => {
    expect(formatDateToISO(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('formata corretamente o último dia de fevereiro (ano não bissexto)', () => {
    expect(formatDateToISO(new Date(2025, 1, 28))).toBe('2025-02-28')
  })

  it('formata corretamente o 29 de fevereiro (ano bissexto)', () => {
    expect(formatDateToISO(new Date(2024, 1, 29))).toBe('2024-02-29')
  })
})

// ═══════════════════════════════════════════════════════════
// calculateDurationHours
// ═══════════════════════════════════════════════════════════
describe('calculateDurationHours', () => {
  it('calcula duração inteira corretamente', () => {
    expect(calculateDurationHours('08:00', '10:00')).toBe(2)
  })

  it('calcula meia hora corretamente', () => {
    expect(calculateDurationHours('08:00', '08:30')).toBe(0.5)
  })

  it('retorna 0 quando start ou end são vazios', () => {
    expect(calculateDurationHours('', '10:00')).toBe(0)
    expect(calculateDurationHours('08:00', '')).toBe(0)
  })

  it('retorna negativo quando end é antes de start (bug potencial)', () => {
    const result = calculateDurationHours('18:00', '08:00')
    expect(result).toBeLessThan(0)
  })

  it('retorna 0 quando horários são iguais', () => {
    expect(calculateDurationHours('10:00', '10:00')).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════
// getPriceForTimeSlot (shift-based: base=valor/hora)
// ═══════════════════════════════════════════════════════════
describe('getPriceForTimeSlot', () => {
  const room = makeRoom()

  it('calcula preço dentro de um único turno manhã (dia de semana)', () => {
    // Quarta, 08:00-10:00 => 2h × R$100/h = R$200
    const wed = new Date(2026, 3, 8)
    expect(getPriceForTimeSlot(room, wed, '08:00', '10:00')).toBe(200)
  })

  it('calcula preço cruzando dois turnos', () => {
    // 10:00-14:00 => 2h×100 (manhã) + 2h×150 (tarde) = 200+300 = 500
    const wed = new Date(2026, 3, 8)
    expect(getPriceForTimeSlot(room, wed, '10:00', '14:00')).toBe(500)
  })

  it('calcula preço cruzando três turnos', () => {
    // 08:00-20:00 => 4h×100 + 6h×150 + 2h×200 = 400+900+400 = 1700
    const wed = new Date(2026, 3, 8)
    expect(getPriceForTimeSlot(room, wed, '08:00', '20:00')).toBe(1700)
  })

  it('usa preço de fim de semana quando é sábado', () => {
    // Sábado, 08:00-10:00 => 2h × R$120/h = R$240
    const sat = new Date(2026, 3, 11)
    expect(getPriceForTimeSlot(room, sat, '08:00', '10:00')).toBe(240)
  })

  it('retorna 0 quando não há pricing configurado', () => {
    const emptyRoom = makeRoom({ pricing: undefined })
    const wed = new Date(2026, 3, 8)
    expect(getPriceForTimeSlot(emptyRoom, wed, '08:00', '10:00')).toBe(0)
  })

  it('cobra franquia mesmo com meia hora reservada', () => {
    // 08:00-08:30 => 0.5h, mas min_hours=2 → cobra 100/h × 2 = R$200
    const wed = new Date(2026, 3, 8)
    expect(getPriceForTimeSlot(room, wed, '08:00', '08:30')).toBe(200)
  })

  it('calcula meia hora corretamente quando sem franquia', () => {
    // Sala sem franquia (min_hours=0)
    const noMinRoom = makeRoom({
      pricing: {
        weekdays: {
          morning: { base: 100, extra: 0 },
          afternoon: { base: 150, extra: 0 },
          night: { base: 200, extra: 0 },
          min_hours: 0,
        },
        weekends: {
          morning: { base: 120, extra: 0 },
          afternoon: { base: 180, extra: 0 },
          night: { base: 240, extra: 0 },
          min_hours: 0,
        },
        assembly: { allowed: false, half_price: 0, full_price: 0 },
      },
    })
    const wed = new Date(2026, 3, 8)
    // 08:00-08:30 => 0.5h × R$100/h = R$50
    expect(getPriceForTimeSlot(noMinRoom, wed, '08:00', '08:30')).toBe(50)
  })

  it('calcula preço do turno da noite', () => {
    // 18:00-20:00 => 2h × R$200/h = R$400
    const wed = new Date(2026, 3, 8)
    expect(getPriceForTimeSlot(room, wed, '18:00', '20:00')).toBe(400)
  })

  // ─── Franquia (min_hours) ─────────────────────────────
  it('cobra franquia mínima quando reserva é menor que min_hours', () => {
    // min_hours=2, reservando 1h (08:00-09:00)
    // 1h × 100/h = 100, mas min_hours=2 → cobra 100/h × 2 = 200
    const wed = new Date(2026, 3, 8)
    expect(getPriceForTimeSlot(room, wed, '08:00', '09:00')).toBe(200)
  })

  it('não cobra franquia quando reserva excede min_hours', () => {
    // min_hours=2, reservando 3h (08:00-11:00) => 3h × 100 = 300
    const wed = new Date(2026, 3, 8)
    expect(getPriceForTimeSlot(room, wed, '08:00', '11:00')).toBe(300)
  })

  // ─── Hora extra ───────────────────────────────────────
  it('cobra hora extra além da franquia quando extra > 0', () => {
    // Sala com franquia=2, base=100, extra=80 (manhã)
    const roomExtra = makeRoom({
      pricing: {
        weekdays: {
          morning:   { base: 100, extra: 80 },
          afternoon: { base: 150, extra: 120 },
          night:     { base: 200, extra: 160 },
          min_hours: 2,
        },
        weekends: {
          morning:   { base: 120, extra: 0 },
          afternoon: { base: 180, extra: 0 },
          night:     { base: 240, extra: 0 },
          min_hours: 2,
        },
        assembly: { allowed: false, half_price: 0, full_price: 0 },
      },
    })
    const wed = new Date(2026, 3, 8)
    // 08:00-11:00 = 3h. Franquia 2h×100 = 200, extra 1h×80 = 80. Total = 280
    expect(getPriceForTimeSlot(roomExtra, wed, '08:00', '11:00')).toBe(280)
  })

  it('cobra base como extra quando extra=0', () => {
    // extra=0 → usa base para horas além da franquia
    const wed = new Date(2026, 3, 8)
    // 08:00-11:00 = 3h. Franquia 2h×100 + extra 1h×100 = 300
    expect(getPriceForTimeSlot(room, wed, '08:00', '11:00')).toBe(300)
  })

  // ─── Cenário real: Auditório ──────────────────────────
  it('calcula corretamente cenário do auditório (base=925, min_hours=4)', () => {
    const auditorio = makeRoom({
      pricing: {
        weekdays: {
          morning:   { base: 925, extra: 0 },
          afternoon: { base: 925, extra: 0 },
          night:     { base: 925, extra: 0 },
          min_hours: 4,
        },
        weekends: {
          morning:   { base: 1200, extra: 0 },
          afternoon: { base: 1480, extra: 0 },
          night:     { base: 1480, extra: 0 },
          min_hours: 5,
        },
        assembly: { allowed: true, half_price: 500, full_price: 750 },
      },
    })
    const wed = new Date(2026, 3, 8)

    // 2h reservadas, min_hours=4 → cobra 925 × 4 = 3700
    expect(getPriceForTimeSlot(auditorio, wed, '08:00', '10:00')).toBe(3700)

    // 4h exatas → cobra 925 × 4 = 3700
    expect(getPriceForTimeSlot(auditorio, wed, '08:00', '12:00')).toBe(3700)

    // 6h (08-14) → franquia 4h×925=3700 + extra 2h×925=1850 = 5550
    expect(getPriceForTimeSlot(auditorio, wed, '08:00', '14:00')).toBe(5550)
  })
})

// ═══════════════════════════════════════════════════════════
// calculateRoomPrice
// ═══════════════════════════════════════════════════════════
describe('calculateRoomPrice', () => {
  const room = makeRoom()

  it('retorna zeros quando date é undefined', () => {
    const result = calculateRoomPrice(room, undefined, '08:00', '10:00')
    expect(result.basePrice).toBe(0)
    expect(result.finalPrice).toBe(0)
  })

  it('retorna zeros quando startTime é vazio', () => {
    const result = calculateRoomPrice(room, new Date(2026, 3, 8), '', '10:00')
    expect(result.basePrice).toBe(0)
  })

  it('calcula sem desconto para não-associado', () => {
    const wed = new Date(2026, 3, 8)
    const result = calculateRoomPrice(room, wed, '08:00', '10:00', 0)
    expect(result.basePrice).toBe(200)
    expect(result.discountPercent).toBe(0)
    expect(result.discount).toBe(0)
    expect(result.finalPrice).toBe(200)
  })

  it('aplica desconto de 10% para associado até 12 meses', () => {
    const wed = new Date(2026, 3, 8)
    const result = calculateRoomPrice(room, wed, '08:00', '10:00', 6)
    expect(result.discountPercent).toBe(10)
    expect(result.finalPrice).toBe(180) // 200 - 20
  })

  it('aplica desconto de 20% para associado de 13-24 meses', () => {
    const wed = new Date(2026, 3, 8)
    const result = calculateRoomPrice(room, wed, '08:00', '10:00', 18)
    expect(result.discountPercent).toBe(20)
    expect(result.finalPrice).toBe(160)
  })

  it('aplica desconto de 30% para associado acima de 24 meses', () => {
    const wed = new Date(2026, 3, 8)
    const result = calculateRoomPrice(room, wed, '08:00', '10:00', 36)
    expect(result.discountPercent).toBe(30)
    expect(result.finalPrice).toBe(140)
  })

  it('calcula preço para range de múltiplos dias', () => {
    // 2 dias de quarta (08 e 09/04), 08:00-10:00 cada => 200 × 2 = 400
    const from = new Date(2026, 3, 8)
    const to = new Date(2026, 3, 9)
    const result = calculateRoomPrice(room, from, '08:00', '10:00', 0, { from, to })
    expect(result.basePrice).toBe(400)
  })

  it('calcula preço de range incluindo sábado', () => {
    // Sexta (10) + Sábado (11), 08:00-10:00
    // Sexta: 2h×100 = 200, Sábado: 2h×120 = 240 => Total: 440
    const from = new Date(2026, 3, 10)
    const to = new Date(2026, 3, 11)
    const result = calculateRoomPrice(room, from, '08:00', '10:00', 0, { from, to })
    expect(result.basePrice).toBe(440)
  })

  it('desconto no limite exato de 12 meses é 10%', () => {
    const wed = new Date(2026, 3, 8)
    const result = calculateRoomPrice(room, wed, '08:00', '10:00', 12)
    expect(result.discountPercent).toBe(10)
  })

  it('desconto no limite exato de 24 meses é 20%', () => {
    const wed = new Date(2026, 3, 8)
    const result = calculateRoomPrice(room, wed, '08:00', '10:00', 24)
    expect(result.discountPercent).toBe(20)
  })
})

// ═══════════════════════════════════════════════════════════
// isValidCNPJ
// ═══════════════════════════════════════════════════════════
describe('isValidCNPJ', () => {
  it('valida CNPJ correto sem formatação', () => {
    expect(isValidCNPJ('11222333000181')).toBe(true)
  })

  it('valida CNPJ correto com formatação', () => {
    expect(isValidCNPJ('11.222.333/0001-81')).toBe(true)
  })

  it('rejeita CNPJ com dígitos incorretos', () => {
    expect(isValidCNPJ('11222333000199')).toBe(false)
  })

  it('rejeita CNPJ com todos os dígitos iguais', () => {
    expect(isValidCNPJ('00000000000000')).toBe(false)
    expect(isValidCNPJ('11111111111111')).toBe(false)
    expect(isValidCNPJ('99999999999999')).toBe(false)
  })

  it('rejeita CNPJ com tamanho incorreto', () => {
    expect(isValidCNPJ('1234567890')).toBe(false)
    expect(isValidCNPJ('123456789012345')).toBe(false)
  })

  it('rejeita string vazia', () => {
    expect(isValidCNPJ('')).toBe(false)
  })

  it('valida CNPJs conhecidos', () => {
    expect(isValidCNPJ('33.000.167/0001-01')).toBe(true)
    expect(isValidCNPJ('00.000.000/0001-91')).toBe(true)
  })

  it('rejeita CNPJ com letras misturadas', () => {
    expect(isValidCNPJ('11.222.333/0001-AB')).toBe(false)
  })
})

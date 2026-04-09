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
function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'room-1',
    name: 'Sala Teste',
    description: '',
    capacity: 20,
    image: '/img.jpg',
    amenities: [],
    minHoursWeekday: 2,
    minHoursSaturday: 2,
    pricePeriodsWeekday: [
      { startHour: 8, endHour: 12, price: 100 },
      { startHour: 12, endHour: 18, price: 150 },
      { startHour: 18, endHour: 22, price: 200 },
    ],
    pricePeriodsSaturday: [
      { startHour: 8, endHour: 12, price: 120 },
      { startHour: 12, endHour: 18, price: 180 },
    ],
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
// getPriceForTimeSlot
// ═══════════════════════════════════════════════════════════
describe('getPriceForTimeSlot', () => {
  const room = makeRoom()

  it('calcula preço dentro de um único período (dia de semana)', () => {
    // Quarta-feira, 08:00-10:00 => 2h × R$100 = R$200
    const wed = new Date(2026, 3, 8) // quarta
    expect(getPriceForTimeSlot(room, wed, '08:00', '10:00')).toBe(200)
  })

  it('calcula preço cruzando dois períodos', () => {
    // 10:00-14:00 => 2h×100 (10-12) + 2h×150 (12-14) = 200+300 = 500
    const wed = new Date(2026, 3, 8)
    expect(getPriceForTimeSlot(room, wed, '10:00', '14:00')).toBe(500)
  })

  it('calcula preço cruzando três períodos', () => {
    // 08:00-20:00 => 4h×100 + 6h×150 + 2h×200 = 400+900+400 = 1700
    const wed = new Date(2026, 3, 8)
    expect(getPriceForTimeSlot(room, wed, '08:00', '20:00')).toBe(1700)
  })

  it('usa preço de sábado quando é sábado', () => {
    // Sábado, 08:00-10:00 => 2h × R$120 = R$240
    const sat = new Date(2026, 3, 11) // sábado
    expect(getPriceForTimeSlot(room, sat, '08:00', '10:00')).toBe(240)
  })

  it('retorna 0 quando não há períodos configurados', () => {
    const emptyRoom = makeRoom({ pricePeriodsWeekday: [] })
    const wed = new Date(2026, 3, 8)
    expect(getPriceForTimeSlot(emptyRoom, wed, '08:00', '10:00')).toBe(0)
  })

  it('usa fallback quando horário está fora dos períodos', () => {
    // Sábado com períodos até 18h, mas reservando 18:00-20:00
    // Fallback = preço do primeiro período (120)
    const sat = new Date(2026, 3, 11)
    const result = getPriceForTimeSlot(room, sat, '18:00', '20:00')
    expect(result).toBe(2 * 120) // 2h × fallback
  })

  it('calcula corretamente com meia hora', () => {
    // 08:00-08:30 => 0.5h × 100 = 50
    const wed = new Date(2026, 3, 8)
    expect(getPriceForTimeSlot(room, wed, '08:00', '08:30')).toBe(50)
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

  it('aplica mínimo de horas quando reserva é menor', () => {
    // minHoursWeekday = 2, mas reservando apenas 1h (08:00-09:00)
    // Preço real: 1h × 100 = 100, rate = 100/h, minHours = 2 => 200
    const wed = new Date(2026, 3, 8)
    const result = calculateRoomPrice(room, wed, '08:00', '09:00', 0)
    expect(result.basePrice).toBe(200) // cobra mínimo de 2h
  })

  it('não aplica mínimo quando reserva excede minHours', () => {
    // 3h reservadas com mín 2h => cobra 3h normais
    const wed = new Date(2026, 3, 8)
    const result = calculateRoomPrice(room, wed, '08:00', '11:00', 0)
    expect(result.basePrice).toBe(300) // 3h × 100
  })

  it('calcula preço para range de múltiplos dias', () => {
    // 2 dias de quarta (08 e 09/04), 08:00-10:00 cada => 200 × 2 = 400
    const from = new Date(2026, 3, 8) // quarta
    const to = new Date(2026, 3, 9)   // quinta
    const result = calculateRoomPrice(room, from, '08:00', '10:00', 0, { from, to })
    expect(result.basePrice).toBe(400)
  })

  it('calcula preço de range incluindo sábado', () => {
    // Sexta (10) + Sábado (11), 08:00-10:00
    // Sexta: 2h×100 = 200, Sábado: 2h×120 = 240 => Total: 440
    const from = new Date(2026, 3, 10) // sexta
    const to = new Date(2026, 3, 11)   // sábado
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
    // CNPJ da Petrobras
    expect(isValidCNPJ('33.000.167/0001-01')).toBe(true)
    // CNPJ do Banco do Brasil
    expect(isValidCNPJ('00.000.000/0001-91')).toBe(true)
  })

  it('rejeita CNPJ com letras misturadas', () => {
    expect(isValidCNPJ('11.222.333/0001-AB')).toBe(false)
  })
})

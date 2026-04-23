import { describe, it, expect } from 'vitest'
import { TIME_OPTIONS, isSlotOccupied, isRangeAvailable } from '@/components/booking-calendar'
import type { OccupiedSlot } from '@/app/page'

// ═══════════════════════════════════════════════════════════
// TIME_OPTIONS
// ═══════════════════════════════════════════════════════════
describe('TIME_OPTIONS', () => {
  it('começa às 08:00', () => {
    expect(TIME_OPTIONS[0]).toBe('08:00')
  })

  it('termina às 22:00', () => {
    expect(TIME_OPTIONS[TIME_OPTIONS.length - 1]).toBe('22:00')
  })

  it('tem intervalos de 30 minutos', () => {
    expect(TIME_OPTIONS[1]).toBe('08:30')
    expect(TIME_OPTIONS[2]).toBe('09:00')
  })

  it('não inclui 22:30 (limite é 22:00)', () => {
    expect(TIME_OPTIONS).not.toContain('22:30')
  })

  it('tem 29 opções (08:00 a 22:00 em intervalos de 30min)', () => {
    // 08:00, 08:30, ..., 21:30, 22:00 = 14h × 2 + 1 = 29
    expect(TIME_OPTIONS).toHaveLength(29)
  })
})

// ═══════════════════════════════════════════════════════════
// isSlotOccupied
// ═══════════════════════════════════════════════════════════
describe('isSlotOccupied', () => {
  const date = new Date(2026, 3, 8) // 2026-04-08

  const slots: OccupiedSlot[] = [
    { date: '2026-04-08', startTime: '10:00', endTime: '12:00' },
  ]

  it('retorna true para horário dentro do período ocupado', () => {
    expect(isSlotOccupied(date, '10:00', slots)).toBe(true)
    expect(isSlotOccupied(date, '11:00', slots)).toBe(true)
    expect(isSlotOccupied(date, '11:30', slots)).toBe(true)
  })

  it('libera horário imediatamente antes do slot', () => {
    expect(isSlotOccupied(date, '09:30', slots)).toBe(false)
  })

  it('libera horário exatamente no fim do slot', () => {
    expect(isSlotOccupied(date, '12:00', slots)).toBe(false)
  })

  it('libera horário bem antes do slot', () => {
    expect(isSlotOccupied(date, '09:00', slots)).toBe(false)
  })

  it('retorna false quando não há slots', () => {
    expect(isSlotOccupied(date, '10:00', [])).toBe(false)
  })

  it('retorna false para data diferente', () => {
    const otherDate = new Date(2026, 3, 9) // 2026-04-09
    expect(isSlotOccupied(otherDate, '10:00', slots)).toBe(false)
  })

  it('retorna false quando time é vazio', () => {
    expect(isSlotOccupied(date, '', slots)).toBe(false)
  })

  it('lida com múltiplos slots no mesmo dia', () => {
    const multiSlots: OccupiedSlot[] = [
      { date: '2026-04-08', startTime: '08:00', endTime: '09:00' },
      { date: '2026-04-08', startTime: '14:00', endTime: '16:00' },
    ]
    // Dentro do primeiro slot
    expect(isSlotOccupied(date, '08:00', multiSlots)).toBe(true)
    // Entre os dois slots (livre)
    expect(isSlotOccupied(date, '10:00', multiSlots)).toBe(false)
    // Dentro do segundo slot
    expect(isSlotOccupied(date, '15:00', multiSlots)).toBe(true)
  })

  it('horário entre dois slots distantes está livre', () => {
    const spacedSlots: OccupiedSlot[] = [
      { date: '2026-04-08', startTime: '08:00', endTime: '09:00' },
      { date: '2026-04-08', startTime: '14:00', endTime: '16:00' },
    ]
    expect(isSlotOccupied(date, '09:30', spacedSlots)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════
// isRangeAvailable
// ═══════════════════════════════════════════════════════════
describe('isRangeAvailable', () => {
  const date = new Date(2026, 3, 8) // 2026-04-08

  const slots: OccupiedSlot[] = [
    { date: '2026-04-08', startTime: '10:00', endTime: '12:00' },
  ]

  it('retorna true quando range está totalmente livre', () => {
    expect(isRangeAvailable(date, '13:00', '15:00', slots)).toBe(true)
  })

  it('retorna false quando range sobrepõe slot ocupado', () => {
    expect(isRangeAvailable(date, '09:00', '11:00', slots)).toBe(false)
  })

  it('retorna false quando range está dentro do slot ocupado', () => {
    expect(isRangeAvailable(date, '10:00', '11:00', slots)).toBe(false)
  })

  it('retorna true quando range termina exatamente no início do slot', () => {
    expect(isRangeAvailable(date, '09:00', '10:00', slots)).toBe(true)
  })

  it('retorna true quando range começa exatamente no fim do slot', () => {
    expect(isRangeAvailable(date, '12:00', '14:00', slots)).toBe(true)
  })

  it('retorna false quando start >= end', () => {
    expect(isRangeAvailable(date, '10:00', '10:00', slots)).toBe(false)
    expect(isRangeAvailable(date, '12:00', '10:00', slots)).toBe(false)
  })

  it('retorna false quando horários são inválidos', () => {
    expect(isRangeAvailable(date, '07:00', '10:00', slots)).toBe(false) // 07:00 não está em TIME_OPTIONS
    expect(isRangeAvailable(date, '', '10:00', slots)).toBe(false)
  })

  it('retorna true quando não há slots ocupados', () => {
    expect(isRangeAvailable(date, '08:00', '22:00', [])).toBe(true)
  })

  it('retorna true quando range começa no fim exato do slot', () => {
    expect(isRangeAvailable(date, '12:00', '13:00', slots)).toBe(true)
  })
})

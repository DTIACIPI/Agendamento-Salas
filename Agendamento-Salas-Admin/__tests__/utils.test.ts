import { describe, it, expect } from 'vitest'
import { cn, formatCurrency, generateAgendaSlots, DEFAULT_SETTINGS, API_BASE_URL } from '@/lib/utils'

describe('API_BASE_URL', () => {
  it('aponta para o servidor correto', () => {
    expect(API_BASE_URL).toBe('https://acipiapi.eastus.cloudapp.azure.com')
  })
})

describe('DEFAULT_SETTINGS', () => {
  it('tem horarios padrao 08:00-22:00', () => {
    expect(DEFAULT_SETTINGS.open_time).toBe('08:00')
    expect(DEFAULT_SETTINGS.close_time).toBe('22:00')
  })

  it('bloqueia domingos por padrao', () => {
    expect(DEFAULT_SETTINGS.block_sundays).toBe(true)
  })

  it('tem 3 faixas de desconto (10/20/30)', () => {
    expect(DEFAULT_SETTINGS.discount_tier1_pct).toBe(10)
    expect(DEFAULT_SETTINGS.discount_tier2_pct).toBe(20)
    expect(DEFAULT_SETTINGS.discount_tier3_pct).toBe(30)
  })
})

describe('cn', () => {
  it('mescla classes simples', () => {
    expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white')
  })

  it('resolve conflitos de tailwind (ultima vence)', () => {
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500')
  })

  it('ignora valores falsy', () => {
    expect(cn('text-sm', false && 'hidden', null, undefined, '')).toBe('text-sm')
  })

  it('suporta classes condicionais', () => {
    const isActive = true
    expect(cn('base', isActive && 'active')).toBe('base active')
  })
})

describe('formatCurrency', () => {
  it('formata valor inteiro em BRL', () => {
    expect(formatCurrency(1000)).toMatch(/1[.\s]?000/)
    expect(formatCurrency(1000)).toContain('R$')
  })

  it('formata zero', () => {
    expect(formatCurrency(0)).toContain('0,00')
  })

  it('formata valor com centavos', () => {
    expect(formatCurrency(1234.56)).toContain('1.234,56')
  })

  it('formata valor negativo', () => {
    const result = formatCurrency(-500)
    expect(result).toContain('500')
  })

  it('formata valores grandes', () => {
    const result = formatCurrency(1000000)
    expect(result).toContain('1.000.000')
  })
})

describe('generateAgendaSlots', () => {
  it('gera slots de 2 em 2 horas (padrao)', () => {
    const slots = generateAgendaSlots('08:00', '22:00')
    expect(slots[0]).toBe('08:00')
    expect(slots[1]).toBe('10:00')
    expect(slots[2]).toBe('12:00')
    expect(slots[slots.length - 1]).toBe('22:00')
  })

  it('gera slots com step customizado', () => {
    const slots = generateAgendaSlots('08:00', '12:00', 1)
    expect(slots).toEqual(['08:00', '09:00', '10:00', '11:00', '12:00'])
  })

  it('retorna array vazio quando end <= start', () => {
    expect(generateAgendaSlots('22:00', '08:00')).toEqual([])
    expect(generateAgendaSlots('10:00', '10:00')).toEqual([])
  })

  it('retorna array vazio para horarios invalidos', () => {
    expect(generateAgendaSlots('abc', '22:00')).toEqual([])
  })

  it('gera 8 slots para 08:00-22:00 step 2', () => {
    const slots = generateAgendaSlots('08:00', '22:00', 2)
    expect(slots).toHaveLength(8)
  })
})

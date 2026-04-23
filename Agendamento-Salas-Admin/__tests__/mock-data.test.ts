import { describe, it, expect } from 'vitest'
import { initialContracts, ALL_AMENITIES } from '@/lib/mock-data'

describe('initialContracts', () => {
  it('tem contratos iniciais definidos', () => {
    expect(initialContracts.length).toBeGreaterThan(0)
  })

  it('cada contrato tem campos obrigatorios', () => {
    for (const c of initialContracts) {
      expect(c.id).toBeTruthy()
      expect(c.bookingId).toBeTruthy()
      expect(c.company).toBeTruthy()
      expect(c.date).toBeTruthy()
      expect(c.status).toBeTruthy()
    }
  })

  it('status dos contratos sao validos', () => {
    const validStatuses = ['Enviado para Assinatura', 'Assinado', 'Aguardando Assinatura']
    for (const c of initialContracts) {
      expect(validStatuses).toContain(c.status)
    }
  })
})

describe('ALL_AMENITIES', () => {
  it('tem amenidades definidas', () => {
    expect(ALL_AMENITIES.length).toBeGreaterThan(0)
  })

  it('inclui amenidades essenciais', () => {
    expect(ALL_AMENITIES).toContain('Wi-Fi')
    expect(ALL_AMENITIES).toContain('Ar Condicionado')
    expect(ALL_AMENITIES).toContain('Projetor')
  })

  it('nao tem duplicatas', () => {
    const unique = new Set(ALL_AMENITIES)
    expect(unique.size).toBe(ALL_AMENITIES.length)
  })
})

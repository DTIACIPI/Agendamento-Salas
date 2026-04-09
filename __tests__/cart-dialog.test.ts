import { describe, it, expect } from 'vitest'
import { isValidCNPJ } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════
// Máscara de CNPJ (lógica extraída do handleCnpjChange)
// ═══════════════════════════════════════════════════════════
function applyCnpjMask(raw: string): string {
  let v = raw.replace(/\D/g, '')
  if (v.length > 14) v = v.slice(0, 14)
  v = v.replace(/^(\d{2})(\d)/, '$1.$2')
  v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
  v = v.replace(/\.(\d{3})(\d)/, '.$1/$2')
  v = v.replace(/(\d{4})(\d)/, '$1-$2')
  return v
}

describe('Máscara de CNPJ (cart-dialog)', () => {
  it('aplica ponto após 2 dígitos', () => {
    expect(applyCnpjMask('112')).toBe('11.2')
  })

  it('aplica segundo ponto após 5 dígitos', () => {
    expect(applyCnpjMask('11222')).toBe('11.222')
    expect(applyCnpjMask('112223')).toBe('11.222.3')
  })

  it('aplica barra após 8 dígitos', () => {
    expect(applyCnpjMask('11222333')).toBe('11.222.333')
    expect(applyCnpjMask('112223330')).toBe('11.222.333/0')
  })

  it('aplica hífen após 12 dígitos', () => {
    expect(applyCnpjMask('112223330001')).toBe('11.222.333/0001')
    expect(applyCnpjMask('1122233300018')).toBe('11.222.333/0001-8')
  })

  it('formata CNPJ completo corretamente', () => {
    expect(applyCnpjMask('11222333000181')).toBe('11.222.333/0001-81')
  })

  it('limita a 14 dígitos', () => {
    expect(applyCnpjMask('112223330001819999')).toBe('11.222.333/0001-81')
  })

  it('remove caracteres não numéricos da entrada', () => {
    expect(applyCnpjMask('11.222.333/0001-81')).toBe('11.222.333/0001-81')
    expect(applyCnpjMask('abc11222def333ghi0001jkl81')).toBe('11.222.333/0001-81')
  })

  it('retorna vazio para entrada vazia', () => {
    expect(applyCnpjMask('')).toBe('')
  })
})

// ═══════════════════════════════════════════════════════════
// Lógica de canCheckout
// ═══════════════════════════════════════════════════════════
describe('Lógica de canCheckout', () => {
  interface BookingItem {
    id: string
    roomId: string
    startTime: string
    endTime: string
    hasConflict?: boolean
    confirmedToCart?: boolean
  }

  function canCheckout(
    cartRooms: string[],
    cartBookings: BookingItem[],
    allBookings: BookingItem[]
  ): boolean {
    const hasIncompleteItems = cartBookings.some(b => !b.startTime || !b.endTime)
    const hasConflicts = cartBookings.some(b => b.hasConflict)
    const hasOrphanBookings = allBookings.some(b => !b.confirmedToCart)

    return cartRooms.length > 0 && !hasIncompleteItems && !hasConflicts && !hasOrphanBookings
  }

  function getCartBookings(bookings: BookingItem[], cartRooms: string[]): BookingItem[] {
    return bookings.filter(b => cartRooms.includes(b.roomId) && b.confirmedToCart)
  }

  it('permite checkout com dados completos e confirmados', () => {
    const cartRooms = ['room-1']
    const bookings = [{ id: '1', roomId: 'room-1', startTime: '08:00', endTime: '10:00', confirmedToCart: true }]
    expect(canCheckout(cartRooms, bookings, bookings)).toBe(true)
  })

  it('bloqueia checkout com carrinho vazio', () => {
    expect(canCheckout([], [], [])).toBe(false)
  })

  it('bloqueia checkout com horário incompleto', () => {
    const cartRooms = ['room-1']
    const bookings = [{ id: '1', roomId: 'room-1', startTime: '08:00', endTime: '', confirmedToCart: true }]
    expect(canCheckout(cartRooms, bookings, bookings)).toBe(false)
  })

  it('bloqueia checkout com conflito', () => {
    const cartRooms = ['room-1']
    const bookings = [{ id: '1', roomId: 'room-1', startTime: '08:00', endTime: '10:00', hasConflict: true, confirmedToCart: true }]
    expect(canCheckout(cartRooms, bookings, bookings)).toBe(false)
  })

  it('bloqueia checkout com bookings não confirmados ao carrinho', () => {
    const cartRooms = ['room-1']
    const allBookings = [
      { id: '1', roomId: 'room-1', startTime: '08:00', endTime: '10:00', confirmedToCart: true },
      { id: '2', roomId: 'room-1', startTime: '14:00', endTime: '16:00', confirmedToCart: false }, // não confirmado
    ]
    const cartBookings = getCartBookings(allBookings, cartRooms)
    expect(canCheckout(cartRooms, cartBookings, allBookings)).toBe(false)
  })

  it('permite checkout com múltiplas salas confirmadas', () => {
    const cartRooms = ['room-1', 'room-2']
    const bookings = [
      { id: '1', roomId: 'room-1', startTime: '08:00', endTime: '10:00', confirmedToCart: true },
      { id: '2', roomId: 'room-2', startTime: '14:00', endTime: '16:00', confirmedToCart: true },
    ]
    expect(canCheckout(cartRooms, bookings, bookings)).toBe(true)
  })

  it('NÃO mostra booking não confirmado no cart (bug fix)', () => {
    const cartRooms = ['room-1']
    const allBookings = [
      { id: '1', roomId: 'room-1', startTime: '08:00', endTime: '10:00', confirmedToCart: true },
      { id: '2', roomId: 'room-1', startTime: '14:00', endTime: '16:00', confirmedToCart: false }, // novo dia, não confirmado
    ]
    const cartBookings = getCartBookings(allBookings, cartRooms)
    expect(cartBookings).toHaveLength(1)
    expect(cartBookings[0].id).toBe('1')
  })

  it('mostra booking após confirmação (sala já no carrinho)', () => {
    const cartRooms = ['room-1']
    const allBookings = [
      { id: '1', roomId: 'room-1', startTime: '08:00', endTime: '10:00', confirmedToCart: true },
      { id: '2', roomId: 'room-1', startTime: '14:00', endTime: '16:00', confirmedToCart: true }, // confirmado agora
    ]
    const cartBookings = getCartBookings(allBookings, cartRooms)
    expect(cartBookings).toHaveLength(2)
  })
})

// ═══════════════════════════════════════════════════════════
// Validação CNPJ no fluxo do cart (integração com isValidCNPJ)
// ═══════════════════════════════════════════════════════════
describe('Validação CNPJ no cart-dialog', () => {
  it('CNPJ formatado de 18 chars com dígitos válidos => pode prosseguir', () => {
    const cnpj = '11.222.333/0001-81'
    const isCnpjComplete = cnpj.length === 18
    const isCnpjValid = isCnpjComplete && isValidCNPJ(cnpj)
    expect(isCnpjValid).toBe(true)
  })

  it('CNPJ formatado incompleto => não pode prosseguir', () => {
    const cnpj = '11.222.333/0001-8'
    const isCnpjComplete = cnpj.length === 18
    expect(isCnpjComplete).toBe(false)
  })

  it('CNPJ formatado de 18 chars com dígitos inválidos => não pode prosseguir', () => {
    const cnpj = '11.222.333/0001-99'
    const isCnpjComplete = cnpj.length === 18
    const isCnpjValid = isCnpjComplete && isValidCNPJ(cnpj)
    expect(isCnpjValid).toBe(false)
  })
})

import { describe, it, expect } from 'vitest'
import type { BookingDetail, BookingSlot } from '@/lib/types'

const INTERNAL_TYPES = ['Cessão', 'Uso Interno', 'Curso']

function isInternal(bookingType: string | null | undefined): boolean {
  return INTERNAL_TYPES.includes(bookingType ?? '')
}

function formatSlots(slots: BookingSlot[]): string {
  if (!slots || slots.length === 0) return 'Sem horarios'
  return slots.map((s) => {
    const date = new Date(s.booking_date + 'T00:00:00')
    const formatted = date.toLocaleDateString('pt-BR')
    const start = s.start_time?.substring(0, 5) ?? ''
    const end = (s.event_end_time ?? s.end_time)?.substring(0, 5) ?? ''
    return `${formatted} ${start}–${end}`
  }).join(' | ')
}

function formatAmount(value: string | null): string {
  if (!value) return 'R$ 0,00'
  const n = parseFloat(value)
  if (!isFinite(n)) return value
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

// ═══════════════════════════════════════════════════════════
// Classificacao interna/externa
// ═══════════════════════════════════════════════════════════
describe('isInternal (classificacao de tipo)', () => {
  it('classifica Cessao como interno', () => {
    expect(isInternal('Cessão')).toBe(true)
  })

  it('classifica Uso Interno como interno', () => {
    expect(isInternal('Uso Interno')).toBe(true)
  })

  it('classifica Curso como interno', () => {
    expect(isInternal('Curso')).toBe(true)
  })

  it('classifica Locacao Cliente como externo', () => {
    expect(isInternal('Locação Cliente')).toBe(false)
  })

  it('classifica null como externo', () => {
    expect(isInternal(null)).toBe(false)
  })

  it('classifica undefined como externo', () => {
    expect(isInternal(undefined)).toBe(false)
  })

  it('classifica string vazia como externo', () => {
    expect(isInternal('')).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════
// Formatacao de slots
// ═══════════════════════════════════════════════════════════
describe('formatSlots', () => {
  it('retorna mensagem para array vazio', () => {
    expect(formatSlots([])).toBe('Sem horarios')
  })

  it('formata slot unico com event_end_time', () => {
    const slots: BookingSlot[] = [{
      booking_date: '2026-04-22',
      start_time: '08:00:00',
      end_time: '12:30:00',
      event_end_time: '12:00:00',
    }]
    const result = formatSlots(slots)
    expect(result).toContain('22/04/2026')
    expect(result).toContain('08:00')
    expect(result).toContain('12:00')
    expect(result).not.toContain('12:30')
  })

  it('usa end_time como fallback quando event_end_time ausente', () => {
    const slots: BookingSlot[] = [{
      booking_date: '2026-04-22',
      start_time: '08:00:00',
      end_time: '12:30:00',
    }]
    const result = formatSlots(slots)
    expect(result).toContain('12:30')
  })

  it('formata multiplos slots separados por pipe', () => {
    const slots: BookingSlot[] = [
      { booking_date: '2026-04-22', start_time: '08:00', end_time: '10:00' },
      { booking_date: '2026-04-23', start_time: '14:00', end_time: '16:00' },
    ]
    const result = formatSlots(slots)
    expect(result).toContain(' | ')
    expect(result).toContain('22/04/2026')
    expect(result).toContain('23/04/2026')
  })

  it('trunca horarios para 5 caracteres (HH:mm)', () => {
    const slots: BookingSlot[] = [{
      booking_date: '2026-04-22',
      start_time: '08:00:00',
      end_time: '10:00:00',
    }]
    const result = formatSlots(slots)
    expect(result).toContain('08:00')
    expect(result).not.toContain('08:00:00')
  })
})

// ═══════════════════════════════════════════════════════════
// Formatacao de valor
// ═══════════════════════════════════════════════════════════
describe('formatAmount', () => {
  it('formata null como R$ 0,00', () => {
    expect(formatAmount(null)).toBe('R$ 0,00')
  })

  it('formata string vazia como R$ 0,00', () => {
    expect(formatAmount('')).toBe('R$ 0,00')
  })

  it('formata valor numerico em string', () => {
    expect(formatAmount('1500.00')).toContain('1.500,00')
  })

  it('formata valor com centavos', () => {
    expect(formatAmount('1234.56')).toContain('1.234,56')
  })

  it('retorna string original para valor nao-numerico', () => {
    expect(formatAmount('invalido')).toBe('invalido')
  })

  it('formata zero', () => {
    expect(formatAmount('0')).toContain('0,00')
  })
})

// ═══════════════════════════════════════════════════════════
// Mascara de telefone
// ═══════════════════════════════════════════════════════════
function maskPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.replace(/^(\d{0,2})/, '($1')
  if (d.length <= 7) return d.replace(/^(\d{2})(\d{0,5})/, '($1) $2')
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
}

describe('maskPhone', () => {
  it('formata DDD parcial', () => {
    expect(maskPhone('19')).toBe('(19')
  })

  it('formata DDD + inicio', () => {
    expect(maskPhone('19999')).toBe('(19) 999')
  })

  it('formata numero completo', () => {
    expect(maskPhone('19999999999')).toBe('(19) 99999-9999')
  })

  it('remove caracteres nao-numericos', () => {
    expect(maskPhone('(19) 9a9b9c')).toBe('(19) 999')
  })

  it('limita a 11 digitos', () => {
    expect(maskPhone('199999999991234')).toBe('(19) 99999-9999')
  })
})

// ═══════════════════════════════════════════════════════════
// Mascara de CEP
// ═══════════════════════════════════════════════════════════
function maskCep(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return d.replace(/^(\d{5})(\d{0,3})/, '$1-$2')
}

describe('maskCep', () => {
  it('retorna digitos sem mascara para CEP parcial', () => {
    expect(maskCep('13414')).toBe('13414')
  })

  it('aplica mascara para CEP completo', () => {
    expect(maskCep('13414003')).toBe('13414-003')
  })

  it('limita a 8 digitos', () => {
    expect(maskCep('1341400399')).toBe('13414-003')
  })
})

// ═══════════════════════════════════════════════════════════
// Mascara de CNPJ
// ═══════════════════════════════════════════════════════════
function maskCnpj(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return d.replace(/^(\d{2})(\d{0,3})/, '$1.$2')
  if (d.length <= 8) return d.replace(/^(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3')
  if (d.length <= 12) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4')
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5')
}

describe('maskCnpj', () => {
  it('retorna 2 digitos sem mascara', () => {
    expect(maskCnpj('11')).toBe('11')
  })

  it('aplica ponto apos 2o digito', () => {
    expect(maskCnpj('11222')).toBe('11.222')
  })

  it('aplica segundo ponto', () => {
    expect(maskCnpj('11222333')).toBe('11.222.333')
  })

  it('aplica barra', () => {
    expect(maskCnpj('112223330001')).toBe('11.222.333/0001')
  })

  it('formata CNPJ completo', () => {
    expect(maskCnpj('11222333000181')).toBe('11.222.333/0001-81')
  })

  it('limita a 14 digitos', () => {
    expect(maskCnpj('1122233300018199')).toBe('11.222.333/0001-81')
  })
})

// ═══════════════════════════════════════════════════════════
// Mascara de moeda
// ═══════════════════════════════════════════════════════════
function maskCurrency(v: string): string {
  const d = v.replace(/\D/g, '')
  if (!d) return ''
  const n = parseInt(d, 10) / 100
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

describe('maskCurrency', () => {
  it('retorna vazio para string vazia', () => {
    expect(maskCurrency('')).toBe('')
  })

  it('formata centavos corretamente', () => {
    expect(maskCurrency('100')).toBe('1,00')
  })

  it('formata valor grande', () => {
    const result = maskCurrency('250000')
    expect(result).toContain('2.500,00')
  })

  it('ignora caracteres nao-numericos', () => {
    expect(maskCurrency('R$ 1.234,56')).toBe('1.234,56')
  })
})

// ═══════════════════════════════════════════════════════════
// Logica de status do footer
// ═══════════════════════════════════════════════════════════
describe('logica do footer do dossier', () => {
  function getFooterState(status: string, isInternal: boolean) {
    if (isInternal) return 'hidden'
    if (status === 'Pendente' || status === 'Pre-reserva') return 'approve-reject'
    if (status === 'Confirmada') return 'contract-conclude'
    return 'close-only'
  }

  it('esconde footer para eventos internos', () => {
    expect(getFooterState('Confirmada', true)).toBe('hidden')
    expect(getFooterState('Pre-reserva', true)).toBe('hidden')
  })

  it('mostra aprovar/rejeitar para Pre-reserva', () => {
    expect(getFooterState('Pre-reserva', false)).toBe('approve-reject')
  })

  it('mostra aprovar/rejeitar para Pendente', () => {
    expect(getFooterState('Pendente', false)).toBe('approve-reject')
  })

  it('mostra contrato/concluir para Confirmada', () => {
    expect(getFooterState('Confirmada', false)).toBe('contract-conclude')
  })

  it('mostra fechar para status terminais', () => {
    expect(getFooterState('Cancelada', false)).toBe('close-only')
    expect(getFooterState('Concluída', false)).toBe('close-only')
    expect(getFooterState('Perdida', false)).toBe('close-only')
  })
})

// ═══════════════════════════════════════════════════════════
// Logica de edicao do dossier
// ═══════════════════════════════════════════════════════════
describe('logica de edicao do dossier', () => {
  const TERMINAL_STATUSES = ['Cancelada', 'Concluída', 'Perdida']

  function canEdit(status: string): boolean {
    return !TERMINAL_STATUSES.includes(status)
  }

  it('permite edicao para Pre-reserva', () => {
    expect(canEdit('Pre-reserva')).toBe(true)
  })

  it('permite edicao para Confirmada', () => {
    expect(canEdit('Confirmada')).toBe(true)
  })

  it('permite edicao para Pendente', () => {
    expect(canEdit('Pendente')).toBe(true)
  })

  it('bloqueia edicao para Cancelada', () => {
    expect(canEdit('Cancelada')).toBe(false)
  })

  it('bloqueia edicao para Concluida', () => {
    expect(canEdit('Concluída')).toBe(false)
  })

  it('bloqueia edicao para Perdida', () => {
    expect(canEdit('Perdida')).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════
// Seguranca: total_amount (Super Admin vs Admin)
// ═══════════════════════════════════════════════════════════
describe('field-level security: total_amount', () => {
  function resolveAmount(
    isSuperAdmin: boolean,
    draftAmount: string,
    originalAmount: string,
  ): number {
    return isSuperAdmin
      ? parseFloat(draftAmount.replace(',', '.')) || 0
      : parseFloat(originalAmount.replace(',', '.')) || 0
  }

  it('Super Admin usa valor editado do draft', () => {
    // Draft usa formato BR (virgula decimal, sem ponto de milhar no input)
    expect(resolveAmount(true, '5000,00', '3000.00')).toBe(5000)
  })

  it('Super Admin com valor simples', () => {
    expect(resolveAmount(true, '1500,50', '0')).toBe(1500.5)
  })

  it('Admin usa valor original, ignora draft', () => {
    expect(resolveAmount(false, '99999,00', '3000.00')).toBe(3000)
  })

  it('retorna 0 para valores invalidos', () => {
    expect(resolveAmount(true, 'abc', '0')).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════
// Dados da empresa somente leitura no dossier
// ═══════════════════════════════════════════════════════════
describe('visibilidade de secoes no dossier', () => {
  function sectionsVisible(bookingType: string | null) {
    const internal = INTERNAL_TYPES.includes(bookingType ?? '')
    return {
      company: !internal,
      valor: !internal,
      pagamento: !internal,
      cupom: !internal,
      footer: !internal,
    }
  }

  it('exibe todas as secoes para Locacao Cliente', () => {
    const vis = sectionsVisible('Locação Cliente')
    expect(vis.company).toBe(true)
    expect(vis.valor).toBe(true)
    expect(vis.pagamento).toBe(true)
    expect(vis.footer).toBe(true)
  })

  it('oculta secoes financeiras e empresa para Cessao', () => {
    const vis = sectionsVisible('Cessão')
    expect(vis.company).toBe(false)
    expect(vis.valor).toBe(false)
    expect(vis.pagamento).toBe(false)
    expect(vis.footer).toBe(false)
  })

  it('oculta secoes financeiras e empresa para Uso Interno', () => {
    const vis = sectionsVisible('Uso Interno')
    expect(vis.company).toBe(false)
    expect(vis.valor).toBe(false)
  })

  it('oculta secoes financeiras e empresa para Curso', () => {
    const vis = sectionsVisible('Curso')
    expect(vis.company).toBe(false)
    expect(vis.valor).toBe(false)
  })

  it('exibe tudo quando tipo nao definido (legado)', () => {
    const vis = sectionsVisible(null)
    expect(vis.company).toBe(true)
    expect(vis.valor).toBe(true)
  })
})

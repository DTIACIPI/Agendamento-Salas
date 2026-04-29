import { describe, it, expect } from "vitest"
import {
  formatCurrency,
  addBusinessDays,
  formatDateToISO,
  calculateDurationHours,
  isValidCNPJ,
  getPriceForTimeSlot,
  calculateRoomPrice,
  DEFAULT_SETTINGS,
} from "./utils"

// ─── formatCurrency ──────────────────────────────────────────────────

describe("formatCurrency", () => {
  it("formata zero como R$ 0,00", () => {
    expect(formatCurrency(0)).toBe("R$ 0,00")
  })

  it("formata valor inteiro", () => {
    expect(formatCurrency(1500)).toBe("R$ 1.500,00")
  })

  it("formata valor com centavos", () => {
    expect(formatCurrency(49.9)).toBe("R$ 49,90")
  })

  it("formata valor negativo", () => {
    expect(formatCurrency(-120.5)).toBe("-R$ 120,50")
  })

  it("formata valor grande", () => {
    expect(formatCurrency(1234567.89)).toBe("R$ 1.234.567,89")
  })
})

// ─── addBusinessDays ─────────────────────────────────────────────────

describe("addBusinessDays", () => {
  it("avança 1 dia útil (segunda → terça)", () => {
    const monday = new Date(2026, 3, 27) // 27/04/2026 = segunda
    const result = addBusinessDays(monday, 1)
    expect(result.getDay()).toBe(2) // terça
    expect(result.getDate()).toBe(28)
  })

  it("pula fim de semana (sexta + 1 → segunda)", () => {
    const friday = new Date(2026, 4, 1) // 01/05/2026 = sexta
    const result = addBusinessDays(friday, 1)
    expect(result.getDay()).toBe(1) // segunda
    expect(result.getDate()).toBe(4)
  })

  it("pula fim de semana inteiro (sexta + 3 → quarta)", () => {
    const friday = new Date(2026, 4, 1)
    const result = addBusinessDays(friday, 3)
    expect(result.getDay()).toBe(3) // quarta
    expect(result.getDate()).toBe(6)
  })

  it("avança 5 dias úteis (segunda → segunda seguinte)", () => {
    const monday = new Date(2026, 3, 27)
    const result = addBusinessDays(monday, 5)
    expect(result.getDay()).toBe(1) // segunda
    expect(result.getDate()).toBe(4) // 04/05
  })

  it("0 dias úteis retorna o mesmo dia (hora zerada)", () => {
    const d = new Date(2026, 3, 27, 15, 30)
    const result = addBusinessDays(d, 0)
    expect(result.getDate()).toBe(27)
    expect(result.getHours()).toBe(0)
  })
})

// ─── formatDateToISO ─────────────────────────────────────────────────

describe("formatDateToISO", () => {
  it("formata data com zero-padding", () => {
    expect(formatDateToISO(new Date(2026, 0, 5))).toBe("2026-01-05")
  })

  it("formata data sem necessidade de padding", () => {
    expect(formatDateToISO(new Date(2026, 11, 25))).toBe("2026-12-25")
  })

  it("formata primeiro dia do ano", () => {
    expect(formatDateToISO(new Date(2026, 0, 1))).toBe("2026-01-01")
  })
})

// ─── calculateDurationHours ──────────────────────────────────────────

describe("calculateDurationHours", () => {
  it("calcula duração normal (08:00 → 12:00 = 4h)", () => {
    expect(calculateDurationHours("08:00", "12:00")).toBe(4)
  })

  it("calcula meia hora (08:00 → 08:30 = 0.5h)", () => {
    expect(calculateDurationHours("08:00", "08:30")).toBe(0.5)
  })

  it("calcula dia inteiro (08:00 → 22:00 = 14h)", () => {
    expect(calculateDurationHours("08:00", "22:00")).toBe(14)
  })

  it("retorna 0 se start vazio", () => {
    expect(calculateDurationHours("", "12:00")).toBe(0)
  })

  it("retorna 0 se end vazio", () => {
    expect(calculateDurationHours("08:00", "")).toBe(0)
  })
})

// ─── isValidCNPJ ─────────────────────────────────────────────────────

describe("isValidCNPJ", () => {
  it("valida CNPJ correto (11.222.333/0001-81)", () => {
    expect(isValidCNPJ("11222333000181")).toBe(true)
  })

  it("valida CNPJ com pontuação", () => {
    expect(isValidCNPJ("11.222.333/0001-81")).toBe(true)
  })

  it("rejeita CNPJ com todos dígitos iguais", () => {
    expect(isValidCNPJ("11111111111111")).toBe(false)
  })

  it("rejeita CNPJ com tamanho errado", () => {
    expect(isValidCNPJ("1234567")).toBe(false)
  })

  it("rejeita CNPJ com dígito verificador errado", () => {
    expect(isValidCNPJ("11222333000182")).toBe(false)
  })

  it("rejeita string vazia", () => {
    expect(isValidCNPJ("")).toBe(false)
  })
})

// ─── getPriceForTimeSlot ─────────────────────────────────────────────

const mockRoom = {
  id: "1",
  name: "Auditório",
  description: "",
  capacity: 50,
  image: "",
  amenities: [],
  available: true,
  pricing: {
    weekdays: {
      morning: { base: 100, extra: 50 },
      afternoon: { base: 120, extra: 60 },
      night: { base: 80, extra: 40 },
      min_hours: 2,
    },
    weekends: {
      morning: { base: 150, extra: 75 },
      afternoon: { base: 180, extra: 90 },
      night: { base: 120, extra: 60 },
      min_hours: 3,
    },
    assembly: { allowed: true, half_price: 200, full_price: 400 },
  },
}

describe("getPriceForTimeSlot", () => {
  it("retorna 0 se room sem pricing", () => {
    const room = { ...mockRoom, pricing: undefined }
    expect(getPriceForTimeSlot(room, new Date(2026, 3, 27), "08:00", "12:00")).toBe(0)
  })

  it("retorna 0 se end <= start", () => {
    expect(getPriceForTimeSlot(mockRoom, new Date(2026, 3, 27), "12:00", "08:00")).toBe(0)
  })

  it("calcula preço turno manhã dia útil (08:00-10:00 = 2h × R$100)", () => {
    const weekday = new Date(2026, 3, 27) // segunda
    const price = getPriceForTimeSlot(mockRoom, weekday, "08:00", "10:00")
    expect(price).toBe(200)
  })

  it("calcula preço turno tarde dia útil (13:00-15:00 = 2h × R$120)", () => {
    const weekday = new Date(2026, 3, 27)
    const price = getPriceForTimeSlot(mockRoom, weekday, "13:00", "15:00")
    expect(price).toBe(240)
  })

  it("calcula preço cross-shift manhã→tarde (10:00-14:00)", () => {
    const weekday = new Date(2026, 3, 27)
    const price = getPriceForTimeSlot(mockRoom, weekday, "10:00", "14:00")
    // 10:00-12:00 = 2h manhã (dentro da franquia) = 2×100 = 200
    // 12:00-14:00 = 2h tarde (extra, pois já usou 2h da franquia) = 2×60 = 120
    expect(price).toBe(320)
  })

  it("aplica franquia mínima se reservou menos que min_hours", () => {
    const weekday = new Date(2026, 3, 27)
    // 1h reservada, mas min_hours=2 → cobra 2h
    const price = getPriceForTimeSlot(mockRoom, weekday, "08:00", "09:00")
    // 1h × R$100 = R$100, mas min=2h → avgBase=100, total = 100×2 = 200
    expect(price).toBe(200)
  })

  it("usa pricing de fim de semana no sábado", () => {
    const saturday = new Date(2026, 4, 2) // sábado
    const price = getPriceForTimeSlot(mockRoom, saturday, "08:00", "10:00")
    // 2h manhã weekend = 2×150 = 300, mas min_hours=3 → avgBase=150, total=150×3=450
    expect(price).toBe(450)
  })

  it("usa pricing de fim de semana no domingo", () => {
    const sunday = new Date(2026, 4, 3) // domingo
    const price = getPriceForTimeSlot(mockRoom, sunday, "13:00", "16:00")
    // 3h tarde weekend = 3×180 = 540 (=min_hours, sem extra)
    expect(price).toBe(540)
  })
})

// ─── calculateRoomPrice ──────────────────────────────────────────────

describe("calculateRoomPrice", () => {
  it("retorna zeros se data undefined", () => {
    const result = calculateRoomPrice(mockRoom, undefined, "08:00", "12:00")
    expect(result.basePrice).toBe(0)
    expect(result.finalPrice).toBe(0)
  })

  it("retorna zeros se horários vazios", () => {
    const result = calculateRoomPrice(mockRoom, new Date(2026, 3, 27), "", "")
    expect(result.basePrice).toBe(0)
  })

  it("calcula sem desconto associado", () => {
    const result = calculateRoomPrice(mockRoom, new Date(2026, 3, 27), "08:00", "10:00", 0)
    expect(result.basePrice).toBe(200)
    expect(result.discountPercent).toBe(0)
    expect(result.discount).toBe(0)
    expect(result.finalPrice).toBe(200)
  })

  it("aplica tier 1 (≤12 meses → 10%)", () => {
    const result = calculateRoomPrice(mockRoom, new Date(2026, 3, 27), "08:00", "10:00", 6)
    expect(result.discountPercent).toBe(10)
    expect(result.discount).toBe(20)
    expect(result.finalPrice).toBe(180)
  })

  it("aplica tier 2 (13-24 meses → 20%)", () => {
    const result = calculateRoomPrice(mockRoom, new Date(2026, 3, 27), "08:00", "10:00", 18)
    expect(result.discountPercent).toBe(20)
    expect(result.discount).toBe(40)
    expect(result.finalPrice).toBe(160)
  })

  it("aplica tier 3 (>24 meses → 30%)", () => {
    const result = calculateRoomPrice(mockRoom, new Date(2026, 3, 27), "08:00", "10:00", 36)
    expect(result.discountPercent).toBe(30)
    expect(result.discount).toBe(60)
    expect(result.finalPrice).toBe(140)
  })

  it("respeita settings customizados de desconto", () => {
    const custom = { ...DEFAULT_SETTINGS, discount_tier1_pct: 15 }
    const result = calculateRoomPrice(mockRoom, new Date(2026, 3, 27), "08:00", "10:00", 6, undefined, custom)
    expect(result.discountPercent).toBe(15)
    expect(result.discount).toBe(30)
    expect(result.finalPrice).toBe(170)
  })
})

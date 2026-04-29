import { describe, it, expect } from "vitest"
import {
  formatCurrency,
  generateAgendaSlots,
  calculateBookingPrice,
} from "./utils"

// ─── formatCurrency ──────────────────────────────────────────────────

describe("formatCurrency", () => {
  const normalize = (s: string) => s.replace(/ /g, " ")

  it("formata zero como R$ 0,00", () => {
    expect(normalize(formatCurrency(0))).toBe("R$ 0,00")
  })

  it("formata valor inteiro", () => {
    expect(normalize(formatCurrency(1500))).toBe("R$ 1.500,00")
  })

  it("formata valor com centavos", () => {
    expect(normalize(formatCurrency(49.9))).toBe("R$ 49,90")
  })

  it("formata valor negativo", () => {
    expect(normalize(formatCurrency(-120.5))).toBe("-R$ 120,50")
  })

  it("formata valor grande", () => {
    expect(normalize(formatCurrency(1234567.89))).toBe("R$ 1.234.567,89")
  })
})

// ─── generateAgendaSlots ─────────────────────────────────────────────

describe("generateAgendaSlots", () => {
  it("gera slots padrão (08:00-22:00, step 2h)", () => {
    const slots = generateAgendaSlots("08:00", "22:00")
    expect(slots).toEqual([
      "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00",
    ])
  })

  it("gera slots com step de 1h", () => {
    const slots = generateAgendaSlots("08:00", "12:00", 1)
    expect(slots).toEqual(["08:00", "09:00", "10:00", "11:00", "12:00"])
  })

  it("retorna array vazio se closeTime <= openTime", () => {
    expect(generateAgendaSlots("22:00", "08:00")).toEqual([])
  })

  it("retorna array vazio se horários iguais", () => {
    expect(generateAgendaSlots("10:00", "10:00")).toEqual([])
  })

  it("gera slot único se intervalo = step", () => {
    const slots = generateAgendaSlots("08:00", "10:00", 2)
    expect(slots).toEqual(["08:00", "10:00"])
  })

  it("retorna vazio para input inválido", () => {
    expect(generateAgendaSlots("abc", "def")).toEqual([])
  })
})

// ─── calculateBookingPrice ───────────────────────────────────────────

const mockPricing = {
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
}

describe("calculateBookingPrice", () => {
  it("retorna 0 se pricing null", () => {
    expect(calculateBookingPrice(null, "2026-04-27", "08:00", "12:00")).toBe(0)
  })

  it("retorna 0 se data vazia", () => {
    expect(calculateBookingPrice(mockPricing, "", "08:00", "12:00")).toBe(0)
  })

  it("retorna 0 se horários vazios", () => {
    expect(calculateBookingPrice(mockPricing, "2026-04-27", "", "")).toBe(0)
  })

  it("retorna 0 se endTime <= startTime", () => {
    expect(calculateBookingPrice(mockPricing, "2026-04-27", "12:00", "08:00")).toBe(0)
  })

  it("calcula manhã dia útil (08:00-10:00 = 2h × R$100 = R$200)", () => {
    // 27/04/2026 = segunda
    expect(calculateBookingPrice(mockPricing, "2026-04-27", "08:00", "10:00")).toBe(200)
  })

  it("calcula tarde dia útil (13:00-15:00 = 2h × R$120 = R$240)", () => {
    expect(calculateBookingPrice(mockPricing, "2026-04-27", "13:00", "15:00")).toBe(240)
  })

  it("calcula noite dia útil (19:00-21:00 = 2h × R$80 = R$160)", () => {
    expect(calculateBookingPrice(mockPricing, "2026-04-27", "19:00", "21:00")).toBe(160)
  })

  it("calcula cross-shift manhã→tarde (10:00-14:00)", () => {
    const price = calculateBookingPrice(mockPricing, "2026-04-27", "10:00", "14:00")
    // 10:00-12:00 = 2h manhã (franquia) = 200
    // 12:00-14:00 = 2h tarde (extra) = 2×60 = 120
    expect(price).toBe(320)
  })

  it("aplica franquia mínima se reservou menos que min_hours", () => {
    const price = calculateBookingPrice(mockPricing, "2026-04-27", "08:00", "09:00")
    // 1h reservada, min=2h → avgBase=100, total=200
    expect(price).toBe(200)
  })

  it("usa pricing de fim de semana no sábado", () => {
    // 02/05/2026 = sábado
    const price = calculateBookingPrice(mockPricing, "2026-05-02", "08:00", "11:00")
    // 3h manhã weekend = 3×150 = 450 (=min_hours)
    expect(price).toBe(450)
  })

  it("usa pricing de fim de semana no domingo", () => {
    // 03/05/2026 = domingo
    const price = calculateBookingPrice(mockPricing, "2026-05-03", "13:00", "16:00")
    // 3h tarde weekend = 3×180 = 540 (=min_hours)
    expect(price).toBe(540)
  })

  it("cobra hora extra após franquia em fim de semana", () => {
    // 02/05/2026 = sábado, min_hours=3
    const price = calculateBookingPrice(mockPricing, "2026-05-02", "08:00", "12:00")
    // 4h manhã: 3h franquia = 3×150 = 450, 1h extra = 75 → total 525
    expect(price).toBe(525)
  })
})

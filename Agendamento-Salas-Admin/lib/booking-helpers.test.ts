import { describe, it, expect } from "vitest"
import {
  generateTimeSlots,
  timeToMinutes,
  isRangeAvailable,
  maskCnpj,
  maskPhone,
  maskCep,
  type OccupiedSlot,
} from "./booking-helpers"

// ─── generateTimeSlots ───────────────────────────────────────────────

describe("generateTimeSlots", () => {
  it("gera slots padrão 08:00-22:00 com step 30min", () => {
    const slots = generateTimeSlots()
    expect(slots[0]).toBe("08:00")
    expect(slots[1]).toBe("08:30")
    expect(slots[slots.length - 1]).toBe("22:00")
    expect(slots.length).toBe(29)
  })

  it("gera slots para intervalo curto", () => {
    const slots = generateTimeSlots("10:00", "11:00")
    expect(slots).toEqual(["10:00", "10:30", "11:00"])
  })

  it("gera slot único se start === end", () => {
    const slots = generateTimeSlots("10:00", "10:00")
    expect(slots).toEqual(["10:00"])
  })

  it("retorna vazio se end < start", () => {
    const slots = generateTimeSlots("22:00", "08:00")
    expect(slots).toEqual([])
  })

  it("formata com zero-padding", () => {
    const slots = generateTimeSlots("08:00", "09:00")
    expect(slots).toEqual(["08:00", "08:30", "09:00"])
  })
})

// ─── timeToMinutes ───────────────────────────────────────────────────

describe("timeToMinutes", () => {
  it("converte 08:00 → 480", () => {
    expect(timeToMinutes("08:00")).toBe(480)
  })

  it("converte 12:30 → 750", () => {
    expect(timeToMinutes("12:30")).toBe(750)
  })

  it("converte 00:00 → 0", () => {
    expect(timeToMinutes("00:00")).toBe(0)
  })

  it("converte 23:59 → 1439", () => {
    expect(timeToMinutes("23:59")).toBe(1439)
  })

  it("retorna 0 para string vazia", () => {
    expect(timeToMinutes("")).toBe(0)
  })

  it("retorna 0 para input inválido", () => {
    expect(timeToMinutes("abc")).toBe(0)
  })
})

// ─── isRangeAvailable ────────────────────────────────────────────────

describe("isRangeAvailable", () => {
  const occupied: OccupiedSlot[] = [
    { date: "2026-05-01", startTime: "10:00", endTime: "12:00" },
    { date: "2026-05-01", startTime: "14:00", endTime: "16:00" },
    { date: "2026-05-02", startTime: "09:00", endTime: "11:00" },
  ]

  it("retorna true se sem conflito", () => {
    expect(isRangeAvailable("2026-05-01", "08:00", "10:00", occupied, 0)).toBe(true)
  })

  it("retorna false se sobrepõe slot existente", () => {
    expect(isRangeAvailable("2026-05-01", "09:00", "11:00", occupied, 0)).toBe(false)
  })

  it("retorna false se dentro de slot existente", () => {
    expect(isRangeAvailable("2026-05-01", "10:30", "11:30", occupied, 0)).toBe(false)
  })

  it("retorna true se data diferente", () => {
    expect(isRangeAvailable("2026-05-03", "10:00", "12:00", occupied, 0)).toBe(true)
  })

  it("retorna true se adjacente sem buffer", () => {
    expect(isRangeAvailable("2026-05-01", "12:00", "14:00", occupied, 0)).toBe(true)
  })

  it("retorna false se adjacente com buffer", () => {
    // slot 10:00-12:00 + buffer 30min → efetivo até 12:30
    // novo 12:00-14:00 + buffer 30min → efetivo 12:00-14:30
    // 12:00 < 12:30 → conflito
    expect(isRangeAvailable("2026-05-01", "12:00", "14:00", occupied, 30)).toBe(false)
  })

  it("retorna true se respeita buffer", () => {
    expect(isRangeAvailable("2026-05-01", "12:30", "13:30", occupied, 30)).toBe(true)
  })

  it("retorna true se lista vazia", () => {
    expect(isRangeAvailable("2026-05-01", "08:00", "12:00", [], 0)).toBe(true)
  })

  it("retorna true se parâmetros vazios", () => {
    expect(isRangeAvailable("", "08:00", "12:00", occupied, 0)).toBe(true)
    expect(isRangeAvailable("2026-05-01", "", "12:00", occupied, 0)).toBe(true)
  })

  it("retorna false se start >= end (inválido)", () => {
    expect(isRangeAvailable("2026-05-01", "12:00", "08:00", occupied, 0)).toBe(false)
  })
})

// ─── maskCnpj ────────────────────────────────────────────────────────

describe("maskCnpj", () => {
  it("formata CNPJ completo", () => {
    expect(maskCnpj("11222333000181")).toBe("11.222.333/0001-81")
  })

  it("formata parcial (5 dígitos)", () => {
    expect(maskCnpj("11222")).toBe("11.222")
  })

  it("formata parcial (8 dígitos)", () => {
    expect(maskCnpj("11222333")).toBe("11.222.333")
  })

  it("formata parcial (12 dígitos)", () => {
    expect(maskCnpj("112223330001")).toBe("11.222.333/0001")
  })

  it("remove caracteres não numéricos", () => {
    expect(maskCnpj("11.222.333/0001-81")).toBe("11.222.333/0001-81")
  })

  it("limita a 14 dígitos", () => {
    expect(maskCnpj("112223330001819999")).toBe("11.222.333/0001-81")
  })

  it("retorna vazio para vazio", () => {
    expect(maskCnpj("")).toBe("")
  })
})

// ─── maskPhone ───────────────────────────────────────────────────────

describe("maskPhone", () => {
  it("formata telefone completo (11 dígitos)", () => {
    expect(maskPhone("19999887766")).toBe("(19) 99988-7766")
  })

  it("formata parcial (2 dígitos = DDD)", () => {
    expect(maskPhone("19")).toBe("(19")
  })

  it("formata parcial (7 dígitos)", () => {
    expect(maskPhone("1999988")).toBe("(19) 99988")
  })

  it("remove caracteres não numéricos", () => {
    expect(maskPhone("(19) 99988-7766")).toBe("(19) 99988-7766")
  })

  it("limita a 11 dígitos", () => {
    expect(maskPhone("199998877661234")).toBe("(19) 99988-7766")
  })

  it("retorna vazio para vazio", () => {
    expect(maskPhone("")).toBe("")
  })
})

// ─── maskCep ─────────────────────────────────────────────────────────

describe("maskCep", () => {
  it("formata CEP completo", () => {
    expect(maskCep("13400000")).toBe("13400-000")
  })

  it("formata parcial (5 dígitos)", () => {
    expect(maskCep("13400")).toBe("13400")
  })

  it("formata parcial (6 dígitos)", () => {
    expect(maskCep("134000")).toBe("13400-0")
  })

  it("remove caracteres não numéricos", () => {
    expect(maskCep("13400-000")).toBe("13400-000")
  })

  it("limita a 8 dígitos", () => {
    expect(maskCep("1340000099")).toBe("13400-000")
  })

  it("retorna vazio para vazio", () => {
    expect(maskCep("")).toBe("")
  })
})

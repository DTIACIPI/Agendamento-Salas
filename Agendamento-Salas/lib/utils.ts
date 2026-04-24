import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Room } from '@/components/room-list'

export const API_BASE_URL = 'https://acipiapi.eastus.cloudapp.azure.com'

export interface SystemSettings {
  open_time: string
  close_time: string
  block_sundays: boolean
  discount_tier1_pct: number
  discount_tier2_pct: number
  discount_tier3_pct: number
}

export const DEFAULT_SETTINGS: SystemSettings = {
  open_time: "08:00",
  close_time: "22:00",
  block_sundays: true,
  discount_tier1_pct: 10,
  discount_tier2_pct: 20,
  discount_tier3_pct: 30,
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

/**
 * Avança N dias úteis (seg-sex) a partir de uma data.
 */
export function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from)
  result.setHours(0, 0, 0, 0)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const dow = result.getDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return result
}

export function formatDateToISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function calculateDurationHours(start: string, end: string): number {
  if (!start || !end) return 0
  const sh = parseInt(start.substring(0, 2), 10)
  const sm = parseInt(start.substring(3, 5), 10)
  const eh = parseInt(end.substring(0, 2), 10)
  const em = parseInt(end.substring(3, 5), 10)
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60
}

// ─── Shift-based pricing helpers ───────────────────────────────────

// Boundaries: Morning 06-12, Afternoon 12-18, Night 18-24
type ShiftName = 'morning' | 'afternoon' | 'night'

const SHIFT_BOUNDARIES: Record<ShiftName, { start: number; end: number }> = {
  morning:   { start: 6,  end: 12 },
  afternoon: { start: 12, end: 18 },
  night:     { start: 18, end: 24 },
}

function getShiftForHour(hour: number): ShiftName {
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'night'
}

/**
 * Estima o preço local para um slot de tempo usando pricing por turnos.
 * `base` = valor POR HORA do turno.
 * `extra` = valor por hora extra além da franquia (se 0, usa base).
 * `min_hours` = franquia mínima de horas cobradas.
 *
 * Lógica:
 *  1. Primeiras min_hours horas → cobradas a `base` por hora.
 *  2. Horas além da franquia → cobradas a `extra` (ou `base` se extra=0).
 *  3. Se reservou menos que min_hours → cobra base × min_hours.
 *
 * Nota: A precificação real vem da API POST /api/pricing/calculate.
 * Esta função serve apenas como estimativa visual na tela de calendário.
 */
export function getPriceForTimeSlot(
  room: Room,
  date: Date,
  startTime: string,
  endTime: string
): number {
  if (!room.pricing) return 0

  const isWeekend = date.getDay() === 0 || date.getDay() === 6
  const dayPricing = isWeekend ? room.pricing.weekends : room.pricing.weekdays
  if (!dayPricing) return 0

  const sh = parseInt(startTime.substring(0, 2), 10)
  const sm = parseInt(startTime.substring(3, 5), 10)
  const eh = parseInt(endTime.substring(0, 2), 10)
  const em = parseInt(endTime.substring(3, 5), 10)

  const startMinutes = sh * 60 + sm
  const endMinutes = eh * 60 + em
  if (endMinutes <= startMinutes) return 0

  const bookedHours = (endMinutes - startMinutes) / 60
  const minHours = dayPricing.min_hours || 0

  // Percorre o intervalo acumulando horas e preço por turno
  let totalPrice = 0
  let accumulatedHours = 0
  let currentMinutes = startMinutes

  while (currentMinutes < endMinutes) {
    const currentHour = Math.floor(currentMinutes / 60)
    const shift = getShiftForHour(currentHour)
    const shiftPricing = dayPricing[shift]
    if (!shiftPricing) {
      currentMinutes += 30
      continue
    }

    const shiftEndMinutes = SHIFT_BOUNDARIES[shift].end * 60
    const nextBoundary = Math.min(endMinutes, shiftEndMinutes)
    const hoursInSegment = (nextBoundary - currentMinutes) / 60

    // Para cada segmento, determina quanto está na franquia e quanto é extra
    const baseRate = shiftPricing.base
    const extraRate = shiftPricing.extra > 0 ? shiftPricing.extra : baseRate

    const hoursStillInFranchise = Math.max(0, minHours - accumulatedHours)
    const franchiseHours = Math.min(hoursInSegment, hoursStillInFranchise)
    const extraHours = hoursInSegment - franchiseHours

    totalPrice += franchiseHours * baseRate + extraHours * extraRate
    accumulatedHours += hoursInSegment
    currentMinutes = nextBoundary
  }

  // Se reservou menos que a franquia, cobra o mínimo
  if (bookedHours < minHours && bookedHours > 0) {
    const avgBaseRate = totalPrice / bookedHours
    totalPrice = avgBaseRate * minHours
  }

  return totalPrice
}

export function calculateRoomPrice(
  room: Room,
  date: Date | undefined,
  startTime: string,
  endTime: string,
  associadoMonths: number = 0,
  range?: { from?: Date; to?: Date },
  settings: SystemSettings = DEFAULT_SETTINGS
): {
  basePrice: number
  discountPercent: number
  discount: number
  finalPrice: number
  appliedMinimumHours: number
} {
  if (!date || !startTime || !endTime || !room.pricing) {
    return {
      basePrice: 0,
      discountPercent: 0,
      discount: 0,
      finalPrice: 0,
      appliedMinimumHours: 0,
    }
  }

  let basePrice = 0
  if (range && range.from && range.to) {
    const cur = new Date(range.from)
    while (cur <= range.to) {
      basePrice += getPriceForTimeSlot(room, cur, startTime, endTime)
      cur.setDate(cur.getDate() + 1)
    }
  } else {
    basePrice = getPriceForTimeSlot(room, date, startTime, endTime)
  }

  let discountPercent = 0
  if (associadoMonths > 0) {
    if (associadoMonths <= 12) {
      discountPercent = settings.discount_tier1_pct
    } else if (associadoMonths <= 24) {
      discountPercent = settings.discount_tier2_pct
    } else {
      discountPercent = settings.discount_tier3_pct
    }
  }

  const discount = basePrice * (discountPercent / 100)
  const finalPrice = basePrice - discount

  return {
    basePrice,
    discountPercent,
    discount,
    finalPrice,
    appliedMinimumHours: 0,
  }
}

export function isValidCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]+/g, '');
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  const digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;

  return true;
}

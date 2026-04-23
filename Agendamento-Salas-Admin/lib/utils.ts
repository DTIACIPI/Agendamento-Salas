import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { SystemSettings } from "./types"

export const API_BASE_URL = "https://acipiapi.eastus.cloudapp.azure.com"

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

export function generateAgendaSlots(openTime: string, closeTime: string, stepHours = 2): string[] {
  const start = parseInt(openTime.substring(0, 2), 10)
  const end = parseInt(closeTime.substring(0, 2), 10)
  if (isNaN(start) || isNaN(end) || end <= start) return []
  const slots: string[] = []
  for (let h = start; h <= end; h += stepHours) {
    slots.push(`${String(h).padStart(2, "0")}:00`)
  }
  return slots
}

// ─── Pricing helpers (espelhado do Locatário) ─────────────────────

type ShiftName = "morning" | "afternoon" | "night"

const SHIFT_BOUNDARIES: Record<ShiftName, { start: number; end: number }> = {
  morning:   { start: 6,  end: 12 },
  afternoon: { start: 12, end: 18 },
  night:     { start: 18, end: 24 },
}

function getShiftForHour(hour: number): ShiftName {
  if (hour < 12) return "morning"
  if (hour < 18) return "afternoon"
  return "night"
}

interface RoomPricing {
  weekdays?: {
    min_hours?: number
    morning?: { base: number; extra: number }
    afternoon?: { base: number; extra: number }
    night?: { base: number; extra: number }
  }
  weekends?: {
    min_hours?: number
    morning?: { base: number; extra: number }
    afternoon?: { base: number; extra: number }
    night?: { base: number; extra: number }
  }
}

export function calculateBookingPrice(
  pricing: RoomPricing | null | undefined,
  dateStr: string,
  startTime: string,
  endTime: string,
): number {
  if (!pricing || !dateStr || !startTime || !endTime) return 0

  const date = new Date(dateStr + "T12:00:00")
  const isWeekend = date.getDay() === 0 || date.getDay() === 6
  const dayPricing = isWeekend ? pricing.weekends : pricing.weekdays
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

    const baseRate = shiftPricing.base
    const extraRate = shiftPricing.extra > 0 ? shiftPricing.extra : baseRate

    const hoursStillInFranchise = Math.max(0, minHours - accumulatedHours)
    const franchiseHours = Math.min(hoursInSegment, hoursStillInFranchise)
    const extraHours = hoursInSegment - franchiseHours

    totalPrice += franchiseHours * baseRate + extraHours * extraRate
    accumulatedHours += hoursInSegment
    currentMinutes = nextBoundary
  }

  if (bookedHours < minHours && bookedHours > 0) {
    const avgBaseRate = totalPrice / bookedHours
    totalPrice = avgBaseRate * minHours
  }

  return totalPrice
}

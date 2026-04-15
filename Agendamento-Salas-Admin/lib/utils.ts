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

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Room } from '@/components/room-list'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateDurationHours(start: string, end: string): number {
  if (!start || !end) return 0
  const sh = parseInt(start.substring(0, 2), 10)
  const sm = parseInt(start.substring(3, 5), 10)
  const eh = parseInt(end.substring(0, 2), 10)
  const em = parseInt(end.substring(3, 5), 10)
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60
}

export function getPriceForTimeSlot(
  room: Room,
  date: Date,
  startTime: string,
  endTime: string
): number {
  const isSaturday = date.getDay() === 6
  const periods = (isSaturday ? room.pricePeriodsSaturday : room.pricePeriodsWeekday) || []

  if (periods.length === 0) return 0

  const sh = parseInt(startTime.substring(0, 2), 10)
  const sm = parseInt(startTime.substring(3, 5), 10)
  const eh = parseInt(endTime.substring(0, 2), 10)
  const em = parseInt(endTime.substring(3, 5), 10)

  const startMinutes = sh * 60 + sm
  const endMinutes = eh * 60 + em

  let totalPrice = 0
  let currentMinutes = startMinutes

  while (currentMinutes < endMinutes) {
    const currentHour = Math.floor(currentMinutes / 60)
    
    // Find which period this hour belongs to
    const period = periods.find(
      (p) => p.startHour <= currentHour && currentHour < p.endHour
    )

    if (!period) {
      // Se não houver período configurado (ex: soma das horas mínimas ultrapassa o expediente)
      // utilizamos o preço do primeiro período disponível no dia como fallback base.
      const fallbackPrice = periods.length > 0 ? periods[0].price : 0
      const nextBoundaryMinutes = Math.min(endMinutes, (currentHour + 1) * 60)
      const minutesInThisPeriod = nextBoundaryMinutes - currentMinutes
      totalPrice += (minutesInThisPeriod / 60) * fallbackPrice
      currentMinutes = nextBoundaryMinutes
      continue
    }

    // Calculate how many minutes we can use in this period
    const nextBoundaryMinutes = Math.min(
      endMinutes,
      (period.endHour) * 60
    )

    const minutesInThisPeriod = nextBoundaryMinutes - currentMinutes
    const hoursInThisPeriod = minutesInThisPeriod / 60

    totalPrice += hoursInThisPeriod * period.price

    currentMinutes = nextBoundaryMinutes
  }

  return totalPrice
}

export function calculateRoomPrice(
  room: Room,
  date: Date | undefined,
  startTime: string,
  endTime: string,
  associadoMonths: number = 0,
  range?: { from?: Date; to?: Date }
): {
  basePrice: number
  discountPercent: number
  discount: number
  finalPrice: number
  appliedMinimumHours: number
} {
  if (!date || !startTime || !endTime) {
    return {
      basePrice: 0,
      discountPercent: 0,
      discount: 0,
      finalPrice: 0,
      appliedMinimumHours: 0,
    }
  }

  // helper for single day
  function priceForDay(d: Date) {
    const sh = parseInt(startTime.substring(0, 2), 10)
    const sm = parseInt(startTime.substring(3, 5), 10)
    const eh = parseInt(endTime.substring(0, 2), 10)
    const em = parseInt(endTime.substring(3, 5), 10)

    const bookedMinutes = (eh * 60 + em) - (sh * 60 + sm)
    const bookedHours = bookedMinutes / 60

    const isSaturday = d.getDay() === 6
    const minHours = (isSaturday ? room.minHoursSaturday : room.minHoursWeekday) || 0

    if (bookedHours <= 0) return 0

    const actualPrice = getPriceForTimeSlot(room, d, startTime, endTime)

    if (bookedHours < minHours) {
      const hourlyRate = actualPrice / bookedHours
      return hourlyRate * minHours
    }

    return actualPrice
  }

  let basePrice = 0
  if (range && range.from && range.to) {
    const cur = new Date(range.from)
    while (cur <= range.to) {
      basePrice += priceForDay(cur)
      cur.setDate(cur.getDate() + 1)
    }
  } else {
    basePrice = priceForDay(date)
  }

  let discountPercent = 0
  if (associadoMonths > 0) {
    if (associadoMonths <= 12) {
      discountPercent = 10
    } else if (associadoMonths <= 24) {
      discountPercent = 20
    } else {
      discountPercent = 30
    }
  }

  const discount = basePrice * (discountPercent / 100)
  const finalPrice = basePrice - discount

  const appliedMinimumHours = 0

  return {
    basePrice,
    discountPercent,
    discount,
    finalPrice,
    appliedMinimumHours,
  }
}

export function isValidCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]+/g, '');
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false; // Verifica sequências como 00000000000000

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

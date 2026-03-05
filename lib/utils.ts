import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Room } from '@/components/room-list'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateDurationHours(start: string, end: string): number {
  if (!start || !end) return 0
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60
}

export function getPriceForTimeSlot(
  room: Room,
  date: Date,
  startTime: string,
  endTime: string
): number {
  const isSaturday = date.getDay() === 6
  const periods = isSaturday ? room.pricePeroidsSaturday : room.pricePeriodsWeekday

  if (periods.length === 0) return 0

  const [sh, sm] = startTime.split(":").map(Number)
  const [eh, em] = endTime.split(":").map(Number)

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
      // No period covers this hour - shouldn't happen if configured correctly
      return 0
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
  associadoMonths: number = 0
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

  const [sh, sm] = startTime.split(":").map(Number)
  const [eh, em] = endTime.split(":").map(Number)

  const bookedMinutes = (eh * 60 + em) - (sh * 60 + sm)
  const bookedHours = bookedMinutes / 60

  // Determine minimum hours based on day of week
  const isSaturday = date.getDay() === 6
  const minHours = isSaturday ? room.minHoursSaturday : room.minHoursWeekday

  // Apply minimum hours if necessary
  let appliedMinimumHours = 0
  let finalBookedMinutes = bookedMinutes
  
  if (bookedHours < minHours) {
    appliedMinimumHours = minHours
    finalBookedMinutes = minHours * 60
  }

  // Calculate end time considering minimum
  const finalEndMinutes = sh * 60 + sm + finalBookedMinutes
  const finalEndHour = Math.floor(finalEndMinutes / 60)
  const finalEndMin = finalEndMinutes % 60

  const finalEndTime = `${String(finalEndHour).padStart(2, "0")}:${String(finalEndMin).padStart(2, "0")}`

  // Calculate base price for the booked/minimum hours
  const basePrice = getPriceForTimeSlot(room, date, startTime, finalEndTime)

  // Calculate discount based on associado months
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

  return {
    basePrice,
    discountPercent,
    discount,
    finalPrice,
    appliedMinimumHours,
  }
}

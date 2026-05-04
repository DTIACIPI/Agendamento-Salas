import type { OccupiedSlot } from "@/app/page"
import { formatDateToISO } from "@/lib/utils"

export function generateTimeOptions(openTime = "08:00", closeTime = "22:00"): string[] {
  const times: string[] = []
  const startHour = parseInt(openTime.substring(0, 2), 10)
  const endHour = parseInt(closeTime.substring(0, 2), 10)
  for (let h = startHour; h <= endHour; h++) {
    times.push(`${String(h).padStart(2, "0")}:00`)
    if (h < endHour) {
      times.push(`${String(h).padStart(2, "0")}:30`)
    }
  }
  return times
}

export const TIME_OPTIONS = generateTimeOptions()

const timeToMinutes = (time: string): number => {
  if (!time) return 0;
  const hours = parseInt(time.substring(0, 2), 10);
  const minutes = parseInt(time.substring(3, 5), 10);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return (hours * 60) + minutes;
};

export function isSlotOccupied(
  date: Date,
  time: string,
  occupiedSlots: OccupiedSlot[],
  cleaningBuffer: number = 0
): boolean {
  if (!date || !time) return false;
  const dateKey = formatDateToISO(date);
  const timeInMinutes = timeToMinutes(time);
  for (const slot of occupiedSlots) {
    if (slot.date === dateKey) {
      const startInMinutes = timeToMinutes(slot.startTime);
      const endInMinutes = timeToMinutes(slot.endTime) + cleaningBuffer;
      if (timeInMinutes >= startInMinutes && timeInMinutes < endInMinutes) {
        return true;
      }
    }
  }
  return false;
}

export function isRangeAvailable(
  date: Date,
  start: string,
  end: string,
  occupiedSlots: OccupiedSlot[],
  timeOptions: string[] = TIME_OPTIONS,
  cleaningBuffer: number = 0
): boolean {
  const startIdx = timeOptions.indexOf(start);
  const endIdx = timeOptions.indexOf(end);
  if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) return false;
  const dateKey = formatDateToISO(date);
  const rangeStart = timeToMinutes(start);
  const rangeEnd = timeToMinutes(end) + cleaningBuffer;
  for (const slot of occupiedSlots) {
    if (slot.date === dateKey) {
      const slotStart = timeToMinutes(slot.startTime);
      const slotEnd = timeToMinutes(slot.endTime) + cleaningBuffer;
      if (rangeStart < slotEnd && rangeEnd > slotStart) {
        return false;
      }
    }
  }
  return true;
}

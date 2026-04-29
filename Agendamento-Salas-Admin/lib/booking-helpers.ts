export function generateTimeSlots(start = "08:00", end = "22:00"): string[] {
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  const slots: string[] = []
  let mins = sh * 60 + sm
  const endMins = eh * 60 + em
  while (mins <= endMins) {
    slots.push(`${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`)
    mins += 30
  }
  return slots
}

export function timeToMinutes(time: string): number {
  if (!time) return 0
  const h = parseInt(time.substring(0, 2), 10)
  const m = parseInt(time.substring(3, 5), 10)
  if (isNaN(h) || isNaN(m)) return 0
  return h * 60 + m
}

export interface OccupiedSlot {
  date: string
  startTime: string
  endTime: string
}

export function isRangeAvailable(
  dateStr: string,
  start: string,
  end: string,
  slots: OccupiedSlot[],
  buffer: number,
): boolean {
  if (!dateStr || !start || !end) return true
  const rStart = timeToMinutes(start)
  const rEnd = timeToMinutes(end) + buffer
  if (rStart >= rEnd) return false
  for (const s of slots) {
    if (s.date === dateStr) {
      const sStart = timeToMinutes(s.startTime)
      const sEnd = timeToMinutes(s.endTime) + buffer
      if (rStart < sEnd && rEnd > sStart) return false
    }
  }
  return true
}

export function maskCnpj(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return d.replace(/^(\d{2})(\d{0,3})/, "$1.$2")
  if (d.length <= 8) return d.replace(/^(\d{2})(\d{3})(\d{0,3})/, "$1.$2.$3")
  if (d.length <= 12) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, "$1.$2.$3/$4")
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, "$1.$2.$3/$4-$5")
}

export function maskPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11)
  if (d.length === 0) return ""
  if (d.length <= 2) return d.replace(/^(\d{0,2})/, "($1")
  if (d.length <= 7) return d.replace(/^(\d{2})(\d{0,5})/, "($1) $2")
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3")
}

export function maskCep(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8)
  if (d.length <= 5) return d
  return d.replace(/^(\d{5})(\d{0,3})/, "$1-$2")
}

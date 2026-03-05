"use client"

import { useState, useMemo } from "react"
import { ptBR } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { Clock, Users, Wifi, Monitor } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Room } from "@/components/room-list"

// Generate 30-minute interval time options from 07:00 to 22:00
function generateTimeOptions(): string[] {
  const times: string[] = []
  for (let h = 7; h <= 22; h++) {
    times.push(`${String(h).padStart(2, "0")}:00`)
    if (h < 22) {
      times.push(`${String(h).padStart(2, "0")}:30`)
    }
  }
  return times
}

const TIME_OPTIONS = generateTimeOptions()

// Hourly slots for timeline (8:00 - 22:00)
const TIMELINE_HOURS = Array.from({ length: 15 }, (_, i) => i + 8)

// Simulated unavailable dates (weekends for demo)
const UNAVAILABLE_DATES = [
  new Date(2026, 2, 1),
  new Date(2026, 2, 7),
  new Date(2026, 2, 8),
  new Date(2026, 2, 14),
  new Date(2026, 2, 15),
  new Date(2026, 2, 21),
  new Date(2026, 2, 22),
]

// Simulated occupied time ranges per room per date key ("YYYY-MM-DD")
export const OCCUPIED_SLOTS: Record<string, Record<string, string[]>> = {
  sala: {
    "2026-03-02": ["08:00", "08:30", "09:00", "09:30"],
    "2026-03-03": ["14:00", "14:30", "15:00", "15:30", "16:00"],
    "2026-03-04": ["10:00", "10:30", "11:00"],
  },
  auditorio: {
    "2026-03-02": ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"],
    "2026-03-03": ["08:00", "08:30", "09:00", "09:30"],
    "2026-03-05": ["13:00", "13:30", "14:00", "14:30"],
  },
  "auditorio-foyer": {
    "2026-03-02": ["13:00", "13:30", "14:00", "14:30", "15:00"],
    "2026-03-04": ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30"],
  },
  foyer: {},
  miniauditorio: {},
  "regional-sta-terezinha": {},
}

export { UNAVAILABLE_DATES }

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function isSlotOccupied(roomId: string, date: Date, time: string): boolean {
  const key = getDateKey(date)
  return OCCUPIED_SLOTS[roomId]?.[key]?.includes(time) ?? false
}

export function isRangeAvailable(roomId: string, date: Date, start: string, end: string): boolean {
  const startIdx = TIME_OPTIONS.indexOf(start)
  const endIdx = TIME_OPTIONS.indexOf(end)
  if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) return false
  for (let i = startIdx; i < endIdx; i++) {
    if (isSlotOccupied(roomId, date, TIME_OPTIONS[i])) return false
  }
  return true
}

function getEndTimeOptions(startTime: string): string[] {
  const startIdx = TIME_OPTIONS.indexOf(startTime)
  if (startIdx === -1) return []
  return TIME_OPTIONS.slice(startIdx + 1)
}

function hasConflict(roomId: string, date: Date, start: string, end: string): string[] {
  const startIdx = TIME_OPTIONS.indexOf(start)
  const endIdx = TIME_OPTIONS.indexOf(end)
  if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) return []
  const conflicting: string[] = []
  for (let i = startIdx; i < endIdx; i++) {
    if (isSlotOccupied(roomId, date, TIME_OPTIONS[i])) {
      conflicting.push(TIME_OPTIONS[i])
    }
  }
  return conflicting
}

type SlotStatus = "available" | "occupied" | "selected" | "past"

function getHourSlotStatus(
  roomId: string,
  date: Date,
  hour: number,
  startTime: string,
  endTime: string
): SlotStatus {
  const time1 = `${String(hour).padStart(2, "0")}:00`
  const time2 = `${String(hour).padStart(2, "0")}:30`

  // Check if this hour is within the selected range
  if (startTime && endTime) {
    const [sh] = startTime.split(":").map(Number)
    const [eh] = endTime.split(":").map(Number)
    const startMinutes = parseInt(startTime.split(":")[0]) * 60 + parseInt(startTime.split(":")[1])
    const endMinutes = parseInt(endTime.split(":")[0]) * 60 + parseInt(endTime.split(":")[1])
    const slotStartMinutes = hour * 60
    const slotEndMinutes = hour * 60 + 59

    if (slotStartMinutes >= startMinutes && slotStartMinutes < endMinutes) {
      return "selected"
    }
  }

  // Check if any 30-min slot in this hour is occupied
  const key = getDateKey(date)
  const occupied = OCCUPIED_SLOTS[roomId]?.[key] || []
  if (occupied.includes(time1) || occupied.includes(time2)) {
    return "occupied"
  }

  return "available"
}

interface BookingCalendarProps {
  room: Room
  selectedDate: Date | undefined
  onSelectDate: (date: Date | undefined) => void
  startTime: string
  endTime: string
  onStartTimeChange: (time: string) => void
  onEndTimeChange: (time: string) => void
}

export function BookingCalendar({
  room,
  selectedDate,
  onSelectDate,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
}: BookingCalendarProps) {
  const endOptions = startTime ? getEndTimeOptions(startTime) : []
  const conflicts =
    selectedDate && startTime && endTime
      ? hasConflict(room.id, selectedDate, startTime, endTime)
      : []

  // Get the current month name in Portuguese
  const currentMonthLabel = selectedDate
    ? selectedDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })

  // Timeline slot statuses
  const timelineSlots = useMemo(() => {
    if (!selectedDate) return []
    return TIMELINE_HOURS.map((hour) => ({
      hour,
      label: `${String(hour).padStart(2, "0")}:00`,
      status: getHourSlotStatus(room.id, selectedDate, hour, startTime, endTime),
    }))
  }, [room.id, selectedDate, startTime, endTime])

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold italic text-foreground">
          {"Sele\u00e7\u00e3o de Sala e Data"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {"Local: "}{room.name}{" \u2013 Disponibilidade para "}{currentMonthLabel.charAt(0).toUpperCase() + currentMonthLabel.slice(1)}
        </p>
      </div>

      {/* Two side-by-side calendars */}
      <div className="rounded-xl border bg-card p-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onSelectDate}
          locale={ptBR}
          numberOfMonths={2}
          disabled={[{ before: new Date() }, ...UNAVAILABLE_DATES]}
          className="mx-auto"
        />
      </div>

      {/* Room info bar + Timeline */}
      {selectedDate && (
        <div className="flex flex-col gap-3">
          {/* Info bar with icons */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="size-4" />
              <span className="font-medium text-foreground">{"Hor\u00e1rio"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="size-4" />
              <span>{"Capacidade: "}{room.capacity}</span>
            </div>
            {room.amenities.includes("Wi-Fi") || room.amenities.includes("Ar-condicionado") ? (
              <div className="flex items-center gap-1.5">
                <Wifi className="size-4" />
              </div>
            ) : null}
            {room.amenities.includes("Projetor") ? (
              <div className="flex items-center gap-1.5">
                <Monitor className="size-4" />
              </div>
            ) : null}
          </div>

          {/* Timeline visualization */}
          <div className="rounded-xl border bg-card p-4">
            {/* Top hour labels */}
            <div className="flex items-end gap-0">
              {timelineSlots.map((slot) => (
                <div
                  key={`label-top-${slot.hour}`}
                  className="flex-1 text-center"
                >
                  <span
                    className={cn(
                      "text-[10px] leading-none lg:text-xs",
                      slot.status === "selected"
                        ? "font-semibold text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {slot.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Timeline bars */}
            <div className="mt-2 flex gap-0.5">
              {timelineSlots.map((slot) => (
                <button
                  key={`bar-${slot.hour}`}
                  type="button"
                  onClick={() => {
                    if (slot.status !== "occupied") {
                      const timeStr = `${String(slot.hour).padStart(2, "0")}:00`
                      if (!startTime) {
                        onStartTimeChange(timeStr)
                      } else if (!endTime) {
                        const nextHour = `${String(slot.hour + 1).padStart(2, "0")}:00`
                        if (timeStr > startTime) {
                          onEndTimeChange(nextHour <= "22:00" ? nextHour : "22:00")
                        } else {
                          onStartTimeChange(timeStr)
                        }
                      } else {
                        // Reset and start new selection
                        onStartTimeChange(timeStr)
                        onEndTimeChange("")
                      }
                    }
                  }}
                  className={cn(
                    "flex-1 h-8 rounded-sm transition-colors cursor-pointer",
                    slot.status === "available" && "bg-emerald-400 hover:bg-emerald-500",
                    slot.status === "occupied" && "bg-muted-foreground/30 cursor-not-allowed",
                    slot.status === "selected" && "bg-primary",
                    slot.status === "past" && "bg-muted"
                  )}
                  aria-label={`${slot.label} - ${slot.status === "available" ? "disponivel" : slot.status === "occupied" ? "ocupado" : slot.status === "selected" ? "selecionado" : "indisponivel"}`}
                />
              ))}
            </div>

            {/* Bottom hour labels */}
            <div className="mt-2 flex items-start gap-0">
              {timelineSlots.map((slot) => (
                <div
                  key={`label-bottom-${slot.hour}`}
                  className="flex-1 text-center"
                >
                  <span
                    className={cn(
                      "text-[10px] leading-none lg:text-xs",
                      slot.status === "selected"
                        ? "font-semibold text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {slot.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="size-3 rounded-sm bg-emerald-400" />
                <span>{"Dispon\u00edvel"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-3 rounded-sm bg-primary" />
                <span>Selecionado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-3 rounded-sm bg-muted-foreground/30" />
                <span>Ocupado</span>
              </div>
            </div>
          </div>

          {/* Conflict warning */}
          {conflicts.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              <p className="font-medium">
                {"Hor\u00e1rio parcialmente ocupado"}
              </p>
              <p className="mt-0.5 text-xs opacity-80">
                {"Os hor\u00e1rios "}
                {conflicts.join(", ")}
                {" j\u00e1 est\u00e3o ocupados. Verifique as sugest\u00f5es de salas dispon\u00edveis abaixo."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function getDurationLabel(start: string, end: string): string {
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  const totalMinutes = (eh * 60 + em) - (sh * 60 + sm)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}min`
  if (minutes === 0) return `${hours}h`
  return `${hours}h${minutes}min`
}

"use client"

import { ptBR } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { Clock, ChevronDown } from "lucide-react"
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
  "sala-reuniao": {
    "2026-03-02": ["08:00", "08:30", "09:00", "09:30"],
    "2026-03-03": ["14:00", "14:30", "15:00", "15:30", "16:00"],
    "2026-03-04": ["10:00", "10:30", "11:00"],
  },
  "auditorio": {
    "2026-03-02": ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"],
    "2026-03-03": ["08:00", "08:30", "09:00", "09:30"],
    "2026-03-05": ["13:00", "13:30", "14:00", "14:30"],
  },
  "sala-treinamento": {
    "2026-03-02": ["13:00", "13:30", "14:00", "14:30", "15:00"],
    "2026-03-04": ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30"],
  },
  "coworking": {},
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

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Selecione a data
        </h3>
        <p className="text-xs text-muted-foreground">
          {room.name} &mdash; Disponibilidade
        </p>
      </div>

      <div className="flex justify-center rounded-lg border bg-card p-2">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onSelectDate}
          locale={ptBR}
          disabled={[{ before: new Date() }, ...UNAVAILABLE_DATES]}
          className="mx-auto"
        />
      </div>

      {selectedDate && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">
              {"Hor\u00e1rio"}
            </h4>
            <span className="text-xs text-muted-foreground">
              {selectedDate.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Start Time */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="start-time"
                className="text-xs font-medium text-muted-foreground"
              >
                {"In\u00edcio"}
              </label>
              <div className="relative">
                <select
                  id="start-time"
                  value={startTime}
                  onChange={(e) => {
                    onStartTimeChange(e.target.value)
                    onEndTimeChange("")
                  }}
                  className={cn(
                    "w-full appearance-none rounded-lg border bg-card px-3 py-2.5 pr-8 text-sm font-medium text-foreground transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
                    !startTime && "text-muted-foreground"
                  )}
                >
                  <option value="">Selecionar</option>
                  {TIME_OPTIONS.slice(0, -1).map((time) => {
                    const occupied = isSlotOccupied(room.id, selectedDate, time)
                    return (
                      <option
                        key={time}
                        value={time}
                        disabled={occupied}
                      >
                        {time}
                        {occupied ? " (ocupado)" : ""}
                      </option>
                    )
                  })}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            {/* End Time */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="end-time"
                className="text-xs font-medium text-muted-foreground"
              >
                {"T\u00e9rmino"}
              </label>
              <div className="relative">
                <select
                  id="end-time"
                  value={endTime}
                  onChange={(e) => onEndTimeChange(e.target.value)}
                  disabled={!startTime}
                  className={cn(
                    "w-full appearance-none rounded-lg border bg-card px-3 py-2.5 pr-8 text-sm font-medium text-foreground transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    !endTime && "text-muted-foreground"
                  )}
                >
                  <option value="">Selecionar</option>
                  {endOptions.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Duration display */}
          {startTime && endTime && (
            <div className="rounded-lg border bg-secondary/30 px-3 py-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {"Dura\u00e7\u00e3o"}
                </span>
                <span className="font-medium text-foreground">
                  {startTime} &mdash; {endTime}
                  {" "}
                  ({getDurationLabel(startTime, endTime)})
                </span>
              </div>
            </div>
          )}

          {/* Conflict warning */}
          {conflicts.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              <p className="font-medium">
                {"Conflito de hor\u00e1rio detectado"}
              </p>
              <p className="mt-0.5 text-xs opacity-80">
                {"Os hor\u00e1rios "}
                {conflicts.join(", ")}
                {" j\u00e1 est\u00e3o ocupados nesta sala."}
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

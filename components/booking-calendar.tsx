"use client"

import { ptBR } from "date-fns/locale"
import { addMonths } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import {
  Clock,
  ChevronDown,
  Users,
  Wifi,
  Monitor,
} from "lucide-react"
import Image from "next/image"
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

// Full hours for timeline display (8:00 to 22:00)
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
    "2026-03-02": [
      "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
      "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
      "17:00", "17:30",
    ],
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

export function isSlotOccupied(
  roomId: string,
  date: Date,
  time: string
): boolean {
  const key = getDateKey(date)
  return OCCUPIED_SLOTS[roomId]?.[key]?.includes(time) ?? false
}

export function isRangeAvailable(
  roomId: string,
  date: Date,
  start: string,
  end: string
): boolean {
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

// Get slot status for timeline: "available", "occupied", "selected"
function getSlotStatus(
  roomId: string,
  date: Date,
  hour: number,
  startTime: string,
  endTime: string
): "available" | "occupied" | "selected" | "past" {
  const time = `${String(hour).padStart(2, "0")}:00`
  const timeHalf = `${String(hour).padStart(2, "0")}:30`

  // Check if occupied
  const isOcc =
    isSlotOccupied(roomId, date, time) ||
    isSlotOccupied(roomId, date, timeHalf)

  if (isOcc) return "occupied"

  // Check if within selected range
  if (startTime && endTime) {
    const [sh] = startTime.split(":").map(Number)
    const [eh] = endTime.split(":").map(Number)
    if (hour >= sh && hour < eh) return "selected"
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
  isAssociado: boolean
  onToggleAssociado: () => void
  associadoMonths: number
  onAssociadoMonthsChange: (months: number) => void
  cnpj: string
  onCnpjChange: (cnpj: string) => void
  onConfirm: () => void
  priceData: {
    basePrice: number
    discountPercent: number
    discount: number
    finalPrice: number
    appliedMinimumHours: number
  }
}

export function BookingCalendar({
  room,
  selectedDate,
  onSelectDate,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  onConfirm,
  priceData,
}: BookingCalendarProps) {
  const today = new Date()
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const nextMonth = addMonths(currentMonth, 1)

  const endOptions = startTime ? getEndTimeOptions(startTime) : []

  const canConfirm = selectedDate && startTime && endTime

  // Format the selected date for display
  const formattedDate = selectedDate
    ? selectedDate.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : ""

  // Capitalize first letter
  const capitalizedDate =
    formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)

  // Get month name for subtitle
  const currentMonthName = today.toLocaleDateString("pt-BR", { month: "long" })
  const capitalizedMonth =
    currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1)

  return (
    <div className="flex flex-col gap-0 lg:flex-row lg:gap-6">
      {/* Left side: Calendars + Timeline */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Header */}
        <div>
          <h3 className="text-lg font-bold italic text-foreground">
            {"Sele\u00e7\u00e3o de Sala e Data"}
          </h3>
          <p className="text-sm text-muted-foreground">
            Local: {room.name} - Disponibilidade para {capitalizedMonth}{" "}
            {today.getFullYear()}
          </p>
        </div>

        {/* Two side-by-side calendars */}
        <div className="rounded-lg border bg-card p-3">
          <div className="flex flex-col gap-4 md:flex-row md:gap-2">
            <div className="flex-1 flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={onSelectDate}
                locale={ptBR}
                defaultMonth={currentMonth}
                disabled={[{ before: new Date() }, ...UNAVAILABLE_DATES]}
                className="mx-auto"
              />
            </div>
            <div className="flex-1 flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={onSelectDate}
                locale={ptBR}
                defaultMonth={nextMonth}
                disabled={[{ before: new Date() }, ...UNAVAILABLE_DATES]}
                className="mx-auto"
              />
            </div>
          </div>
        </div>

        {/* Room Info Bar */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="size-4" />
            <span className="font-medium text-foreground">{"Hor\u00e1rio"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="size-4" />
            <span>Capacitas: {room.capacity}</span>
          </div>
          {room.amenities.includes("Projetor") && (
            <Wifi className="size-4" />
          )}
          {room.amenities.includes("Projetor") && (
            <Monitor className="size-4" />
          )}
        </div>

        {/* Timeline Bar */}
        {selectedDate && (
          <div className="flex flex-col gap-1 overflow-x-auto">
            {/* Top hour labels */}
            <div className="flex">
              {TIMELINE_HOURS.map((hour) => (
                <div
                  key={`top-${hour}`}
                  className={cn(
                    "min-w-[48px] flex-1 text-center text-xs",
                    startTime &&
                      endTime &&
                      hour >= parseInt(startTime) &&
                      hour < parseInt(endTime)
                      ? "font-semibold text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {`${hour}:00`}
                </div>
              ))}
            </div>

            {/* Colored blocks */}
            <div className="flex gap-0.5">
              {TIMELINE_HOURS.map((hour) => {
                const status = getSlotStatus(
                  room.id,
                  selectedDate,
                  hour,
                  startTime,
                  endTime
                )
                return (
                  <div
                    key={`block-${hour}`}
                    className={cn(
                      "min-w-[48px] flex-1 h-8 rounded-sm border",
                      status === "available" &&
                        "bg-emerald-500/70 border-emerald-600/50",
                      status === "occupied" &&
                        "bg-muted border-muted-foreground/20",
                      status === "selected" &&
                        "bg-primary border-primary/80",
                      status === "past" &&
                        "bg-muted/50 border-muted-foreground/10"
                    )}
                  />
                )
              })}
            </div>

            {/* Bottom hour labels */}
            <div className="flex">
              {TIMELINE_HOURS.map((hour) => (
                <div
                  key={`bot-${hour}`}
                  className={cn(
                    "min-w-[48px] flex-1 text-center text-xs",
                    startTime &&
                      endTime &&
                      hour >= parseInt(startTime) &&
                      hour < parseInt(endTime)
                      ? "font-semibold text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {`${hour}:00`}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right side: Room Image + Booking Summary */}
      <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-4 mt-4 lg:mt-0">
        {/* Room Image */}
        <div className="relative aspect-video w-full overflow-hidden rounded-lg">
          <Image
            src={room.image}
            alt={room.name}
            fill
            className="object-cover"
            sizes="320px"
          />
        </div>

        {/* Booking Summary */}
        <div className="flex flex-col gap-3">
          <h4 className="text-lg font-bold text-foreground">
            Resumo da Reserva
          </h4>

          {selectedDate ? (
            <>
              <div className="flex flex-col gap-1 text-sm">
                <p>
                  <span className="font-semibold">Data:</span>{" "}
                  {capitalizedDate}
                </p>
                <p>
                  <span className="font-semibold">Sala:</span> {room.name}
                </p>
              </div>

              {/* Time selectors */}
              <div className="grid grid-cols-2 gap-3">
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
                      {TIME_OPTIONS.slice(0, -1).map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>

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

              {/* Estimated Price */}
              {startTime && endTime && (
                <div className="mt-2">
                  <p className="text-lg font-bold text-foreground">
                    Valor Estimado:{" "}
                    <span className="text-foreground">
                      R${" "}
                      {priceData.finalPrice.toFixed(2).replace(".", ",")}
                    </span>
                  </p>
                </div>
              )}

              {/* Confirm Button */}
              <button
                onClick={onConfirm}
                disabled={!canConfirm}
                className={cn(
                  "mt-2 w-full rounded-lg border-2 border-foreground px-6 py-3 text-base font-semibold text-foreground transition-colors",
                  "hover:bg-foreground hover:text-background",
                  "disabled:cursor-not-allowed disabled:opacity-40"
                )}
              >
                Confirmar e Reservar
              </button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Selecione uma data no calendario para ver o resumo.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function getDurationLabel(start: string, end: string): string {
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  const totalMinutes = eh * 60 + em - (sh * 60 + sm)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}min`
  if (minutes === 0) return `${hours}h`
  return `${hours}h${minutes}min`
}

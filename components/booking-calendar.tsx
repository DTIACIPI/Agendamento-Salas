"use client"

import { useState, useEffect } from "react"
import { ptBR } from "date-fns/locale"
import { addMonths } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import {
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
  const [carouselIndex, setCarouselIndex] = useState(0)

  // Reset carousel when room changes
  useEffect(() => {
    setCarouselIndex(0)
  }, [room.id])

  const today = new Date()
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const nextMonth = addMonths(currentMonth, 1)

  const endOptions = startTime ? getEndTimeOptions(startTime) : []

  const canConfirm = selectedDate && startTime && endTime

  const roomImages = room.images && room.images.length > 0 ? room.images : [room.image]

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

  const handlePrevImage = () => {
    setCarouselIndex((prev) => (prev === 0 ? roomImages.length - 1 : prev - 1))
  }

  const handleNextImage = () => {
    setCarouselIndex((prev) => (prev === roomImages.length - 1 ? 0 : prev + 1))
  }

  return (
    <div className="flex flex-col gap-0 lg:flex-row lg:gap-6">
      {/* Left side: Calendars */}
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
            <span>Capacidade: {room.capacity}</span>
          </div>
          {room.amenities.includes("Projetor") && (
            <Wifi className="size-4" />
          )}
          {room.amenities.includes("Projetor") && (
            <Monitor className="size-4" />
          )}
        </div>
      </div>

      {/* Right side: Image Carousel + Booking Summary */}
      <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-4 mt-4 lg:mt-0">
        {/* Image Carousel */}
        <div className="relative aspect-video w-full overflow-hidden rounded-lg group">
          <Image
            src={roomImages[carouselIndex]}
            alt={`${room.name} - Foto ${carouselIndex + 1}`}
            fill
            className="object-cover transition-opacity duration-300"
            sizes="320px"
          />

          {roomImages.length > 1 && (
            <>
              {/* Previous button */}
              <button
                onClick={handlePrevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md opacity-0 transition-opacity group-hover:opacity-100 hover:bg-background"
                aria-label="Imagem anterior"
              >
                <ChevronLeft className="size-5" />
              </button>

              {/* Next button */}
              <button
                onClick={handleNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md opacity-0 transition-opacity group-hover:opacity-100 hover:bg-background"
                aria-label="Pr\u00f3xima imagem"
              >
                <ChevronRight className="size-5" />
              </button>

              {/* Dot indicators */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {roomImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCarouselIndex(idx)}
                    className={cn(
                      "size-2 rounded-full transition-all",
                      idx === carouselIndex
                        ? "bg-background w-4"
                        : "bg-background/60 hover:bg-background/80"
                    )}
                    aria-label={`Ir para imagem ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Counter */}
              <div className="absolute top-2 right-2 rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium text-foreground">
                {carouselIndex + 1}/{roomImages.length}
              </div>
            </>
          )}
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

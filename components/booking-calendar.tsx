"use client"

import { ptBR } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Room } from "@/components/room-list"

const TIME_SLOTS = [
  { time: "08:00", label: "08:00 - 09:00", available: true },
  { time: "09:00", label: "09:00 - 10:00", available: true },
  { time: "10:00", label: "10:00 - 11:00", available: false },
  { time: "11:00", label: "11:00 - 12:00", available: true },
  { time: "13:00", label: "13:00 - 14:00", available: true },
  { time: "14:00", label: "14:00 - 15:00", available: false },
  { time: "15:00", label: "15:00 - 16:00", available: true },
  { time: "16:00", label: "16:00 - 17:00", available: true },
  { time: "17:00", label: "17:00 - 18:00", available: true },
]

// Simulated unavailable dates
const UNAVAILABLE_DATES = [
  new Date(2026, 2, 1),
  new Date(2026, 2, 7),
  new Date(2026, 2, 8),
  new Date(2026, 2, 14),
  new Date(2026, 2, 15),
  new Date(2026, 2, 21),
  new Date(2026, 2, 22),
]

interface BookingCalendarProps {
  room: Room
  selectedDate: Date | undefined
  onSelectDate: (date: Date | undefined) => void
  selectedSlots: string[]
  onToggleSlot: (slot: string) => void
}

export function BookingCalendar({
  room,
  selectedDate,
  onSelectDate,
  selectedSlots,
  onToggleSlot,
}: BookingCalendarProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          {"Selecione a data"}
        </h3>
        <p className="text-xs text-muted-foreground">
          {room.name} &mdash; {"Hor\u00e1rios dispon\u00edveis"}
        </p>
      </div>

      <div className="flex justify-center rounded-lg border bg-card p-2">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onSelectDate}
          locale={ptBR}
          disabled={[
            { before: new Date() },
            ...UNAVAILABLE_DATES,
          ]}
          className="mx-auto"
        />
      </div>

      {selectedDate && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">
              {"Hor\u00e1rios"}
            </h4>
            <span className="text-xs text-muted-foreground">
              {selectedDate.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {TIME_SLOTS.map((slot) => {
              const isSelected = selectedSlots.includes(slot.time)
              return (
                <button
                  key={slot.time}
                  disabled={!slot.available}
                  onClick={() => onToggleSlot(slot.time)}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg border px-2 py-2 text-xs transition-all duration-150",
                    slot.available && !isSelected &&
                      "cursor-pointer border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5",
                    isSelected &&
                      "border-primary bg-primary/10 text-primary ring-1 ring-primary/30",
                    !slot.available &&
                      "cursor-not-allowed border-border/50 bg-muted/50 text-muted-foreground line-through"
                  )}
                >
                  <span className="font-medium">{slot.time}</span>
                  {isSelected && (
                    <Badge className="mt-1 h-4 px-1 text-[9px] bg-primary text-primary-foreground">
                      {"Selecionado"}
                    </Badge>
                  )}
                  {!slot.available && (
                    <span className="mt-0.5 text-[9px] text-muted-foreground">
                      {"Ocupado"}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-1 flex items-center gap-4 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="size-2.5 rounded-sm bg-card border" />
              {"Dispon\u00edvel"}
            </div>
            <div className="flex items-center gap-1">
              <div className="size-2.5 rounded-sm bg-primary/10 border border-primary/30" />
              {"Selecionado"}
            </div>
            <div className="flex items-center gap-1">
              <div className="size-2.5 rounded-sm bg-muted/50" />
              {"Ocupado"}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

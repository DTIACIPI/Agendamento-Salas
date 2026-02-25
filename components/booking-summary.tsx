"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Receipt, Tag, CalendarDays, Clock } from "lucide-react"
import type { Room } from "@/components/room-list"

function calculateDurationHours(start: string, end: string): number {
  if (!start || !end) return 0
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60
}

interface BookingSummaryProps {
  room: Room
  selectedDate: Date | undefined
  startTime: string
  endTime: string
  isAssociado: boolean
  onToggleAssociado: () => void
  onConfirm: () => void
}

export function BookingSummary({
  room,
  selectedDate,
  startTime,
  endTime,
  isAssociado,
  onToggleAssociado,
  onConfirm,
}: BookingSummaryProps) {
  const hours = calculateDurationHours(startTime, endTime)
  const baseValue = room.pricePerHour * hours
  const isWeekend =
    selectedDate?.getDay() === 0 || selectedDate?.getDay() === 6
  const weekendSurcharge = isWeekend ? baseValue * 0.3 : 0
  const discount = isAssociado ? (baseValue + weekendSurcharge) * 0.15 : 0
  const total = baseValue + weekendSurcharge - discount

  const canConfirm = selectedDate && startTime && endTime && hours > 0

  return (
    <Card className="border-primary/20 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Receipt className="size-4 text-primary" />
          Resumo da Reserva
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {selectedDate ? (
          <>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <CalendarDays className="size-4 text-muted-foreground" />
              {selectedDate.toLocaleDateString("pt-BR", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Clock className="size-4 text-muted-foreground" />
              {startTime && endTime
                ? `${startTime} \u2013 ${endTime} (${formatDuration(hours)})`
                : "Nenhum hor\u00e1rio selecionado"}
            </div>

            <Separator />

            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Valor base</span>
                <span className="font-medium text-foreground">
                  R$ {baseValue.toFixed(2).replace(".", ",")}
                </span>
              </div>

              {isWeekend && (
                <div className="flex items-center justify-between text-warning-foreground">
                  <span className="flex items-center gap-1">
                    <Tag className="size-3" />
                    {"Final de semana (+30%)"}
                  </span>
                  <span className="font-medium">
                    + R$ {weekendSurcharge.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              )}

              {isAssociado && (
                <div className="flex items-center justify-between text-success">
                  <span className="flex items-center gap-1">
                    <Tag className="size-3" />
                    {"Associado ACIPI (-15%)"}
                  </span>
                  <span className="font-medium">
                    - R$ {discount.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              )}
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Valor Total</span>
              <span className="text-xl font-bold text-primary">
                R$ {total.toFixed(2).replace(".", ",")}
              </span>
            </div>

            <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-secondary/50 px-3 py-2 text-sm transition-colors hover:bg-secondary">
              <input
                type="checkbox"
                checked={isAssociado}
                onChange={onToggleAssociado}
                className="size-4 rounded border-input accent-primary"
              />
              <span className="text-foreground">Sou associado ACIPI</span>
            </label>

            <Button
              onClick={onConfirm}
              disabled={!canConfirm}
              className="mt-1 w-full"
              size="lg"
            >
              Concluir Reserva
            </Button>
          </>
        ) : (
          <div className="py-4 text-center text-sm text-muted-foreground">
            {"Selecione uma data no calend\u00e1rio para ver o resumo."}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function formatDuration(hours: number): string {
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m}min`
}

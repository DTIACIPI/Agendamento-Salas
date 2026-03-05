"use client"

import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { ChevronDown, Tag } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Room } from "@/components/room-list"
import { calculateRoomPrice, calculateDurationHours } from "@/lib/utils"

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

function getEndTimeOptions(startTime: string): string[] {
  const startIdx = TIME_OPTIONS.indexOf(startTime)
  if (startIdx === -1) return []
  return TIME_OPTIONS.slice(startIdx + 1)
}

interface BookingSummaryProps {
  room: Room
  selectedDate: Date | undefined
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
}

export function BookingSummary({
  room,
  selectedDate,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  isAssociado,
  onToggleAssociado,
  associadoMonths,
  onAssociadoMonthsChange,
  cnpj,
  onCnpjChange,
  onConfirm,
}: BookingSummaryProps) {
  const priceData = calculateRoomPrice(
    room,
    selectedDate,
    startTime,
    endTime,
    isAssociado ? associadoMonths : 0
  )

  const hours = calculateDurationHours(startTime, endTime)
  const canConfirm = selectedDate && startTime && endTime && hours > 0
  const endOptions = startTime ? getEndTimeOptions(startTime) : []

  const formattedDate = selectedDate
    ? selectedDate.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null

  return (
    <Card className="border bg-card overflow-hidden h-fit sticky top-24">
      <CardContent className="flex flex-col gap-4 p-0">
        {/* Room Image */}
        <div className="relative aspect-video w-full overflow-hidden">
          <Image
            src={room.image}
            alt={room.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 380px"
          />
        </div>

        <div className="flex flex-col gap-4 px-5 pb-5">
          {/* Summary heading */}
          <h3 className="text-lg font-bold text-foreground">
            Resumo da Reserva
          </h3>

          {/* Date and room info */}
          {selectedDate ? (
            <div className="flex flex-col gap-1 text-sm">
              <p>
                <span className="font-semibold">Data:</span>{" "}
                <span className="capitalize">{formattedDate}</span>
              </p>
              <p>
                <span className="font-semibold">Sala:</span> {room.name}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {"Selecione uma data no calend\u00e1rio para ver o resumo."}
            </p>
          )}

          {/* Time selectors */}
          {selectedDate && (
            <div className="grid grid-cols-2 gap-3">
              {/* Start Time */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="start-time"
                  className="text-sm font-medium text-foreground"
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

              {/* End Time */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="end-time"
                  className="text-sm font-medium text-foreground"
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
          )}

          {/* Associado toggle */}
          {selectedDate && (
            <>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-secondary/50 px-3 py-2 text-sm transition-colors hover:bg-secondary">
                <input
                  type="checkbox"
                  checked={isAssociado}
                  onChange={onToggleAssociado}
                  className="size-4 rounded border-input accent-primary"
                />
                <span className="text-foreground">Sou associado ACIPI</span>
              </label>

              {isAssociado && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="months" className="text-xs font-medium text-muted-foreground">
                      {"Tempo de Associa\u00e7\u00e3o (em meses)"}
                    </label>
                    <Input
                      id="months"
                      type="number"
                      placeholder="Informe a quantidade de meses"
                      value={associadoMonths || ""}
                      onChange={(e) => onAssociadoMonthsChange(parseInt(e.target.value, 10) || 0)}
                      min="0"
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      {"At\u00e9 12 meses: 10% | 12-24 meses: 20% | Acima de 24 meses: 30%"}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="cnpj" className="text-xs font-medium text-muted-foreground">
                      CNPJ da Empresa
                    </label>
                    <Input
                      id="cnpj"
                      type="text"
                      placeholder="00.000.000/0000-00"
                      value={cnpj}
                      onChange={(e) => onCnpjChange(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Price section */}
          {selectedDate && startTime && endTime && (
            <>
              <Separator />

              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Valor base</span>
                  <span className="font-medium text-foreground">
                    R$ {priceData.basePrice.toFixed(2).replace(".", ",")}
                  </span>
                </div>

                {priceData.appliedMinimumHours > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {"(M\u00ednimo de "}{priceData.appliedMinimumHours}{"h aplicado)"}
                    </span>
                  </div>
                )}

                {priceData.discountPercent > 0 && (
                  <div className="flex items-center justify-between text-primary">
                    <span className="flex items-center gap-1">
                      <Tag className="size-3" />
                      {`Associado ACIPI (-${priceData.discountPercent}%)`}
                    </span>
                    <span className="font-medium">
                      {"- R$ "}{priceData.discount.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Valor Estimado:</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {priceData.finalPrice.toFixed(2).replace(".", ",")}
                </p>
              </div>
            </>
          )}

          {/* Confirm button */}
          <Button
            onClick={onConfirm}
            disabled={!canConfirm}
            className="w-full"
            size="lg"
          >
            Confirmar e Reservar
          </Button>
        </div>
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

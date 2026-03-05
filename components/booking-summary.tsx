"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Receipt, Tag, CalendarDays, Clock } from "lucide-react"
import type { Room } from "@/components/room-list"
import { calculateRoomPrice, calculateDurationHours } from "@/lib/utils"

interface BookingSummaryProps {
  room: Room
  selectedDate: Date | undefined
  startTime: string
  endTime: string
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
                  R$ {priceData.basePrice.toFixed(2).replace(".", ",")}
                </span>
              </div>

              {priceData.appliedMinimumHours > 0 && (
                <div className="flex items-center justify-between text-info-foreground">
                  <span className="text-xs text-muted-foreground">
                    (Mínimo de {priceData.appliedMinimumHours}h aplicado)
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
                    - R$ {priceData.discount.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              )}
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Valor Total</span>
              <span className="text-xl font-bold text-primary">
                R$ {priceData.finalPrice.toFixed(2).replace(".", ",")}
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

            {isAssociado && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="months" className="text-xs font-medium text-muted-foreground">
                  Tempo de Associação (em meses)
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
                  Até 12 meses: 10% | 12-24 meses: 20% | Acima de 24 meses: 30%
                </p>
              </div>
            )}

            {isAssociado && (
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
            )}

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

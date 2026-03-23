"use client"

import { AlertTriangle, ArrowRight, Users, CalendarDays, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ROOMS, type Room } from "@/components/room-list"
import { isRangeAvailable, UNAVAILABLE_DATES, TIME_OPTIONS } from "@/components/booking-calendar"
import { calculateRoomPrice } from "@/lib/utils"

export interface ConflictItem {
  id: string
  selectedRange: { from?: Date; to?: Date }
  startTime: string
  endTime: string
}

interface UnavailableStateProps {
  currentRoom: Room
  conflicts: ConflictItem[]
  onSelectRoom: (room: Room) => void
  onSelectOther: () => void
  onSelectDate?: (id: string, date: Date) => void
  onSelectTime?: (id: string, start: string, end: string) => void
  focusOnTimeOnly?: boolean
}

function getNextAvailableDate(
  roomId: string,
  startDate: Date,
  startTime: string,
  endTime: string
): Date | null {
  if (!startDate || !startTime || !endTime) return null
  
  let current = new Date(startDate)
  current.setDate(current.getDate() + 1)
  
  for (let i = 0; i < 30; i++) {
    const isSunday = current.getDay() === 0
    const isUnavailable = UNAVAILABLE_DATES.some(d => d.toDateString() === current.toDateString()) || isSunday
    
    if (!isUnavailable && isRangeAvailable(roomId, current, current, startTime, endTime)) {
      return new Date(current)
    }
    current.setDate(current.getDate() + 1)
  }
  return null
}

function getNextAvailableTime(
  roomId: string,
  date: Date,
  startTime: string,
  endTime: string
): { start: string; end: string } | null {
  if (!date || !startTime || !endTime) return null
  
  const startIdx = TIME_OPTIONS.indexOf(startTime)
  const endIdx = TIME_OPTIONS.indexOf(endTime)
  if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) return null
  
  const durationSlots = endIdx - startIdx
  
  for (let i = 0; i <= TIME_OPTIONS.length - 1 - durationSlots; i++) {
    const testStart = TIME_OPTIONS[i]
    const testEnd = TIME_OPTIONS[i + durationSlots]
    
    if (isRangeAvailable(roomId, date, date, testStart, testEnd)) {
      return { start: testStart, end: testEnd }
    }
  }
  return null
}

function getAvailableAlternatives(
  currentRoomId: string,
  conflicts: ConflictItem[]
): Room[] {
  if (!conflicts || conflicts.length === 0) return []
  return ROOMS.filter(
    (room) =>
      room.id !== currentRoomId &&
      room.available &&
      conflicts.every(c => c.selectedRange.from && c.selectedRange.to && isRangeAvailable(room.id, c.selectedRange.from, c.selectedRange.to, c.startTime, c.endTime))
  )
}

export function UnavailableState({
  currentRoom,
  conflicts,
  onSelectRoom,
  onSelectOther,
  onSelectDate,
  onSelectTime,
  focusOnTimeOnly,
}: UnavailableStateProps) {
  const alternatives = getAvailableAlternatives(
    currentRoom.id,
    conflicts
  )

  const hasTimeSelected = conflicts.length > 0

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-6 text-destructive" />
          </div>

          <div>
            <h3 className="text-base font-semibold text-[#384050]">
              {"Hor\u00e1rio indispon\u00edvel"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasTimeSelected
                ? `A ${currentRoom.name} n\u00e3o est\u00e1 dispon\u00edvel para as seguintes datas: ${conflicts.map(c => c.selectedRange.from?.toLocaleDateString("pt-BR")).join(", ")}.`
                : `Este espa\u00e7o n\u00e3o est\u00e1 dispon\u00edvel para loca\u00e7\u00e3o no momento. Tente outra data ou entre em contato.`}
            </p>
          </div>

          {hasTimeSelected && (
            <div className="mt-4 flex w-full max-w-md flex-col gap-5 text-left">
              {conflicts.map((conflict) => {
                const nextAvailableDate = !focusOnTimeOnly && conflict.selectedRange.from && conflict.startTime && conflict.endTime 
                  ? getNextAvailableDate(currentRoom.id, conflict.selectedRange.from, conflict.startTime, conflict.endTime)
                  : null;
                
                const nextAvailableTime = conflict.selectedRange.from && conflict.startTime && conflict.endTime
                  ? getNextAvailableTime(currentRoom.id, conflict.selectedRange.from, conflict.startTime, conflict.endTime)
                  : null;

                if (!nextAvailableDate && !nextAvailableTime) return null;

                return (
                  <div key={conflict.id} className="flex flex-col gap-3 border-t border-destructive/10 pt-4 first:border-0 first:pt-0">
                    <div className="text-center">
                      <h4 className="text-sm font-semibold text-[#384050]">
                        {"Op\u00e7\u00f5es para o dia"} {conflict.selectedRange.from?.toLocaleDateString("pt-BR")}
                      </h4>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {conflict.startTime} &ndash; {conflict.endTime}
                      </p>
                    </div>
                    
                    {nextAvailableTime && onSelectTime && (
                      <button
                        onClick={() => onSelectTime(conflict.id, nextAvailableTime.start, nextAvailableTime.end)}
                        className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border bg-background px-4 py-3 text-left shadow-sm transition-all hover:border-primary/40 hover:bg-primary/5"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium capitalize transition-colors group-hover:text-primary text-[#384050]">
                            {nextAvailableTime.start} &ndash; {nextAvailableTime.end}
                          </span>
                          <span className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {"Mesmo dia"}
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-primary/10 text-[10px] text-primary">
                            {"Mudar hor\u00e1rio"}
                          </Badge>
                          <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                        </div>
                      </button>
                    )}

                    {nextAvailableDate && onSelectDate && (
                      <button
                        onClick={() => onSelectDate(conflict.id, nextAvailableDate)}
                        className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border bg-background px-4 py-3 text-left shadow-sm transition-all hover:border-primary/40 hover:bg-primary/5"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium capitalize transition-colors group-hover:text-primary text-[#384050]">
                            {nextAvailableDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                          </span>
                          <span className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="size-3" />
                              {"Mesmo hor\u00e1rio"}
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-primary/10 text-[10px] text-primary">
                            {"Mudar data"}
                          </Badge>
                          <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                        </div>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alternative room suggestions */}
      {hasTimeSelected && alternatives.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4">
            <div>
              <h4 className="text-sm font-semibold text-[#384050]">
                {"Espa\u00e7os dispon\u00edveis nesse hor\u00e1rio"}
              </h4>
              <p className="text-xs text-muted-foreground">
                {conflicts.map(c => c.selectedRange.from?.toLocaleDateString("pt-BR")).join(", ")}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {alternatives.map((room) => {
                const totalAlternativePrice = conflicts.reduce((sum, conflict) => sum + calculateRoomPrice(
                  room,
                  conflict.selectedRange.from,
                  conflict.startTime,
                  conflict.endTime,
                  0,
                  conflict.selectedRange
                ).finalPrice, 0)

                return (
                <button
                  key={room.id}
                  onClick={() => onSelectRoom(room)}
                  className="group flex cursor-pointer items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-[#384050] group-hover:text-primary transition-colors">
                      {room.name}
                    </span>
                    <span className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="size-3" />
                        {"At\u00e9"} {room.capacity} pessoas
                      </span>
                      <span>
                        R$ {totalAlternativePrice.toFixed(2).replace(".", ",")}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-primary text-[10px]"
                    >
                      {"Dispon\u00edvel"}
                    </Badge>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                </button>
              )})}
            </div>
          </CardContent>
        </Card>
      )}

      {hasTimeSelected && alternatives.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              {"Nenhum outro espa\u00e7o est\u00e1 dispon\u00edvel para as datas e hor\u00e1rios selecionados. Tente selecionar outro hor\u00e1rio ou data."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

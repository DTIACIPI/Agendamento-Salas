"use client"

import { AlertTriangle, CalendarSearch, Phone, ArrowRight, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ROOMS, type Room } from "@/components/room-list"
import { isRangeAvailable } from "@/components/booking-calendar"

interface UnavailableStateProps {
  currentRoom: Room
  selectedRange: { from?: Date; to?: Date }
  startTime: string
  endTime: string
  onSelectRoom: (room: Room) => void
  onSelectOther: () => void
}

function getAvailableAlternatives(
  currentRoomId: string,
  range: { from?: Date; to?: Date },
  startTime: string,
  endTime: string
): Room[] {
  if (!range.from || !range.to || !startTime || !endTime) return []
  return ROOMS.filter(
    (room) =>
      room.id !== currentRoomId &&
      room.available &&
      isRangeAvailable(room.id, range.from!, range.to!, startTime, endTime)
  )
}

export function UnavailableState({
  currentRoom,
  selectedRange,
  startTime,
  endTime,
  onSelectRoom,
  onSelectOther,
}: UnavailableStateProps) {
  const alternatives = getAvailableAlternatives(
    currentRoom.id,
    selectedRange,
    startTime,
    endTime
  )

  const hasTimeSelected = !!selectedRange.from && !!selectedRange.to && !!startTime && !!endTime

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-6 text-destructive" />
          </div>

          <div>
            <h3 className="text-base font-semibold text-foreground">
              {"Hor\u00e1rio indispon\u00edvel"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasTimeSelected
                ? `A ${currentRoom.name} n\u00e3o est\u00e1 dispon\u00edvel no hor\u00e1rio selecionado (${startTime} \u2013 ${endTime}).`
                : `Este espa\u00e7o n\u00e3o est\u00e1 dispon\u00edvel para loca\u00e7\u00e3o no momento. Tente outra data ou entre em contato.`}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="gap-2" onClick={onSelectOther}>
              <CalendarSearch className="size-4" />
              {"Selecionar outra data/espa\u00e7o"}
            </Button>
            <Button
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              asChild
            >
              <a
                href="https://wa.me/5519999999999"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Phone className="size-4" />
                Falar com atendente
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alternative room suggestions */}
      {hasTimeSelected && alternatives.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                {"Espa\u00e7os dispon\u00edveis nesse hor\u00e1rio"}
              </h4>
              <p className="text-xs text-muted-foreground">
                {selectedRange.from && selectedRange.to
                  ? `${selectedRange.from.toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })} – ${selectedRange.to.toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}`
                  : selectedRange.from
                  ? selectedRange.from.toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })
                  : ""}{" "}
                &middot; {startTime} &ndash; {endTime}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {alternatives.map((room) => (
                <button
                  key={room.id}
                  onClick={() => onSelectRoom(room)}
                  className="group flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {room.name}
                    </span>
                    <span className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="size-3" />
                        {"At\u00e9"} {room.capacity} pessoas
                      </span>
                      <span>
                        R$ {room.pricePerHour.toFixed(2).replace(".", ",")}/h
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
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {hasTimeSelected && alternatives.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              {"Nenhum outro espa\u00e7o est\u00e1 dispon\u00edvel nesse hor\u00e1rio. Tente selecionar outro hor\u00e1rio ou data."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

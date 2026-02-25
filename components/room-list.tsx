"use client"

import Image from "next/image"
import { Users, Monitor, Wifi, Coffee } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface Room {
  id: string
  name: string
  description: string
  capacity: number
  image: string
  amenities: string[]
  pricePerHour: number
  available: boolean
}

export const ROOMS: Room[] = [
  {
    id: "sala-reuniao",
    name: "Sala de Reuni\u00e3o Executiva",
    description: "Espa\u00e7o ideal para reuni\u00f5es corporativas e apresenta\u00e7\u00f5es.",
    capacity: 12,
    image: "/images/sala-reuniao.jpg",
    amenities: ["Wi-Fi", "Projetor", "Ar-condicionado"],
    pricePerHour: 80,
    available: true,
  },
  {
    id: "auditorio",
    name: "Audit\u00f3rio Principal",
    description: "Espa\u00e7o amplo para eventos, palestras e workshops.",
    capacity: 80,
    image: "/images/auditorio.jpg",
    amenities: ["Wi-Fi", "Sonoriza\u00e7\u00e3o", "Projetor", "Palco"],
    pricePerHour: 250,
    available: true,
  },
  {
    id: "sala-treinamento",
    name: "Sala de Treinamento",
    description: "Sala equipada para cursos e capacita\u00e7\u00f5es profissionais.",
    capacity: 30,
    image: "/images/sala-treinamento.jpg",
    amenities: ["Wi-Fi", "Projetor", "Mesas individuais"],
    pricePerHour: 120,
    available: true,
  },
  {
    id: "coworking",
    name: "Espa\u00e7o Coworking",
    description: "Ambiente compartilhado para trabalho colaborativo.",
    capacity: 20,
    image: "/images/coworking.jpg",
    amenities: ["Wi-Fi", "Caf\u00e9", "Impress\u00e3o"],
    pricePerHour: 40,
    available: false,
  },
]

const amenityIcons: Record<string, React.ReactNode> = {
  "Wi-Fi": <Wifi className="size-3" />,
  "Projetor": <Monitor className="size-3" />,
  "Caf\u00e9": <Coffee className="size-3" />,
}

interface RoomListProps {
  selectedRoomId: string | null
  onSelectRoom: (room: Room) => void
}

export function RoomList({ selectedRoomId, onSelectRoom }: RoomListProps) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{"Espa\u00e7os dispon\u00edveis"}</h2>
        <p className="text-sm text-muted-foreground">
          {"Selecione um espa\u00e7o para visualizar a disponibilidade"}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {ROOMS.map((room) => (
          <Card
            key={room.id}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:shadow-md",
              selectedRoomId === room.id
                ? "ring-2 ring-primary shadow-md"
                : "hover:border-primary/30",
              !room.available && "opacity-60"
            )}
            onClick={() => onSelectRoom(room)}
          >
            <CardContent className="p-3">
              <div className="flex gap-3">
                <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md">
                  <Image
                    src={room.image}
                    alt={room.name}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold leading-tight text-foreground">
                        {room.name}
                      </h3>
                      {room.available ? (
                        <Badge
                          variant="secondary"
                          className="shrink-0 bg-success/10 text-success text-[10px]"
                        >
                          {"Dispon\u00edvel"}
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="shrink-0 bg-destructive/10 text-destructive text-[10px]"
                        >
                          {"Indispon\u00edvel"}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                      {room.description}
                    </p>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="size-3" />
                      <span className="text-xs">
                        {"At\u00e9"} {room.capacity} pessoas
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {room.amenities.slice(0, 3).map((amenity) => (
                        <span
                          key={amenity}
                          className="flex items-center gap-0.5 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground"
                        >
                          {amenityIcons[amenity] || null}
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

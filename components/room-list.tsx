"use client"

import Image from "next/image"
import { Users, Monitor, Wifi, Coffee } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface PricePeriod {
  startHour: number
  endHour: number
  price: number
}

export interface Room {
  id: string
  name: string
  description: string
  capacity: number
  image: string
  amenities: string[]
  infrastructure: string[]
  minHoursWeekday: number // Segunda a sexta
  minHoursSaturday: number // Sábado
  pricePeriodsWeekday: PricePeriod[] // Segunda a sexta
  pricePeroidsSaturday: PricePeriod[] // Sábado
  available: boolean
}

export const ROOMS: Room[] = [
  {
    id: "sala",
    name: "Sala",
    description: "Espaço versátil para reuniões e pequenos eventos. Capacidade: 40 pessoas.",
    capacity: 40,
    image: "/images/SALA 02/Sala 02 (1).JPG",
    amenities: ["Ar-condicionado", "Projetor", "Quadro branco"],
    infrastructure: [
      "Cadeiras e mesas",
      "Ar-condicionado",
      "2 caixas de som",
      "1 microfone com fio",
      "Quadro branco",
      "1 tela para projeção",
      "1 projetor marca Epson",
      "1 mesa para café",
    ],
    minHoursWeekday: 4,
    minHoursSaturday: 5,
    pricePeriodsWeekday: [{ startHour: 8, endHour: 22, price: 120 }],
    pricePeroidsSaturday: [{ startHour: 8, endHour: 13, price: 192 }],
    available: true,
  },
  {
    id: "auditorio",
    name: "Auditório",
    description: "Espaço amplo com palco e equipamentos audiovisuais. Capacidade: 199 pessoas.",
    capacity: 199,
    image: "/images/AUDITÓRIO/Auditório (1).jpg",
    amenities: ["Ar-condicionado", "Projetor", "Palco", "Microfone"],
    infrastructure: [
      "Poltronas individuais",
      "Palco com 2 caixas de retorno",
      "Ar-condicionado",
      "1 tela para projeção de 187\"",
      "2 telas para projeção de 138\"",
      "3 projetores",
      "1 mesa para equipamentos",
      "1 cadeira tipo secretária",
      "1 púlpito",
      "1 microfone",
      "3 mesas de madeira para composição de mesa",
      "10 cadeiras tipo executiva",
      "1 porta-bandeira com as bandeiras nacional, estadual e municipal",
      "2 mesas para apoio",
    ],
    minHoursWeekday: 4,
    minHoursSaturday: 5,
    pricePeriodsWeekday: [{ startHour: 8, endHour: 22, price: 925 }],
    pricePeroidsSaturday: [{ startHour: 8, endHour: 17, price: 1480 }],
    available: true,
  },
  {
    id: "auditorio-foyer",
    name: "Auditório + Foyer",
    description: "Auditório com acesso ao Foyer. Capacidade: 199 pessoas.",
    capacity: 199,
    image: "/images/AUDITÓRIO/FOTO AUDITORIO ACIPI.png",
    amenities: ["Ar-condicionado", "Projetor", "Palco", "Cozinha"],
    infrastructure: [
      "Poltronas individuais",
      "Palco com 2 caixas de retorno",
      "Ar-condicionado",
      "1 tela para projeção de 187\"",
      "2 telas para projeção de 138\"",
      "3 projetores",
      "1 mesa para equipamentos",
      "1 cadeira tipo secretária",
      "1 púlpito",
      "1 microfone",
      "3 mesas de madeira para composição de mesa",
      "10 cadeiras tipo executiva",
      "1 porta-bandeira com as bandeiras nacional, estadual e municipal",
      "2 mesas para apoio",
      "2 mesas medindo L 1,10 x C 3,00",
      "3 mesas medindo L 0,80 x C 1,40",
      "1 bebedouro",
      "Cozinha com geladeira, fogão de 4 bocas industrial, coifa",
      "2 mesas medindo L 0,80 x C 1,20",
    ],
    minHoursWeekday: 4,
    minHoursSaturday: 5,
    pricePeriodsWeekday: [{ startHour: 8, endHour: 22, price: 1155 }],
    pricePeroidsSaturday: [{ startHour: 8, endHour: 17, price: 1848 }],
    available: true,
  },
  {
    id: "foyer",
    name: "Foyer",
    description: "Espaço para recepção com cozinha. Capacidade: 199 pessoas.",
    capacity: 199,
    image: "/images/FOYER/Foyer (1).JPG",
    amenities: ["Ar-condicionado", "Cozinha", "Bebedouro"],
    infrastructure: [
      "2 mesas medindo L 1,10 x C 3,00",
      "3 mesas medindo L 0,80 x C 1,40",
      "1 bebedouro",
      "Ar-condicionado",
      "Cozinha com geladeira, fogão de 4 bocas industrial, coifa",
      "2 mesas medindo L 0,80 x C 1,20",
      "2 mesas plásticas medindo L 0,85 x C 1,37",
      "2 ventiladores",
    ],
    minHoursWeekday: 4,
    minHoursSaturday: 5,
    pricePeriodsWeekday: [{ startHour: 8, endHour: 22, price: 337.5 }],
    pricePeroidsSaturday: [{ startHour: 8, endHour: 17, price: 540 }],
    available: true,
  },
  {
    id: "miniauditorio",
    name: "Miniauditório",
    description: "Sala de eventos menor com equipamentos audiovisuais. Capacidade: 74 pessoas.",
    capacity: 74,
    image: "/images/MINIAUDITÓRIO/Miniauditório (1).jpg",
    amenities: ["Ar-condicionado", "Projetor", "Microfone"],
    infrastructure: [
      "Poltronas individuais",
      "Ar-condicionado",
      "Caixa de som",
      "Quadro branco",
      "1 tela para projeção",
      "1 projetor",
      "1 microfone sem fio",
      "2 mesas",
    ],
    minHoursWeekday: 4,
    minHoursSaturday: 5,
    pricePeriodsWeekday: [
      { startHour: 8, endHour: 18, price: 175 },
      { startHour: 18, endHour: 22, price: 200 },
    ],
    pricePeroidsSaturday: [{ startHour: 8, endHour: 17, price: 280 }],
    available: true,
  },
  {
    id: "regional-sta-terezinha",
    name: "Regional Sta. Terezinha",
    description: "Sala de treinamento compacta. Capacidade: 20 pessoas.",
    capacity: 20,
    image: "/images/REGIONAL/Escritório Regional (1).jpg",
    amenities: ["Ar-condicionado", "Projetor", "Quadro branco"],
    infrastructure: [
      "Cadeiras universitárias",
      "Ar-condicionado",
      "1 caixa de som",
      "1 tela para projeção",
      "1 projetor",
      "2 mesas",
    ],
    minHoursWeekday: 4,
    minHoursSaturday: 5,
    pricePeriodsWeekday: [{ startHour: 8, endHour: 18, price: 57.5 }],
    pricePeroidsSaturday: [], // Sábado não realiza locação
    available: true,
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
                          className="shrink-0 bg-primary/10 text-primary text-[10px]"
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

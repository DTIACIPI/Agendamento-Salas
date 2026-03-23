"use client"

import Image from "next/image"
import { Users, CheckCircle2 } from "lucide-react"
import { Card } from "@/components/ui/card"
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
  images: string[]
  amenities: string[]
  infrastructure: string[]
  minHoursWeekday: number // Segunda a sexta
  minHoursSaturday: number // Sábado
  pricePeriodsWeekday: PricePeriod[] // Segunda a sexta
  pricePeriodsSaturday: PricePeriod[] // Sábado
  available: boolean
}

export const ROOMS: Room[] = [
  {
    id: "sala",
    name: "Sala",
    description: "Espaço versátil para reuniões e pequenos eventos. Capacidade: 40 pessoas.",
    capacity: 40,
    image: "/images/SALA 02/Sala 02 (1).JPG",
    images: [
      "/images/SALA 02/Sala 02 (1).JPG",
      "/images/SALA 02/Sala 02 (2).JPG",
      "/images/SALA 02/Sala 02 (3).JPG",
      "/images/SALA 02/Sala 02 (4).JPG",
    ],
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
    pricePeriodsSaturday: [{ startHour: 8, endHour: 13, price: 192 }],
    available: true,
  },
  {
    id: "auditorio",
    name: "Auditório",
    description: "Espaço amplo com palco e equipamentos audiovisuais. Capacidade: 199 pessoas.",
    capacity: 199,
    image: "/images/AUDITÓRIO/Auditório (1).jpg",
    images: [
      "/images/AUDITÓRIO/Auditório (1).jpg",
      "/images/AUDITÓRIO/Auditório (2).jpg",
      "/images/AUDITÓRIO/Auditório (3).JPG",
      "/images/AUDITÓRIO/Auditório (4).jpg",
      "/images/AUDITÓRIO/Auditório (5).jpg",
      "/images/AUDITÓRIO/Auditório (7).jpg",
      "/images/AUDITÓRIO/FOTO AUDITORIO ACIPI.png",
    ],
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
    pricePeriodsSaturday: [{ startHour: 8, endHour: 17, price: 1480 }],
    available: true,
  },
  {
    id: "auditorio-foyer",
    name: "Auditório + Foyer",
    description: "Auditório com acesso ao Foyer. Capacidade: 199 pessoas.",
    capacity: 199,
    image: "/images/AUDITÓRIO/FOTO AUDITORIO ACIPI.png",
    images: [
      "/images/AUDITÓRIO/FOTO AUDITORIO ACIPI.png",
      "/images/AUDITÓRIO/Auditório (1).jpg",
      "/images/AUDITÓRIO/Auditório (2).jpg",
      "/images/AUDITÓRIO/Auditório (3).JPG",
      "/images/AUDITÓRIO/Auditório (4).jpg",
      "/images/AUDITÓRIO/Auditório (5).jpg",
      "/images/AUDITÓRIO/Auditório (7).jpg",
      "/images/FOYER/Foyer (1).JPG",
      "/images/FOYER/Foyer (2).JPG",
      "/images/FOYER/Foyer (3).JPG",
      "/images/FOYER/Foyer (4).JPG",
      "/images/FOYER/Foyer (5).JPG",
      "/images/FOYER/Foyer (6).JPG",
    ],
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
    pricePeriodsSaturday: [{ startHour: 8, endHour: 17, price: 1848 }],
    available: true,
  },
  {
    id: "foyer",
    name: "Foyer",
    description: "Espaço para recepção com cozinha. Capacidade: 199 pessoas.",
    capacity: 199,
    image: "/images/FOYER/Foyer (1).JPG",
    images: [
      "/images/FOYER/Foyer (1).JPG",
      "/images/FOYER/Foyer (2).JPG",
      "/images/FOYER/Foyer (3).JPG",
      "/images/FOYER/Foyer (4).JPG",
      "/images/FOYER/Foyer (5).JPG",
      "/images/FOYER/Foyer (6).JPG",
    ],
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
    pricePeriodsSaturday: [{ startHour: 8, endHour: 17, price: 540 }],
    available: true,
  },
  {
    id: "miniauditorio",
    name: "Miniauditório",
    description: "Sala de eventos menor com equipamentos audiovisuais. Capacidade: 74 pessoas.",
    capacity: 74,
    image: "/images/MINIAUDITÓRIO/Miniauditório (1).jpg",
    images: [
      "/images/MINIAUDITÓRIO/Miniauditório (1).jpg",
      "/images/MINIAUDITÓRIO/Miniauditório (2).jpg",
      "/images/MINIAUDITÓRIO/Miniauditório (3).jpg",
      "/images/MINIAUDITÓRIO/Miniauditório (4).jpg",
      "/images/MINIAUDITÓRIO/Miniauditório (5).jpg",
      "/images/MINIAUDITÓRIO/Miniauditório (6).jpg",
      "/images/MINIAUDITÓRIO/Hall Miniauditório (1).JPG",
      "/images/MINIAUDITÓRIO/Hall Miniauditório (2).JPG",
      "/images/MINIAUDITÓRIO/Hall Miniauditório (3).JPG",
      "/images/MINIAUDITÓRIO/Hall Miniauditório (4).JPG",
      "/images/MINIAUDITÓRIO/Hall Miniauditório (5).JPG",
      "/images/MINIAUDITÓRIO/Hall Miniauditório (6).JPG",
    ],
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
    pricePeriodsSaturday: [{ startHour: 8, endHour: 17, price: 280 }],
    available: true,
  },
  {
    id: "regional-sta-terezinha",
    name: "Regional Sta. Terezinha",
    description: "Sala de treinamento compacta. Capacidade: 20 pessoas.",
    capacity: 20,
    image: "/images/REGIONAL/Escritório Regional (1).jpg",
    images: [
      "/images/REGIONAL/Escritório Regional (1).jpg",
      "/images/REGIONAL/Escritório Regional (2).jpg",
      "/images/REGIONAL/Escritório Regional (3).jpg",
      "/images/REGIONAL/Escritório Regional (4).jpg",
      "/images/REGIONAL/Escritório Regional (5).jpg",
      "/images/REGIONAL/Escritório Regional (6).jpg",
      "/images/REGIONAL/Escritório Regional (Fachada).jpg",
    ],
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
    pricePeriodsSaturday: [], // Sábado não realiza locação
    available: true,
  },
]

interface RoomListProps {
  selectedRoomId: string | null
  onSelectRoom: (room: Room) => void
}

export function RoomList({ selectedRoomId, onSelectRoom }: RoomListProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {ROOMS.map((room) => (
          <Card
            key={room.id}
            className={cn(
              "p-0 cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white transition-all duration-300",
              "shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md",
              selectedRoomId === room.id
                ? "ring-2 ring-primary"
                : "hover:ring-1 hover:ring-primary/20",
              !room.available && "opacity-75 grayscale-[0.5]"
            )}
            onClick={() => onSelectRoom(room)}
          >
            <div className="flex flex-col sm:flex-row items-stretch">
              
              {/* Container da Imagem */}
              <div className="relative m-3 shrink-0 overflow-hidden rounded-lg bg-gray-100 w-full h-48 sm:h-auto sm:w-[35%] aspect-video sm:aspect-square xl:aspect-[4/3]">
                <Image
                  src={room.image}
                  alt={room.name}
                  fill
                  className="object-cover"
                  sizes="192px"
                />
              </div>

              {/* Container de Conteúdo */}
              <div className="flex flex-1 flex-col justify-start p-3 sm:py-3 sm:pr-4 sm:pl-2">
                
                {/* Badge de Status */}
                <div
                  className={cn(
                    "mb-2 inline-flex w-fit items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold",
                    room.available
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  )}
                >
                  <CheckCircle2 className="size-3.5" />
                  {room.available ? "Disponível" : "Indisponível"}
                </div>

                {/* Título */}
                <h3 className="mb-1 text-lg font-bold leading-tight text-[#384050]">
                  {room.name}
                </h3>

                {/* Descrição */}
                <p className="mb-3 text-sm leading-snug text-gray-600 line-clamp-2">
                  {room.description}
                </p>

                {/* Capacidade */}
                <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-[#384050]">
                  <Users className="size-4 text-gray-500" />
                  <span>
                    Capacidade: Até <span className="font-bold">{room.capacity}</span>
                  </span>
                </div>

                {/* Container de Comodidades */}
                <div className="mt-auto rounded-md border border-slate-200 bg-slate-50 p-2">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-600">
                    Comodidades
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {room.amenities.map((amenity) => (
                      <span
                        key={amenity}
                        className="flex items-center rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-700 shadow-sm whitespace-nowrap"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
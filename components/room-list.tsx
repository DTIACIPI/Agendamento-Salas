"use client"

import { useState, useEffect } from "react"
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
  images?: string[]
  amenities: string[]
  infrastructure?: string[]
  minHoursWeekday: number // Segunda a sexta
  minHoursSaturday?: number // Sábado
  pricePeriodsWeekday: PricePeriod[] // Segunda a sexta
  pricePeriodsSaturday?: PricePeriod[] // Sábado
  available: boolean
}

interface RoomListProps {
  selectedRoomId: string | null
  onSelectRoom: (room: Room) => void
  onLoadedSpaces?: (spaces: Room[]) => void
}

export function RoomList({ selectedRoomId, onSelectRoom, onLoadedSpaces }: RoomListProps) {
  const [spaces, setSpaces] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSpaces = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('https://acipiapi.eastus.cloudapp.azure.com/webhook/api/spaces?page=1&limit=10')
        
        if (!response.ok) {
          throw new Error('Falha ao carregar os dados do servidor.')
        }
        
        const data = await response.json()
        console.log("Resposta bruta da API (RoomList):", data)
        
        // Garante que vai pegar a lista de salas, não importa o formato que o webhook retorne
        // Extrai o array de salas da estrutura aninhada `[ { data: [...] } ]` retornada pela API.
        const rawArray = Array.isArray(data) && data.length > 0 && Array.isArray(data[0].data)
          ? data[0].data
          : [];
        
        const spacesData: Room[] = rawArray.map((apiRoom: any) => {
          return {
            id: apiRoom.id,
            name: apiRoom.name,
            description: apiRoom.description,
            capacity: apiRoom.capacity,
            image: apiRoom.image,
            images: Array.isArray(apiRoom.images) ? apiRoom.images : (apiRoom.image ? [apiRoom.image] : []),
            amenities: Array.isArray(apiRoom.amenities) ? apiRoom.amenities : [],
            minHoursWeekday: apiRoom.minHoursWeekday,
            minHoursSaturday: apiRoom.minHoursSaturday,
            pricePeriodsWeekday: Array.isArray(apiRoom.pricePeriodsWeekday) ? apiRoom.pricePeriodsWeekday : [],
            pricePeriodsSaturday: Array.isArray(apiRoom.pricePeriodsSaturday) ? apiRoom.pricePeriodsSaturday : [],
            available: apiRoom.available === 1 || apiRoom.available === true,
          }
        })
        setSpaces(spacesData)
        if (onLoadedSpaces) onLoadedSpaces(spacesData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSpaces()
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="animate-pulse text-sm font-medium text-muted-foreground">Carregando salas...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {spaces.map((room) => (
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

                {/* Capacidade e Preço */}
                <div className="mb-3 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 text-sm font-medium text-[#384050]">
                  <div className="flex items-center gap-1.5">
                    <Users className="size-4 text-gray-500" />
                    <span>
                      Capacidade: Até <span className="font-bold">{room.capacity}</span>
                    </span>
                  </div>

                </div>

                {/* Container de Comodidades */}
                <div className="mt-auto rounded-md border border-slate-200 bg-slate-50 p-2">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-600">
                    Comodidades
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(room.amenities.length > 0 ? room.amenities : ["Wi-Fi", "Projetor", "Ar Condicionado"]).slice(0, 3).map((amenity) => (
                      <span
                        key={amenity}
                        className={cn(
                          "flex items-center rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-700 shadow-sm whitespace-nowrap",
                          room.amenities.length === 0 && "opacity-60"
                        )}
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
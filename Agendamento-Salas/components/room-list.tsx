"use client"

import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback, memo } from "react"
import Image from "next/image"
import { Users, CheckCircle2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn, API_BASE_URL } from "@/lib/utils"

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

export const RoomList = memo(function RoomList({ selectedRoomId, onSelectRoom, onLoadedSpaces }: RoomListProps) {
  const [spaces, setSpaces] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // FLIP animation refs
  const cardRefsMap = useRef<Map<string, HTMLDivElement>>(new Map())
  const snapshotRef = useRef<Map<string, DOMRect>>(new Map())
  const prevSelectedRef = useRef<string | null>(null)

  const setCardRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) cardRefsMap.current.set(id, el)
    else cardRefsMap.current.delete(id)
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    const fetchSpaces = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`${API_BASE_URL}/webhook/api/spaces?page=1&limit=10`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Falha ao carregar os dados do servidor.')
        }

        const data = await response.json()

        const rawArray = Array.isArray(data) && data.length > 0 && Array.isArray(data[0].data)
          ? data[0].data
          : [];

        const spacesData: Room[] = rawArray.map((apiRoom: any) => ({
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
        }))
        setSpaces(spacesData)
        if (onLoadedSpaces) onLoadedSpaces(spacesData)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSpaces()
    return () => controller.abort()
  }, [])

  // FLIP Step 1 (First): snapshot positions BEFORE reorder
  // This runs synchronously before React commits the new DOM
  if (selectedRoomId !== prevSelectedRef.current) {
    snapshotRef.current = new Map()
    cardRefsMap.current.forEach((el, id) => {
      snapshotRef.current.set(id, el.getBoundingClientRect())
    })
  }

  const sortedSpaces = useMemo(() => {
    if (!selectedRoomId) return spaces
    const selected = spaces.find(r => r.id === selectedRoomId)
    if (!selected) return spaces
    return [selected, ...spaces.filter(r => r.id !== selectedRoomId)]
  }, [spaces, selectedRoomId])

  // FLIP Steps 2-4 (Last, Invert, Play): after DOM update, animate from old to new position
  useLayoutEffect(() => {
    if (selectedRoomId === prevSelectedRef.current) return
    if (snapshotRef.current.size === 0) {
      prevSelectedRef.current = selectedRoomId
      return
    }

    cardRefsMap.current.forEach((el, id) => {
      const firstRect = snapshotRef.current.get(id)
      if (!firstRect) return

      const lastRect = el.getBoundingClientRect()
      const deltaY = firstRect.top - lastRect.top

      if (Math.abs(deltaY) < 1) return

      // Invert: place element at its old position
      el.style.transform = `translateY(${deltaY}px)`
      el.style.transition = "none"

      // Play: animate back to natural position
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.transition = "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)"
          el.style.transform = ""
          const cleanup = () => {
            el.style.transition = ""
            el.removeEventListener("transitionend", cleanup)
          }
          el.addEventListener("transitionend", cleanup)
        })
      })
    })

    snapshotRef.current = new Map()
    prevSelectedRef.current = selectedRoomId
  }, [selectedRoomId])

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
        {sortedSpaces.map((room) => (
          <Card
            key={room.id}
            ref={(el: HTMLDivElement | null) => setCardRef(room.id, el)}
            className={cn(
              "p-0 cursor-pointer overflow-hidden rounded-xl border",
              "shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md",
              selectedRoomId === room.id
                ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                : "border-gray-200 bg-white hover:ring-1 hover:ring-primary/20",
              !room.available && "opacity-75 grayscale-[0.5]"
            )}
            onClick={() => onSelectRoom(room)}
          >
            <div className="flex flex-col sm:flex-row items-stretch">
              
              {/* Container da Imagem */}
              <div className="relative m-3 shrink-0 overflow-hidden rounded-lg bg-gray-100 w-full h-44 sm:h-auto sm:w-[42%] sm:max-w-[320px] aspect-video">
                <Image
                  src={room.image}
                  alt={room.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 320px"
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
                    {room.amenities.length > 0 ? room.amenities.slice(0, 3).map((amenity) => (
                      <span
                        key={amenity}
                        className="flex items-center rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-700 shadow-sm whitespace-nowrap"
                      >
                        {amenity}
                      </span>
                    )) : (
                      <span className="text-[10px] text-slate-400 italic">Nenhuma informada</span>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
})
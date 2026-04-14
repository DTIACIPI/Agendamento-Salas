"use client"

import { Plus, Edit, ImageOff } from "lucide-react"
import type { Room } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"

interface SalasViewProps {
  rooms: Room[]
  isLoading: boolean
  onOpenRoomModal: (room: Room | null) => void
}

function getBasePrice(periods: Room["pricePeriodsWeekday"]): number | null {
  if (!periods || periods.length === 0) return null
  return periods[0].price
}

export function SalasView({ rooms, isLoading, onOpenRoomModal }: SalasViewProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestao de Espacos</h1>
          <p className="text-slate-500 text-sm">Controle as regras, precos e infraestrutura das salas.</p>
        </div>
        <button
          onClick={() => onOpenRoomModal(null)}
          className="flex items-center gap-2 bg-[#184689] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#113262] font-medium"
        >
          <Plus className="w-4 h-4" /> Adicionar Sala
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="h-40 bg-slate-200 animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="h-5 w-2/3 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-slate-100 rounded animate-pulse" />
                <div className="h-9 bg-slate-100 rounded animate-pulse mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500">
          Nenhuma sala cadastrada.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => {
            const weekdayPrice = getBasePrice(room.pricePeriodsWeekday)
            const saturdayPrice = getBasePrice(room.pricePeriodsSaturday)

            return (
              <div key={room.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="h-40 bg-slate-200 relative group">
                  {room.image ? (
                    <img src={room.image} alt={room.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <ImageOff className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span
                      className={`px-2.5 py-1 text-xs font-bold rounded text-white ${
                        room.available ? "bg-emerald-500" : "bg-red-500"
                      }`}
                    >
                      {room.available ? "Disponivel" : "Manutencao"}
                    </span>
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-lg font-bold text-slate-800">{room.name}</h3>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {room.amenities.map((a, i) => (
                      <span key={i} className="text-[10px] font-semibold uppercase bg-slate-100 text-slate-600 px-2 py-1 rounded">
                        {a}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-slate-600 flex-1">
                    <div className="flex justify-between border-b border-slate-50 pb-1">
                      <span>Capacidade:</span>
                      <span className="font-semibold">{room.capacity} pax</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-1">
                      <span>Seg-Sex (/h):</span>
                      <span className="font-semibold">
                        {weekdayPrice !== null ? formatCurrency(weekdayPrice) : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sabado (/h):</span>
                      <span className="font-semibold">
                        {saturdayPrice !== null ? formatCurrency(saturdayPrice) : "—"}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenRoomModal(room)}
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-[#184689] border border-slate-200 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Edit className="w-4 h-4" /> Editar Regras e Valores
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

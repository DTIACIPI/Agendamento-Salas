"use client"

import { useMemo, useState } from "react"
import { Plus, Edit, Power, Loader2, MapPin, Users, ImageOff, Search } from "lucide-react"
import { toast } from "sonner"
import type { Room } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"

type StatusFilter = "all" | "active" | "inactive"

interface SalasViewProps {
  rooms: Room[]
  isLoading: boolean
  isSuperAdmin?: boolean
  onOpenRoomModal?: (room: Room | null) => void
  onToggleRoomStatus?: (roomId: string, activate: boolean) => Promise<void>
}

function isRoomActive(room: Room): boolean {
  return room.is_active !== false && room.is_active !== 0
}

function getLowestTurnPrice(pricing: Room["pricing"]): number | null {
  if (!pricing) return null
  const prices = [
    pricing.weekdays?.morning?.base,
    pricing.weekdays?.afternoon?.base,
    pricing.weekdays?.night?.base,
    pricing.weekends?.morning?.base,
    pricing.weekends?.afternoon?.base,
    pricing.weekends?.night?.base,
  ].filter((p): p is number => typeof p === "number" && p > 0)
  return prices.length > 0 ? Math.min(...prices) : null
}

export function SalasView({ rooms, isLoading, isSuperAdmin, onOpenRoomModal, onToggleRoomStatus }: SalasViewProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active")
  const [confirmToggleId, setConfirmToggleId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = rooms

    if (statusFilter === "active") list = list.filter(isRoomActive)
    else if (statusFilter === "inactive") list = list.filter((r) => !isRoomActive(r))

    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.floor ?? "").toLowerCase().includes(q) ||
          (r.amenities ?? []).some((a) => a.toLowerCase().includes(q)),
      )
    }

    return list
  }, [rooms, search, statusFilter])

  const counts = useMemo(() => ({
    all: rooms.length,
    active: rooms.filter(isRoomActive).length,
    inactive: rooms.filter((r) => !isRoomActive(r)).length,
  }), [rooms])

  const handleToggleStatus = async (room: Room) => {
    const activate = !isRoomActive(room)
    setTogglingId(room.id)
    try {
      await onToggleRoomStatus?.(room.id, activate)
      toast.success(activate ? "Sala ativada com sucesso!" : "Sala desativada com sucesso!")
    } catch {
      toast.error(activate ? "Erro ao ativar sala" : "Erro ao desativar sala")
    } finally {
      setTogglingId(null)
      setConfirmToggleId(null)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestao de Espacos</h1>
          <p className="text-slate-500 text-sm">Controle as regras, precos e infraestrutura das salas.</p>
        </div>
        {onOpenRoomModal && (
          <button
            onClick={() => onOpenRoomModal(null)}
            className="flex items-center gap-2 bg-[#184689] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#113262] font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" /> Adicionar Sala
          </button>
        )}
      </div>

      {/* Filtros + Busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {([
            { key: "active", label: "Ativas", count: counts.active },
            { key: "inactive", label: "Inativas", count: counts.inactive },
            { key: "all", label: "Todas", count: counts.all },
          ] as { key: StatusFilter; label: string; count: number }[]).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === key
                  ? "bg-[#184689] text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label} <span className={`ml-1 ${statusFilter === key ? "text-white/70" : "text-slate-400"}`}>({count})</span>
            </button>
          ))}
        </div>

        <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm px-4 py-2 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, andar ou comodidade..."
            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400"
          />
        </div>
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
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500">
          {rooms.length === 0 ? "Nenhuma sala cadastrada." : "Nenhuma sala encontrada com os filtros atuais."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((room) => {
            const isActive = isRoomActive(room)
            const coverImage = room.images?.[0] ?? room.image ?? null
            const lowestPrice = getLowestTurnPrice(room.pricing)

            return (
              <div
                key={room.id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col ${
                  isActive ? "border-slate-200" : "border-slate-200 opacity-70"
                }`}
              >
                <div className="h-40 bg-slate-200 relative group">
                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt={room.name}
                      className={`w-full h-full object-cover ${!isActive ? "grayscale" : ""}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <ImageOff className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex gap-2">
                    {isActive ? (
                      <span className="px-2.5 py-1 text-xs font-bold rounded text-white bg-emerald-500">
                        Ativa
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-xs font-bold rounded text-white bg-slate-500">
                        Desativada
                      </span>
                    )}
                  </div>
                  {room.floor && (
                    <div className="absolute top-3 right-3">
                      <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded bg-white/90 text-slate-700 shadow-sm backdrop-blur-sm">
                        <MapPin className="w-3 h-3" /> {room.floor}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-800">{room.name}</h3>
                    {!isActive && (
                      <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-red-100 text-red-700 border border-red-200">
                        Inativa
                      </span>
                    )}
                  </div>

                  {room.amenities && room.amenities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {room.amenities.map((a, i) => (
                        <span key={i} className="text-[10px] font-semibold uppercase bg-slate-100 text-slate-600 px-2 py-1 rounded">
                          {a}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 space-y-2 text-sm text-slate-600 flex-1">
                    <div className="flex justify-between border-b border-slate-50 pb-1">
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Capacidade:</span>
                      <span className="font-semibold">{room.capacity} pax</span>
                    </div>

                    {isSuperAdmin && lowestPrice !== null && (
                      <div className="flex justify-between border-b border-slate-50 pb-1">
                        <span>Turno:</span>
                        <span className="font-semibold text-emerald-600">
                          A partir de {formatCurrency(lowestPrice)}
                        </span>
                      </div>
                    )}

                    {isSuperAdmin && room.pricing?.assembly?.allowed && (
                      <div className="flex justify-between">
                        <span>Montagem:</span>
                        <span className="font-semibold text-amber-600">Permitida</span>
                      </div>
                    )}
                  </div>

                  {(onOpenRoomModal || onToggleRoomStatus) && (
                    <div className="mt-4 flex gap-2">
                      {isActive && onOpenRoomModal && (
                        <button
                          onClick={() => onOpenRoomModal(room)}
                          className="flex-1 flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-[#184689] border border-slate-200 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Edit className="w-4 h-4" /> Editar
                        </button>
                      )}

                      {onToggleRoomStatus && (confirmToggleId === room.id ? (
                        <div className="flex-1 flex flex-col gap-2">
                          <p className="text-xs text-center font-medium text-slate-600">
                            {isActive ? "Tem a certeza que deseja desativar esta sala?" : "Reativar esta sala?"}
                          </p>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleToggleStatus(room)}
                              disabled={togglingId === room.id}
                              className={`flex-1 flex items-center justify-center gap-1 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                                isActive
                                  ? "bg-slate-600 hover:bg-slate-700"
                                  : "bg-emerald-600 hover:bg-emerald-700"
                              }`}
                            >
                              {togglingId === room.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                "Confirmar"
                              )}
                            </button>
                            <button
                              onClick={() => setConfirmToggleId(null)}
                              className="px-3 py-2 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                            >
                              Nao
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmToggleId(room.id)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 border rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? "bg-slate-50 hover:bg-amber-50 text-slate-500 hover:text-amber-600 border-slate-200 hover:border-amber-200"
                              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 border-emerald-200"
                          }`}
                          title={isActive ? "Desativar sala" : "Ativar sala"}
                        >
                          <Power className="w-4 h-4" />
                          {isActive ? "Desativar" : "Ativar"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

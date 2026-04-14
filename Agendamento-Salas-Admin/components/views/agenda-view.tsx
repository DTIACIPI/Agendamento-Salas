"use client"

import { useMemo } from "react"
import type { Room, SystemSettings } from "@/lib/types"
import { generateAgendaSlots } from "@/lib/utils"

interface AgendaViewProps {
  rooms: Room[]
  systemSettings: SystemSettings
  isSettingsLoading: boolean
}

export function AgendaView({ rooms, systemSettings, isSettingsLoading }: AgendaViewProps) {
  const timeSlots = useMemo(
    () => generateAgendaSlots(systemSettings.open_time, systemSettings.close_time, 2),
    [systemSettings.open_time, systemSettings.close_time]
  )

  // Data atual usada apenas no cabeçalho informativo
  const todayLabel = useMemo(() => {
    const d = new Date()
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
  }, [])

  const isSunday = new Date().getDay() === 0
  const blockedBySunday = systemSettings.block_sundays && isSunday

  return (
    <div className="space-y-4 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Agenda Central</h1>
          <p className="text-slate-500 text-sm">Visao de ocupacao diaria ({todayLabel})</p>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
          <button className="px-3 py-1.5 bg-white shadow-sm rounded text-sm font-medium text-slate-800">Dia</button>
          <button className="px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">Semana</button>
        </div>
      </div>

      {isSettingsLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex-1 flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <div className="size-8 border-2 border-[#184689] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Carregando regras do sistema...</span>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex-1 overflow-x-auto relative">
          {blockedBySunday && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800">
              Domingos estão bloqueados nas regras globais — nenhuma locação permitida hoje.
            </div>
          )}

          <div className="min-w-[800px]">
            {/* Header */}
            <div className="flex border-b border-slate-200 bg-slate-50">
              <div className="w-48 shrink-0 border-r border-slate-200 p-4 font-bold text-slate-600 text-sm">Salas</div>
              <div
                className="flex-1 grid divide-x divide-slate-200"
                style={{ gridTemplateColumns: `repeat(${timeSlots.length}, minmax(0, 1fr))` }}
              >
                {timeSlots.map((h) => (
                  <div key={h} className="p-2 text-xs font-semibold text-slate-400 text-center">{h}</div>
                ))}
              </div>
            </div>

            {/* Room rows */}
            {rooms.map((r) => (
              <div key={r.id} className="flex border-b border-slate-100 group hover:bg-slate-50">
                <div className="w-48 shrink-0 border-r border-slate-200 p-4 flex flex-col justify-center">
                  <span className="font-bold text-sm text-slate-800 leading-tight">{r.name}</span>
                  <span className="text-xs text-slate-500">{r.capacity} pax</span>
                </div>
                <div className="flex-1 relative h-16">
                  {/* Mock events */}
                  {r.id === "1" && (
                    <div className="absolute top-2 bottom-2 left-[0%] w-[70%] bg-amber-100 border border-amber-300 rounded p-2 overflow-hidden hover:ring-2 ring-amber-400 cursor-pointer">
                      <p className="text-xs font-bold text-amber-800">Unimed Piracicaba (Pendente)</p>
                      <p className="text-[10px] text-amber-700">08:00 - 18:00</p>
                    </div>
                  )}
                  {r.id === "3" && (
                    <div className="absolute top-2 bottom-2 left-[45%] w-[15%] bg-emerald-100 border border-emerald-300 rounded p-2 overflow-hidden hover:ring-2 ring-emerald-400 cursor-pointer">
                      <p className="text-xs font-bold text-emerald-800 truncate">Drogal</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

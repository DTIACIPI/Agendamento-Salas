"use client"

import type { Room } from "@/lib/types"

interface AgendaViewProps {
  rooms: Room[]
}

const timeSlots = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"]

export function AgendaView({ rooms }: AgendaViewProps) {
  return (
    <div className="space-y-4 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Agenda Central</h1>
          <p className="text-slate-500 text-sm">Visao de ocupacao diaria (15 de Abril de 2026)</p>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
          <button className="px-3 py-1.5 bg-white shadow-sm rounded text-sm font-medium text-slate-800">Dia</button>
          <button className="px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">Semana</button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex-1 overflow-x-auto relative">
        <div className="min-w-[800px]">
          {/* Header */}
          <div className="flex border-b border-slate-200 bg-slate-50">
            <div className="w-48 shrink-0 border-r border-slate-200 p-4 font-bold text-slate-600 text-sm">Salas</div>
            <div className="flex-1 grid grid-cols-8 divide-x divide-slate-200">
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
                {r.id === 1 && (
                  <div className="absolute top-2 bottom-2 left-[0%] w-[70%] bg-amber-100 border border-amber-300 rounded p-2 overflow-hidden hover:ring-2 ring-amber-400 cursor-pointer">
                    <p className="text-xs font-bold text-amber-800">Unimed Piracicaba (Pendente)</p>
                    <p className="text-[10px] text-amber-700">08:00 - 18:00</p>
                  </div>
                )}
                {r.id === 3 && (
                  <div className="absolute top-2 bottom-2 left-[45%] w-[15%] bg-emerald-100 border border-emerald-300 rounded p-2 overflow-hidden hover:ring-2 ring-emerald-400 cursor-pointer">
                    <p className="text-xs font-bold text-emerald-800 truncate">Drogal</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

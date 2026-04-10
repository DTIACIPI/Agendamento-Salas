"use client"

import { Filter } from "lucide-react"
import { StatusBadge } from "@/components/shared/status-badge"
import type { Booking } from "@/lib/types"

interface ReservasViewProps {
  bookings: Booking[]
  onOpenDossier: (booking: Booking) => void
}

export function ReservasView({ bookings, onOpenDossier }: ReservasViewProps) {
  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestao de Reservas</h1>
          <p className="text-slate-500 text-sm mt-1">Aprove, edite ou rejeite solicitacoes de reserva.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm hover:bg-slate-50">
            <Filter className="w-4 h-4" /> Filtros
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-xs">
              <th className="px-6 py-4">ID / Empresa</th>
              <th className="px-6 py-4">Sala</th>
              <th className="px-6 py-4">Data/Horario</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Acao</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {bookings.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800">{b.company}</div>
                  <div className="text-slate-500 text-xs">{b.id}</div>
                </td>
                <td className="px-6 py-4 text-slate-600">{b.room}</td>
                <td className="px-6 py-4 text-slate-600">
                  <div className="font-medium">{b.date}</div>
                  <div className="text-xs">{b.time}</div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={b.status} />
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => onOpenDossier(b)}
                    className="text-[#184689] font-medium hover:underline bg-blue-50 px-3 py-1 rounded-md"
                  >
                    Abrir Dossie
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

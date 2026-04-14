"use client"

import { Filter } from "lucide-react"
import { StatusBadge } from "@/components/shared/status-badge"
import type { BookingListItem } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"

interface ReservasViewProps {
  bookings: BookingListItem[]
  isLoading: boolean
  onOpenDossier: (bookingId: string) => void
}

function formatEventDate(raw: string | null): string {
  if (!raw) return "—"
  const d = new Date(raw)
  if (isNaN(d.getTime())) return raw
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function formatAmount(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value
  if (!isFinite(n)) return "—"
  return formatCurrency(n)
}

export function ReservasView({ bookings, isLoading, onOpenDossier }: ReservasViewProps) {
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
              <th className="px-6 py-4">Evento</th>
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4">Valor</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Acao</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4"><div className="h-4 w-40 bg-slate-100 rounded animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-48 bg-slate-100 rounded animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-100 rounded animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="h-5 w-24 bg-slate-100 rounded-full animate-pulse" /></td>
                  <td className="px-6 py-4 text-right"><div className="h-7 w-24 bg-slate-100 rounded animate-pulse ml-auto" /></td>
                </tr>
              ))
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  Nenhuma reserva encontrada.
                </td>
              </tr>
            ) : (
              bookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{b.company_name}</div>
                    <div className="text-slate-500 text-xs">{b.id}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{b.event_name}</td>
                  <td className="px-6 py-4 text-slate-600">{formatEventDate(b.event_date)}</td>
                  <td className="px-6 py-4 text-slate-700 font-semibold">{formatAmount(b.total_amount)}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => onOpenDossier(b.id)}
                      className="text-[#184689] font-medium hover:underline bg-blue-50 px-3 py-1 rounded-md"
                    >
                      Abrir Dossie
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

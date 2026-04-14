"use client"

import { useState } from "react"
import { Filter, ChevronLeft, ChevronRight, Search } from "lucide-react"
import { StatusBadge } from "@/components/shared/status-badge"
import type { BookingListItem, BookingStatus } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"

interface ReservasViewProps {
  bookings: BookingListItem[]
  isLoading: boolean
  total: number
  page: number
  perPage: number
  onPageChange: (page: number) => void
  onOpenDossier: (bookingId: string) => void
}

const STATUS_OPTIONS: { label: string; value: BookingStatus | "all" }[] = [
  { label: "Todos", value: "all" },
  { label: "Pre-reserva", value: "Pre-reserva" },
  { label: "Confirmada", value: "Confirmada" },
  { label: "Cancelada", value: "Cancelada" },
  { label: "Pendente", value: "Pendente" },
]

function formatEventDate(raw: string | null): string {
  if (!raw) return "\u2014"
  const d = new Date(raw.includes(" ") ? raw.replace(" ", "T") : raw)
  if (isNaN(d.getTime())) return raw
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function formatAmount(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value
  if (!isFinite(n)) return "\u2014"
  return formatCurrency(n)
}

export function ReservasView({
  bookings,
  isLoading,
  total,
  page,
  perPage,
  onPageChange,
  onOpenDossier,
}: ReservasViewProps) {
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  // Filtro local (sobre a página atual retornada pela API)
  const filtered = bookings.filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchName = b.event_name?.toLowerCase().includes(q)
      const matchCompany = b.company_name?.toLowerCase().includes(q)
      const matchId = b.id?.toLowerCase().includes(q)
      if (!matchName && !matchCompany && !matchId) return false
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(total / perPage))

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestao de Reservas</h1>
          <p className="text-slate-500 text-sm mt-1">
            Aprove, edite ou rejeite solicitacoes de reserva.
            {total > 0 && (
              <span className="ml-2 text-slate-400">({total} reservas)</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 border px-3 py-2 rounded-lg text-sm transition-colors ${
              showFilters || statusFilter !== "all" || searchQuery
                ? "bg-[#184689] text-white border-[#184689]"
                : "bg-white border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Filter className="w-4 h-4" /> Filtros
          </button>
        </div>
      </div>

      {/* Painel de filtros */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 uppercase mb-1.5">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Nome do evento, empresa ou ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase mb-1.5">Status</label>
            <div className="flex gap-1.5 flex-wrap">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                    statusFilter === opt.value
                      ? "bg-[#184689] text-white border-[#184689]"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
              Array.from({ length: perPage }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4"><div className="h-4 w-40 bg-slate-100 rounded animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-48 bg-slate-100 rounded animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-100 rounded animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="h-5 w-24 bg-slate-100 rounded-full animate-pulse" /></td>
                  <td className="px-6 py-4 text-right"><div className="h-7 w-24 bg-slate-100 rounded animate-pulse ml-auto" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  Nenhuma reserva encontrada.
                </td>
              </tr>
            ) : (
              filtered.map((b) => (
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

        {/* Paginacao */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50">
            <p className="text-sm text-slate-500">
              Pagina {page} de {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("ellipsis")
                  acc.push(p)
                  return acc
                }, [])
                .map((item, idx) =>
                  item === "ellipsis" ? (
                    <span key={`e${idx}`} className="px-1 text-slate-400">...</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => onPageChange(item)}
                      className={`w-8 h-8 text-sm rounded-lg border transition-colors ${
                        item === page
                          ? "bg-[#184689] text-white border-[#184689]"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {item}
                    </button>
                  ),
                )}
              <button
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

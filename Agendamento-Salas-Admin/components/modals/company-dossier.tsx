"use client"

import { useState, useEffect, useCallback } from "react"
import {
  X, Building2, CalendarRange, Loader2, Pencil, Save, XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { StatusBadge } from "@/components/shared/status-badge"
import { API_BASE_URL, formatCurrency } from "@/lib/utils"
import { authFetch } from "@/lib/auth/auth-fetch"
import type { Company, CompanyBooking } from "@/lib/types"

interface CompanyDossierProps {
  companyId: string | null
  companies: Company[]
  onClose: () => void
  onCompanyUpdated: () => void
  onOpenBooking?: (bookingId: string) => void
}

/* ---- Mask helpers ---- */

function maskCnpj(v: string): string {
  const d = v.replace(/\D/g, "")
  if (d.length !== 14) return v
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
}

function maskCep(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8)
  if (d.length <= 5) return d
  return d.replace(/^(\d{5})(\d{0,3})/, "$1-$2")
}

function formatDate(raw: string | null): string {
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

export function CompanyDossier({ companyId, companies, onClose, onCompanyUpdated, onOpenBooking }: CompanyDossierProps) {
  // Edit state
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState({ razao_social: "", inscricao_estadual: "", cep: "", endereco: "" })
  const [isSaving, setIsSaving] = useState(false)

  // Bookings history
  const [bookings, setBookings] = useState<CompanyBooking[]>([])
  const [isBookingsLoading, setIsBookingsLoading] = useState(false)

  const company = companies.find((c) => c.id === companyId) ?? null

  const fetchBookings = useCallback(async (id: string, signal?: AbortSignal) => {
    setIsBookingsLoading(true)
    try {
      const res = await authFetch(`${API_BASE_URL}/webhook/523d40e7-a7e8-476e-9ee1-2a0ecffe2738/api/companies/${id}/bookings`, {
        cache: "no-store",
        signal,
      })
      if (!res.ok) throw new Error("Falha ao buscar historico")
      const text = await res.text()
      if (!text) { setBookings([]); return }
      const data = JSON.parse(text)
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : data?.data ? [data.data] : []
      setBookings(list)
    } catch (error) {
      if ((error as Error).name === "AbortError") return
      console.error("Erro ao carregar historico:", error)
    } finally {
      setIsBookingsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!companyId) {
      setIsEditing(false)
      setBookings([])
      return
    }
    const controller = new AbortController()
    fetchBookings(companyId, controller.signal)
    return () => controller.abort()
  }, [companyId, fetchBookings])

  const startEditing = () => {
    if (!company) return
    setDraft({
      razao_social: company.razao_social,
      inscricao_estadual: company.inscricao_estadual || "",
      cep: maskCep(company.cep || ""),
      endereco: company.endereco || "",
    })
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!companyId) return
    setIsSaving(true)
    try {
      const res = await authFetch(`${API_BASE_URL}/webhook/b40fd427-347c-42bf-a144-12010a448bb3/api/companies/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razao_social: draft.razao_social,
          inscricao_estadual: draft.inscricao_estadual || null,
          cep: draft.cep.replace(/\D/g, "") || null,
          endereco: draft.endereco || null,
        }),
      })
      if (!res.ok) throw new Error("Falha ao salvar")
      toast.success("Empresa atualizada com sucesso!")
      setIsEditing(false)
      onCompanyUpdated()
    } catch (error) {
      console.error("Erro ao salvar empresa:", error)
      toast.error("Erro ao salvar alteracoes da empresa")
    } finally {
      setIsSaving(false)
    }
  }

  if (!companyId) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl relative z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between bg-slate-50 items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Detalhes da Empresa</h2>
            {company && <p className="text-sm text-slate-500 font-mono">{maskCnpj(company.cnpj)}</p>}
          </div>
          <div className="flex items-center gap-2">
            {company && !isEditing && (
              <button
                onClick={startEditing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#184689] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Editar
              </button>
            )}
            {isEditing && (
              <>
                <button
                  onClick={cancelEditing}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" /> Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !draft.razao_social.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Salvar
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200"
            >
              <X />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          {!company ? (
            <div className="flex items-center justify-center h-40 text-slate-400">
              Empresa nao encontrada.
            </div>
          ) : (
            <>
              {/* Secao A: Dados Cadastrais */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-slate-500" />
                  <h3 className="font-bold text-slate-800">Dados Cadastrais</h3>
                </div>
                <div className="p-4 grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  {/* CNPJ sempre readonly */}
                  <div>
                    <span className="block text-xs font-medium text-slate-400 uppercase mb-1">CNPJ</span>
                    <span className="text-slate-700 font-mono">{maskCnpj(company.cnpj)}</span>
                  </div>

                  {/* Inscricao Estadual */}
                  <div>
                    <span className="block text-xs font-medium text-slate-400 uppercase mb-1">Inscricao Estadual</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={draft.inscricao_estadual}
                        onChange={(e) => setDraft((d) => ({ ...d, inscricao_estadual: e.target.value }))}
                        placeholder="Isento"
                        className="w-full px-3 py-1.5 text-sm border border-blue-200 bg-blue-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-blue-300"
                      />
                    ) : (
                      <span className="text-slate-700">{company.inscricao_estadual || "Isento"}</span>
                    )}
                  </div>

                  {/* Razao Social */}
                  <div className="col-span-2">
                    <span className="block text-xs font-medium text-slate-400 uppercase mb-1">Razao Social</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={draft.razao_social}
                        onChange={(e) => setDraft((d) => ({ ...d, razao_social: e.target.value }))}
                        className="w-full px-3 py-1.5 text-sm border border-blue-200 bg-blue-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 font-semibold text-slate-800"
                      />
                    ) : (
                      <span className="font-semibold text-slate-800">{company.razao_social}</span>
                    )}
                  </div>

                  {/* CEP */}
                  <div>
                    <span className="block text-xs font-medium text-slate-400 uppercase mb-1">CEP</span>
                    {isEditing ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={draft.cep}
                        onChange={(e) => setDraft((d) => ({ ...d, cep: maskCep(e.target.value) }))}
                        placeholder="00000-000"
                        maxLength={9}
                        className="w-full px-3 py-1.5 text-sm border border-blue-200 bg-blue-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-blue-300"
                      />
                    ) : (
                      <span className="text-slate-700">{company.cep ? maskCep(company.cep) : "\u2014"}</span>
                    )}
                  </div>

                  {/* Endereco */}
                  <div>
                    <span className="block text-xs font-medium text-slate-400 uppercase mb-1">Endereco</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={draft.endereco}
                        onChange={(e) => setDraft((d) => ({ ...d, endereco: e.target.value }))}
                        placeholder="Rua, Avenida..."
                        className="w-full px-3 py-1.5 text-sm border border-blue-200 bg-blue-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-blue-300"
                      />
                    ) : (
                      <span className="text-slate-700">{company.endereco || "\u2014"}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Secao B: Historico de Reservas */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                  <CalendarRange className="w-5 h-5 text-slate-500" />
                  <h3 className="font-bold text-slate-800">Historico de Locacoes</h3>
                  {!isBookingsLoading && bookings.length > 0 && (
                    <span className="ml-auto text-xs font-medium text-slate-400">{bookings.length} locacoes</span>
                  )}
                </div>

                {isBookingsLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4 animate-pulse">
                        <div className="h-4 w-40 bg-slate-100 rounded" />
                        <div className="h-4 w-24 bg-slate-100 rounded" />
                        <div className="h-4 w-20 bg-slate-100 rounded ml-auto" />
                      </div>
                    ))}
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="p-8 text-center">
                    <CalendarRange className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                    <p className="text-slate-400 text-sm">Esta empresa ainda nao realizou locacoes.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {bookings.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => {
                          if (onOpenBooking) {
                            onClose()
                            onOpenBooking(b.id)
                          }
                        }}
                        className="w-full px-4 py-3 flex items-center gap-4 hover:bg-blue-50 transition-colors cursor-pointer text-left group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 truncate group-hover:text-[#184689]">{b.event_name}</p>
                          <p className="text-xs text-slate-500">
                            {formatDate(b.event_date)}
                            {b.payment_method && <span className="ml-2 capitalize">{b.payment_method}</span>}
                          </p>
                        </div>
                        <StatusBadge status={b.status} />
                        <span className="text-sm font-bold text-slate-700 whitespace-nowrap">
                          {formatAmount(b.total_amount)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white shrink-0">
          <button
            className="w-full py-2.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg font-medium text-sm hover:bg-slate-200 transition-colors"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

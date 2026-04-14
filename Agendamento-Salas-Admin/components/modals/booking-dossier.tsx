"use client"

import { useState, useEffect, useCallback } from "react"
import {
  X, Building2, Users, Calendar as CalIcon, Loader2, DollarSign, Pencil, Save, XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { StatusBadge } from "@/components/shared/status-badge"
import { API_BASE_URL } from "@/lib/utils"
import type { BookingDetail } from "@/lib/types"

const DETAIL_BASE = `${API_BASE_URL}/webhook/details-booking-webhook/api/bookings`
const EDIT_BASE = `${API_BASE_URL}/webhook/edit-booking-dossier-webhook/api/bookings`

interface BookingDossierProps {
  bookingId: string | null
  onClose: () => void
  onStatusChanged: () => void
}

export function BookingDossier({ bookingId, onClose, onStatusChanged }: BookingDossierProps) {
  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [statusAction, setStatusAction] = useState<"approve" | "reject" | null>(null)

  // Edit mode
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<BookingDetail | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const fetchBookingDetail = useCallback(async (id: string, signal?: AbortSignal) => {
    setIsLoading(true)
    try {
      const res = await fetch(`${DETAIL_BASE}/${id}`, {
        cache: "no-store",
        signal,
      })
      if (!res.ok) throw new Error("Falha ao buscar detalhes da reserva")
      const data = await res.json()
      const detail = Array.isArray(data) ? data[0] : data
      if (detail?.id) {
        setBooking(detail as BookingDetail)
      } else {
        toast.error("Resposta inesperada da API de detalhes")
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return
      console.error("Erro ao carregar detalhes da reserva:", error)
      toast.error("Erro ao carregar detalhes da reserva")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!bookingId) {
      setBooking(null)
      setIsEditing(false)
      setDraft(null)
      return
    }
    const controller = new AbortController()
    fetchBookingDetail(bookingId, controller.signal)
    return () => controller.abort()
  }, [bookingId, fetchBookingDetail])

  const startEditing = () => {
    if (!booking) return
    setDraft({ ...booking })
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setDraft(null)
  }

  const updateDraft = (field: keyof BookingDetail, value: string | number | null) => {
    setDraft((prev) => prev ? { ...prev, [field]: value } : prev)
  }

  const handleSave = async () => {
    if (!draft || !bookingId) return
    setIsSaving(true)
    try {
      const res = await fetch(`${EDIT_BASE}/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyData: {
            razaoSocial: draft.razao_social,
            ie: draft.inscricao_estadual || "",
            cep: draft.cep || "",
            endereco: draft.endereco || "",
          },
          responsavelData: {
            nome: draft.user_name,
            email: draft.user_email,
            telefone: draft.user_phone || "",
            cargo: "",
          },
          eventoData: {
            nome: draft.event_name,
            finalidade: draft.event_purpose || "",
            participantes: draft.estimated_attendees,
            responsavelDia: draft.onsite_contact_name || "",
            contatoDia: draft.onsite_contact_phone || "",
            pagamento: draft.payment_method || "",
            valorTotal: parseFloat(draft.total_amount) || 0,
            status: draft.status,
          },
        }),
      })
      if (!res.ok) throw new Error("Falha ao salvar alteracoes")
      toast.success("Reserva atualizada com sucesso!")
      setBooking(draft)
      setIsEditing(false)
      setDraft(null)
      onStatusChanged()
    } catch (error) {
      console.error("Erro ao salvar alteracoes:", error)
      toast.error("Erro ao salvar alteracoes da reserva")
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusChange = async (newStatus: "Confirmada" | "Cancelada") => {
    if (!bookingId) return
    const action = newStatus === "Confirmada" ? "approve" : "reject"
    setStatusAction(action)
    try {
      const res = await fetch(`${API_BASE_URL}/webhook/api/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error("Falha ao atualizar status")
      toast.success(newStatus === "Confirmada" ? "Reserva aprovada!" : "Reserva rejeitada.")
      onStatusChanged()
      onClose()
    } catch (error) {
      console.error("Erro ao atualizar status:", error)
      toast.error("Erro ao atualizar status da reserva")
    } finally {
      setStatusAction(null)
    }
  }

  if (!bookingId) return null

  const current = isEditing ? draft : booking
  const status = current?.status ?? "Pendente"

  const formatSlots = (slots: BookingDetail["horarios_reservados"]) => {
    if (!slots || slots.length === 0) return "Sem horarios"
    return slots.map((s) => {
      const date = new Date(s.booking_date + "T00:00:00")
      const formatted = date.toLocaleDateString("pt-BR")
      const start = s.start_time?.substring(0, 5) ?? ""
      const end = s.end_time?.substring(0, 5) ?? ""
      return `${formatted} ${start}–${end}`
    }).join(" | ")
  }

  const formatAmount = (value: string | null) => {
    if (!value) return "R$ 0,00"
    const n = parseFloat(value)
    if (!isFinite(n)) return value
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl relative z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between bg-slate-50 items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Dossie de Reserva</h2>
            <p className="text-sm text-slate-500">ID: {bookingId}</p>
          </div>
          <div className="flex items-center gap-2">
            {booking && !isLoading && !isEditing && (
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
                  disabled={isSaving}
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
          {isLoading ? (
            <DossierSkeleton />
          ) : current ? (
            <>
              {/* Status + Valor */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Status da Reserva</p>
                  <StatusBadge status={status} />
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Valor Final</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={draft?.total_amount ?? ""}
                      onChange={(e) => updateDraft("total_amount", e.target.value)}
                      className="text-xl font-black text-[#184689] text-right bg-blue-50 border border-blue-200 rounded px-2 py-1 w-36 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  ) : (
                    <p className="text-2xl font-black text-[#184689] leading-none">
                      {formatAmount(current.total_amount)}
                    </p>
                  )}
                </div>
              </div>

              {/* Dados da Empresa */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-slate-500" />
                  <h3 className="font-bold text-slate-800">Dados da Empresa</h3>
                </div>
                <div className="p-4 grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  <EditableField label="Razao Social" value={current.razao_social} field="razao_social" span2 bold editing={isEditing} onChange={updateDraft} />
                  <EditableField label="CNPJ" value={current.cnpj} field="cnpj" mono editing={isEditing} onChange={updateDraft} />
                  <EditableField label="Inscricao Estadual" value={current.inscricao_estadual || "Isento"} field="inscricao_estadual" editing={isEditing} onChange={updateDraft} />
                  <EditableField label="CEP" value={current.cep || ""} field="cep" editing={isEditing} onChange={updateDraft} />
                  <EditableField label="Endereco" value={current.endereco || ""} field="endereco" span2 editing={isEditing} onChange={updateDraft} />
                </div>
              </div>

              {/* Responsavel */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                  <Users className="w-5 h-5 text-slate-500" />
                  <h3 className="font-bold text-slate-800">Dados do Responsavel</h3>
                </div>
                <div className="p-4 grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  <EditableField label="Nome Completo" value={current.user_name} field="user_name" span2 bold editing={isEditing} onChange={updateDraft} />
                  <EditableField label="E-mail" value={current.user_email} field="user_email" editing={isEditing} onChange={updateDraft} />
                  <EditableField label="Telefone" value={current.user_phone || ""} field="user_phone" editing={isEditing} onChange={updateDraft} />
                </div>
              </div>

              {/* Evento */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                  <CalIcon className="w-5 h-5 text-slate-500" />
                  <h3 className="font-bold text-slate-800">Dados do Evento & Agendamento</h3>
                </div>
                <div className="p-4 grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  <EditableField label="Nome do Evento" value={current.event_name} field="event_name" span2 bold editing={isEditing} onChange={updateDraft} />
                  <EditableField label="Finalidade" value={current.event_purpose || ""} field="event_purpose" span2 editing={isEditing} onChange={updateDraft} />
                  <EditableField label="Participantes" value={current.estimated_attendees ? String(current.estimated_attendees) : ""} field="estimated_attendees" editing={isEditing} onChange={(f, v) => updateDraft(f, v ? Number(v) : null)} />
                  <EditableField label="Forma de Pagamento" value={current.payment_method || ""} field="payment_method" editing={isEditing} onChange={updateDraft} />

                  {/* Horarios — somente leitura */}
                  <div className="col-span-2 bg-blue-50 p-3 rounded border border-blue-100">
                    <span className="block text-xs font-bold text-blue-600 uppercase mb-1">Horarios Reservados</span>
                    <p className="text-blue-900 font-medium">{formatSlots(current.horarios_reservados)}</p>
                  </div>

                  {/* Responsavel no dia */}
                  <EditableField label="Responsavel no dia" value={current.onsite_contact_name || ""} field="onsite_contact_name" editing={isEditing} onChange={updateDraft} />
                  <EditableField label="Contato no dia" value={current.onsite_contact_phone || ""} field="onsite_contact_phone" editing={isEditing} onChange={updateDraft} />
                </div>
              </div>

              {/* Financeiro */}
              {(current.coupon_code || current.coupon_discount_amount) && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-slate-500" />
                    <h3 className="font-bold text-slate-800">Cupom & Descontos</h3>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                    <Field label="Cupom" value={current.coupon_code || "Nenhum"} />
                    <Field label="Desconto do Cupom" value={formatAmount(current.coupon_discount_amount)} />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400">
              Nenhum detalhe encontrado para esta reserva.
            </div>
          )}
        </div>

        {/* Footer */}
        {current && !isLoading && !isEditing && (
          <div className="p-4 border-t border-slate-200 bg-white shrink-0">
            <div className="grid grid-cols-2 gap-3">
              {status === "Pendente" || status === "Pre-reserva" ? (
                <>
                  <button
                    disabled={statusAction !== null}
                    onClick={() => handleStatusChange("Cancelada")}
                    className="w-full py-2.5 bg-white border border-red-200 text-red-600 rounded-lg font-medium text-sm hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {statusAction === "reject" && <Loader2 className="w-4 h-4 animate-spin" />}
                    Rejeitar
                  </button>
                  <button
                    disabled={statusAction !== null}
                    onClick={() => handleStatusChange("Confirmada")}
                    className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {statusAction === "approve" && <Loader2 className="w-4 h-4 animate-spin" />}
                    Aprovar Reserva
                  </button>
                </>
              ) : (
                <button
                  className="col-span-2 w-full py-2.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg font-medium text-sm hover:bg-slate-200 transition-colors"
                  onClick={onClose}
                >
                  Fechar Dossie
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ---- Field Components ---- */

function Field({ label, value, mono, bold, span2 }: {
  label: string
  value: string
  mono?: boolean
  bold?: boolean
  span2?: boolean
}) {
  return (
    <div className={span2 ? "col-span-2" : ""}>
      <span className="block text-xs font-medium text-slate-400 uppercase mb-1">{label}</span>
      <span className={`${bold ? "font-semibold text-slate-800" : "text-slate-700"} ${mono ? "font-mono" : ""}`}>
        {value || "-"}
      </span>
    </div>
  )
}

function EditableField({ label, value, field, mono, bold, span2, editing, onChange }: {
  label: string
  value: string
  field: keyof BookingDetail
  mono?: boolean
  bold?: boolean
  span2?: boolean
  editing: boolean
  onChange: (field: keyof BookingDetail, value: string) => void
}) {
  if (!editing) {
    return <Field label={label} value={value} mono={mono} bold={bold} span2={span2} />
  }

  return (
    <div className={span2 ? "col-span-2" : ""}>
      <label className="block text-xs font-medium text-slate-400 uppercase mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(field, e.target.value)}
        className={`w-full px-3 py-1.5 text-sm border border-blue-200 bg-blue-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 ${bold ? "font-semibold text-slate-800" : "text-slate-700"} ${mono ? "font-mono" : ""}`}
      />
    </div>
  )
}

function DossierSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-24 bg-slate-200 rounded" />
          <div className="h-6 w-20 bg-slate-200 rounded-full" />
        </div>
        <div className="space-y-2 text-right">
          <div className="h-3 w-20 bg-slate-200 rounded ml-auto" />
          <div className="h-8 w-28 bg-slate-200 rounded ml-auto" />
        </div>
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
            <div className="h-5 w-40 bg-slate-200 rounded" />
          </div>
          <div className="p-4 grid grid-cols-2 gap-4">
            <div className="h-10 bg-slate-100 rounded" />
            <div className="h-10 bg-slate-100 rounded" />
            <div className="h-10 bg-slate-100 rounded col-span-2" />
          </div>
        </div>
      ))}
    </div>
  )
}

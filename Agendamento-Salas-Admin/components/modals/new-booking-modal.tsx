"use client"

import { useState, useEffect, useMemo } from "react"
import {
  X, Loader2, CalendarDays, Building2, Users, DollarSign, Calculator, Tag,
} from "lucide-react"
import { toast } from "sonner"
import { authFetch } from "@/lib/auth/auth-fetch"
import { API_BASE_URL } from "@/lib/utils"
import type { Room, BookingType, NewBookingPayload } from "@/lib/types"

const BOOKING_TYPES: { label: string; value: BookingType }[] = [
  { label: "Locacao Cliente", value: "Locação Cliente" },
  { label: "Cessao", value: "Cessão" },
  { label: "Curso", value: "Curso" },
  { label: "Uso Interno", value: "Uso Interno" },
]

const EXEMPT_TYPES: BookingType[] = ["Cessão", "Uso Interno"]

function generateTimeSlots(start = "08:00", end = "22:00"): string[] {
  const slots: string[] = []
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  let mins = sh * 60 + sm
  const endMins = eh * 60 + em
  while (mins <= endMins) {
    slots.push(`${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`)
    mins += 30
  }
  return slots
}

interface NewBookingModalProps {
  open: boolean
  rooms: Room[]
  onClose: () => void
  onSaved: () => void
}

export function NewBookingModal({ open, rooms, onClose, onSaved }: NewBookingModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Evento
  const [spaceId, setSpaceId] = useState("")
  const [bookingDate, setBookingDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [eventName, setEventName] = useState("")
  const [eventPurpose, setEventPurpose] = useState("")
  const [estimatedAttendees, setEstimatedAttendees] = useState("")

  // Tipo
  const [bookingType, setBookingType] = useState<BookingType>("Locação Cliente")
  const isExempt = EXEMPT_TYPES.includes(bookingType)

  // Empresa
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [cnpj, setCnpj] = useState("")
  const [razaoSocial, setRazaoSocial] = useState("")

  // Financeiro
  const [totalAmount, setTotalAmount] = useState("")
  const [isAutoCalc, setIsAutoCalc] = useState(false)
  const [isCalcLoading, setIsCalcLoading] = useState(false)

  const timeSlots = useMemo(() => generateTimeSlots(), [])

  const endTimeSlots = useMemo(() => {
    if (!startTime) return timeSlots
    return timeSlots.filter((t) => t > startTime)
  }, [startTime, timeSlots])

  const activeRooms = useMemo(() => rooms.filter((r) => r.is_active !== false && r.status !== "Inativa"), [rooms])

  useEffect(() => {
    if (!open) return
    setSpaceId("")
    setBookingDate("")
    setStartTime("")
    setEndTime("")
    setEventName("")
    setEventPurpose("")
    setEstimatedAttendees("")
    setBookingType("Locação Cliente")
    setContactName("")
    setContactEmail("")
    setContactPhone("")
    setCnpj("")
    setRazaoSocial("")
    setTotalAmount("")
    setIsAutoCalc(false)
  }, [open])

  useEffect(() => {
    if (isExempt) {
      setTotalAmount("0,00")
      setIsAutoCalc(false)
    }
  }, [isExempt])

  const handleAutoCalc = async () => {
    if (!spaceId || !bookingDate || !startTime || !endTime) {
      toast.error("Preencha sala, data e horarios para calcular.")
      return
    }
    setIsCalcLoading(true)
    try {
      const res = await authFetch(
        `${API_BASE_URL}/webhook/api/pricing/calculate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            space_id: spaceId,
            booking_date: bookingDate,
            start_time: startTime,
            end_time: endTime,
          }),
        },
      )
      if (!res.ok) throw new Error("Falha no calculo")
      const data = await res.json()
      const val = data?.total ?? data?.total_amount ?? 0
      setTotalAmount(Number(val).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
      setIsAutoCalc(true)
      toast.success("Valor calculado automaticamente!")
    } catch {
      toast.error("Erro ao calcular valor. Insira manualmente.")
    } finally {
      setIsCalcLoading(false)
    }
  }

  const validate = (): string | null => {
    if (!spaceId) return "Selecione uma sala."
    if (!bookingDate) return "Selecione a data."
    if (!startTime || !endTime) return "Selecione horario de inicio e termino."
    if (startTime >= endTime) return "Horario de termino deve ser posterior ao inicio."
    if (!eventName.trim()) return "Informe o nome do evento."
    if (!contactName.trim()) return "Informe o nome do contato."
    if (!contactEmail.trim()) return "Informe o email do contato."
    if (!isExempt && !cnpj.trim()) return "Informe o CNPJ."
    if (!isExempt && !razaoSocial.trim()) return "Informe a Razao Social."
    if (!isExempt && !totalAmount.trim()) return "Informe o valor total."
    return null
  }

  const handleSubmit = async () => {
    const error = validate()
    if (error) { toast.error(error); return }

    setIsSubmitting(true)
    try {
      const parsedAmount = isExempt ? 0 : parseFloat(totalAmount.replace(/\./g, "").replace(",", ".")) || 0

      const payload: NewBookingPayload = {
        booking: {
          space_id: spaceId,
          booking_date: bookingDate,
          start_time: startTime,
          end_time: endTime,
          event_name: eventName.trim(),
          event_purpose: eventPurpose.trim(),
          estimated_attendees: estimatedAttendees ? Number(estimatedAttendees) : null,
          booking_type: bookingType,
          total_amount: parsedAmount,
          onsite_contact_name: contactName.trim(),
          onsite_contact_phone: contactPhone.replace(/\D/g, ""),
        },
        company: isExempt ? null : {
          cnpj: cnpj.replace(/\D/g, ""),
          razao_social: razaoSocial.trim(),
        },
        user: {
          name: contactName.trim(),
          email: contactEmail.trim(),
          phone: contactPhone.replace(/\D/g, ""),
        },
      }

      const res = await authFetch(`${API_BASE_URL}/webhook/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Falha ao criar reserva")
      toast.success("Reserva criada com sucesso!")
      onSaved()
      onClose()
    } catch {
      toast.error("Erro ao criar reserva. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  const inputClass = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
  const labelClass = "block text-xs font-medium text-slate-500 uppercase mb-1.5"
  const sectionHeaderClass = "flex items-center gap-2 text-sm font-bold text-slate-700 mb-3 pb-2 border-b border-slate-100"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Nova Reserva</h2>
            <p className="text-xs text-slate-500">Lancamento manual de reserva</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Tipo de Reserva */}
          <div>
            <div className={sectionHeaderClass}><Tag className="w-4 h-4 text-[#184689]" /> Tipo de Reserva</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BOOKING_TYPES.map((bt) => (
                <button
                  key={bt.value}
                  type="button"
                  onClick={() => setBookingType(bt.value)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    bookingType === bt.value
                      ? "bg-[#184689] text-white border-[#184689]"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {bt.label}
                </button>
              ))}
            </div>
            {isExempt && (
              <p className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Reservas do tipo <strong>{bookingType}</strong> sao isentas de cobranca. CNPJ e Razao Social sao opcionais.
              </p>
            )}
          </div>

          {/* Dados do Evento */}
          <div>
            <div className={sectionHeaderClass}><CalendarDays className="w-4 h-4 text-[#184689]" /> Dados do Evento</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelClass}>Sala *</label>
                <select value={spaceId} onChange={(e) => setSpaceId(e.target.value)} className={inputClass}>
                  <option value="">Selecione uma sala...</option>
                  {activeRooms.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} (Cap. {r.capacity})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Data *</label>
                <input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Inicio *</label>
                  <select value={startTime} onChange={(e) => { setStartTime(e.target.value); if (endTime && e.target.value >= endTime) setEndTime("") }} className={inputClass}>
                    <option value="">--:--</option>
                    {timeSlots.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Termino *</label>
                  <select value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass}>
                    <option value="">--:--</option>
                    {endTimeSlots.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Nome do Evento *</label>
                <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Ex: Reuniao Diretoria" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Proposito</label>
                <input type="text" value={eventPurpose} onChange={(e) => setEventPurpose(e.target.value)} placeholder="Ex: Treinamento" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Participantes</label>
                <input type="text" inputMode="numeric" value={estimatedAttendees} onChange={(e) => setEstimatedAttendees(e.target.value.replace(/\D/g, ""))} placeholder="Ex: 30" className={inputClass} />
              </div>
            </div>
          </div>

          {/* Dados do Cliente/Empresa */}
          <div>
            <div className={sectionHeaderClass}><Building2 className="w-4 h-4 text-[#184689]" /> Dados do Cliente / Empresa</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nome do Contato *</label>
                <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nome completo" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email *</label>
                <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="email@empresa.com" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Telefone</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={contactPhone}
                  onChange={(e) => {
                    const d = e.target.value.replace(/\D/g, "").slice(0, 11)
                    if (d.length <= 2) setContactPhone(d.replace(/^(\d{0,2})/, "($1"))
                    else if (d.length <= 7) setContactPhone(d.replace(/^(\d{2})(\d{0,5})/, "($1) $2"))
                    else setContactPhone(d.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3"))
                  }}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  CNPJ {!isExempt && "*"}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cnpj}
                  disabled={isExempt}
                  onChange={(e) => {
                    const d = e.target.value.replace(/\D/g, "").slice(0, 14)
                    if (d.length <= 2) setCnpj(d)
                    else if (d.length <= 5) setCnpj(d.replace(/^(\d{2})(\d{0,3})/, "$1.$2"))
                    else if (d.length <= 8) setCnpj(d.replace(/^(\d{2})(\d{3})(\d{0,3})/, "$1.$2.$3"))
                    else if (d.length <= 12) setCnpj(d.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, "$1.$2.$3/$4"))
                    else setCnpj(d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, "$1.$2.$3/$4-$5"))
                  }}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  className={`${inputClass} ${isExempt ? "bg-slate-100 text-slate-400 cursor-not-allowed" : ""}`}
                />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>
                  Razao Social {!isExempt && "*"}
                </label>
                <input
                  type="text"
                  value={razaoSocial}
                  disabled={isExempt}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  placeholder="Razao Social da empresa"
                  className={`${inputClass} ${isExempt ? "bg-slate-100 text-slate-400 cursor-not-allowed" : ""}`}
                />
              </div>
            </div>
          </div>

          {/* Financeiro */}
          <div>
            <div className={sectionHeaderClass}><DollarSign className="w-4 h-4 text-[#184689]" /> Financeiro</div>
            <div className="grid grid-cols-2 gap-4 items-end">
              <div>
                <label className={labelClass}>Valor Total (R$) {!isExempt && "*"}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={totalAmount}
                    disabled={isExempt}
                    onChange={(e) => {
                      setIsAutoCalc(false)
                      const d = e.target.value.replace(/[^\d,]/g, "")
                      setTotalAmount(d)
                    }}
                    placeholder="0,00"
                    className={`${inputClass} pl-10 ${isExempt ? "bg-slate-100 text-slate-400 cursor-not-allowed" : ""}`}
                  />
                </div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleAutoCalc}
                  disabled={isExempt || isCalcLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-blue-50 text-[#184689] border-blue-200 hover:bg-blue-100"
                >
                  {isCalcLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                  Calcular Automatico
                </button>
                {isAutoCalc && (
                  <p className="text-[10px] text-emerald-600 mt-1">Valor calculado pela API</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 text-sm font-medium text-white bg-[#184689] rounded-lg hover:bg-[#12356b] transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Criar Reserva
          </button>
        </div>
      </div>
    </div>
  )
}

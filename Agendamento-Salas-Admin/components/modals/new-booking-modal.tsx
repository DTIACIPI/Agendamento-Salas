"use client"

import { useState, useEffect, useMemo } from "react"
import {
  X, Loader2, CalendarDays, Building2, Users, DollarSign, Calculator, Tag,
} from "lucide-react"
import { toast } from "sonner"
import { authFetch } from "@/lib/auth/auth-fetch"
import { API_BASE_URL, calculateBookingPrice } from "@/lib/utils"
import type { Room, BookingType, NewBookingPayload } from "@/lib/types"

const BOOKING_TYPES: { label: string; value: BookingType }[] = [
  { label: "Locacao Cliente", value: "Locação Cliente" },
  { label: "Cessao", value: "Cessão" },
  { label: "Curso", value: "Curso" },
  { label: "Uso Interno", value: "Uso Interno" },
]

const EXEMPT_TYPES: BookingType[] = ["Cessão", "Uso Interno", "Curso"]

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

  // Responsável
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")

  // Empresa
  const [cnpj, setCnpj] = useState("")
  const [razaoSocial, setRazaoSocial] = useState("")
  const [inscricaoEstadual, setInscricaoEstadual] = useState("")
  const [cep, setCep] = useState("")
  const [endereco, setEndereco] = useState("")
  const [numero, setNumero] = useState("")
  const [complemento, setComplemento] = useState("")
  const [bairro, setBairro] = useState("")
  const [cidade, setCidade] = useState("")
  const [estado, setEstado] = useState("SP")

  // Financeiro
  const [totalAmount, setTotalAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [isAutoCalc, setIsAutoCalc] = useState(false)

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
    setInscricaoEstadual("")
    setCep("")
    setEndereco("")
    setNumero("")
    setComplemento("")
    setBairro("")
    setCidade("")
    setEstado("SP")
    setTotalAmount("")
    setPaymentMethod("")
    setIsAutoCalc(false)
  }, [open])

  useEffect(() => {
    if (isExempt) {
      setTotalAmount("0,00")
      setIsAutoCalc(false)
    }
  }, [isExempt])

  const handleAutoCalc = () => {
    if (!spaceId || !bookingDate || !startTime || !endTime) {
      toast.error("Preencha sala, data e horarios para calcular.")
      return
    }
    const room = rooms.find((r) => r.id === spaceId)
    if (!room?.pricing) {
      toast.error("Sala sem precificacao cadastrada.")
      return
    }
    const val = calculateBookingPrice(room.pricing, bookingDate, startTime, endTime)
    setTotalAmount(val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    setIsAutoCalc(true)
    toast.success("Valor calculado!")
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
    if (!isExempt && !cep.trim()) return "Informe o CEP."
    if (!isExempt && !endereco.trim()) return "Informe o Endereco."
    if (!isExempt && !numero.trim()) return "Informe o Numero."
    if (!isExempt && !bairro.trim()) return "Informe o Bairro."
    if (!isExempt && !cidade.trim()) return "Informe a Cidade."
    if (!isExempt && !totalAmount.trim()) return "Informe o valor total."
    if (!isExempt && !paymentMethod) return "Selecione o metodo de pagamento."
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
          payment_method: isExempt ? "Isento" : paymentMethod,
          cleaning_buffer: 0,
        },
        company: isExempt ? null : {
          cnpj: cnpj.replace(/\D/g, ""),
          razao_social: razaoSocial.trim(),
          inscricao_estadual: inscricaoEstadual.trim(),
          cep: cep.replace(/\D/g, ""),
          endereco: `${endereco.trim()}, ${numero.trim()}${complemento.trim() ? ` - ${complemento.trim()}` : ""}, ${bairro.trim()}, ${cidade.trim()} - ${estado}`,
        },
        user: {
          name: contactName.trim(),
          email: contactEmail.trim(),
          phone: contactPhone.replace(/\D/g, ""),
          role: "Admin",
        },
      }

      const res = await authFetch(`${API_BASE_URL}/webhook/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
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
                Reservas do tipo <strong>{bookingType}</strong> sao isentas de cobranca e nao exigem dados de empresa.
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

          {/* Responsavel */}
          <div>
            <div className={sectionHeaderClass}><Users className="w-4 h-4 text-[#184689]" /> Responsavel</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nome *</label>
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
            </div>
          </div>

          {/* Dados da Empresa — só para Locação Cliente */}
          {!isExempt && (
            <div>
              <div className={sectionHeaderClass}><Building2 className="w-4 h-4 text-[#184689]" /> Dados da Empresa</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>CNPJ *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cnpj}
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
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Inscricao Estadual</label>
                  <input
                    type="text"
                    value={inscricaoEstadual}
                    onChange={(e) => setInscricaoEstadual(e.target.value)}
                    placeholder="Isento"
                    className={inputClass}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Razao Social *</label>
                  <input
                    type="text"
                    value={razaoSocial}
                    onChange={(e) => setRazaoSocial(e.target.value)}
                    placeholder="Razao Social da empresa"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>CEP *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cep}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, "").slice(0, 8)
                      if (d.length <= 5) setCep(d)
                      else setCep(d.replace(/^(\d{5})(\d{0,3})/, "$1-$2"))
                    }}
                    placeholder="00000-000"
                    maxLength={9}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Endereco *</label>
                  <input type="text" value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, Avenida..." className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Numero *</label>
                  <input type="text" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="123" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Complemento</label>
                  <input type="text" value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Sala, Andar..." className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Bairro *</label>
                  <input type="text" value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Bairro" className={inputClass} />
                </div>
                <div className="grid grid-cols-[1fr_80px] gap-2">
                  <div>
                    <label className={labelClass}>Cidade *</label>
                    <input type="text" value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Cidade" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>UF</label>
                    <select value={estado} onChange={(e) => setEstado(e.target.value)} className={inputClass}>
                      {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map((uf) => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Financeiro — só para Locação Cliente */}
          {!isExempt && (
            <div>
              <div className={sectionHeaderClass}><DollarSign className="w-4 h-4 text-[#184689]" /> Financeiro</div>
              <div className="grid grid-cols-3 gap-4 items-end">
                <div>
                  <label className={labelClass}>Metodo de Pagamento *</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={inputClass}>
                    <option value="">Selecione...</option>
                    <option value="boleto">Boleto Bancario</option>
                    <option value="cartao_credito">Cartao de Credito</option>
                    <option value="pix">PIX</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Valor Total (R$) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">R$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={totalAmount}
                      onChange={(e) => {
                        setIsAutoCalc(false)
                        const d = e.target.value.replace(/[^\d,]/g, "")
                        setTotalAmount(d)
                      }}
                      placeholder="0,00"
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>&nbsp;</label>
                  <button
                    type="button"
                    onClick={handleAutoCalc}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors bg-blue-50 text-[#184689] border-blue-200 hover:bg-blue-100"
                  >
                    <Calculator className="w-4 h-4" />
                    Calcular
                  </button>
                  {isAutoCalc && (
                    <p className="text-[10px] text-emerald-600 mt-1">Valor calculado pela API</p>
                  )}
                </div>
              </div>
            </div>
          )}
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

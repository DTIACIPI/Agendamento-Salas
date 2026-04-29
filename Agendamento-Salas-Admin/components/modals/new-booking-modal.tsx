"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  X, Loader2, CalendarDays, Building2, Users, DollarSign, Calculator,
  Tag, AlertTriangle, CheckCircle2, Clock, MapPin,
} from "lucide-react"
import { toast } from "sonner"
import { authFetch } from "@/lib/auth/auth-fetch"
import { API_BASE_URL, calculateBookingPrice, formatCurrency } from "@/lib/utils"
import {
  generateTimeSlots,
  timeToMinutes,
  isRangeAvailable,
  maskCnpj,
  maskPhone,
  maskCep,
  type OccupiedSlot,
} from "@/lib/booking-helpers"
import type { Room, BookingType, NewBookingPayload } from "@/lib/types"

const BOOKING_TYPES: { label: string; value: BookingType; desc: string }[] = [
  { label: "Locacao Cliente", value: "Locação Cliente", desc: "Evento externo com cobranca" },
  { label: "Cessao", value: "Cessão", desc: "Cessao gratuita do espaco" },
  { label: "Curso", value: "Curso", desc: "Curso ou capacitacao" },
  { label: "Uso Interno", value: "Uso Interno", desc: "Evento institucional" },
]

const EXEMPT_TYPES: BookingType[] = ["Cessão", "Uso Interno", "Curso"]

interface NewBookingModalProps {
  open: boolean
  rooms: Room[]
  onClose: () => void
  onSaved: () => void
}

export function NewBookingModal({ open, rooms, onClose, onSaved }: NewBookingModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [spaceId, setSpaceId] = useState("")
  const [bookingDate, setBookingDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [eventName, setEventName] = useState("")
  const [eventPurpose, setEventPurpose] = useState("")
  const [estimatedAttendees, setEstimatedAttendees] = useState("")

  const [bookingType, setBookingType] = useState<BookingType>("Locação Cliente")
  const isExempt = EXEMPT_TYPES.includes(bookingType)

  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")

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

  const [isCnpjLoading, setIsCnpjLoading] = useState(false)
  const [cnpjFound, setCnpjFound] = useState(false)
  const [lockedFields, setLockedFields] = useState<Set<string>>(new Set())

  const [totalAmount, setTotalAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [isAutoCalc, setIsAutoCalc] = useState(false)

  const [occupiedSlots, setOccupiedSlots] = useState<OccupiedSlot[]>([])
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false)

  const timeSlots = useMemo(() => generateTimeSlots(), [])
  const selectedRoom = useMemo(() => rooms.find((r) => r.id === spaceId), [rooms, spaceId])
  const cleaningBuffer = selectedRoom?.cleaning_buffer ?? 0
  const activeRooms = useMemo(() => rooms.filter((r) => r.is_active !== false && r.is_active !== 0 && r.status !== "Inativa"), [rooms])

  const endTimeSlots = useMemo(() => {
    if (!startTime) return timeSlots
    return timeSlots.filter((t) => t > startTime)
  }, [startTime, timeSlots])

  const rangeConflict = useMemo(() => {
    if (!bookingDate || !startTime || !endTime || occupiedSlots.length === 0) return false
    return !isRangeAvailable(bookingDate, startTime, endTime, occupiedSlots, cleaningBuffer)
  }, [bookingDate, startTime, endTime, occupiedSlots, cleaningBuffer])

  const occupiedSlotsForDate = useMemo(() => {
    if (!bookingDate) return []
    return occupiedSlots.filter((s) => s.date === bookingDate)
  }, [bookingDate, occupiedSlots])

  const durationHours = useMemo(() => {
    if (!startTime || !endTime) return 0
    return (timeToMinutes(endTime) - timeToMinutes(startTime)) / 60
  }, [startTime, endTime])

  useEffect(() => {
    if (!open) return
    setSpaceId(""); setBookingDate(""); setStartTime(""); setEndTime("")
    setEventName(""); setEventPurpose(""); setEstimatedAttendees("")
    setBookingType("Locação Cliente")
    setContactName(""); setContactEmail(""); setContactPhone("")
    setCnpj(""); setRazaoSocial(""); setInscricaoEstadual("")
    setCep(""); setEndereco(""); setNumero(""); setComplemento("")
    setBairro(""); setCidade(""); setEstado("SP")
    setTotalAmount(""); setPaymentMethod(""); setIsAutoCalc(false)
    setOccupiedSlots([]); setCnpjFound(false); setLockedFields(new Set())
  }, [open])

  useEffect(() => {
    if (isExempt) { setTotalAmount("0,00"); setIsAutoCalc(false) }
  }, [isExempt])

  const fetchAvailability = useCallback(async (roomId: string, date: string) => {
    if (!roomId || !date) { setOccupiedSlots([]); return }
    setIsLoadingAvailability(true)
    try {
      const res = await authFetch(`${API_BASE_URL}/webhook/api/availability?space_id=${roomId}&start_date=${date}&end_date=${date}`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      const raw: Record<string, string>[] = Array.isArray(json) ? json : json?.occupied ?? json?.data ?? []
      setOccupiedSlots(raw.map((s) => ({
        date: s.booking_date || s.date || date,
        startTime: s.start_time || s.startTime || "",
        endTime: s.end_time || s.endTime || "",
      })).filter((s) => s.startTime && s.endTime))
    } catch { setOccupiedSlots([]) }
    finally { setIsLoadingAvailability(false) }
  }, [])

  useEffect(() => {
    if (spaceId && bookingDate) { fetchAvailability(spaceId, bookingDate); setStartTime(""); setEndTime("") }
    else setOccupiedSlots([])
  }, [spaceId, bookingDate, fetchAvailability])

  useEffect(() => {
    const clean = cnpj.replace(/\D/g, "")
    if (clean.length !== 14 || isExempt) return
    const timer = setTimeout(async () => {
      setIsCnpjLoading(true)
      try {
        const res = await fetch(`${API_BASE_URL}/webhook/validate-cnpj-webhook/api/companies/validate/${clean}`)
        if (!res.ok) throw new Error()
        const data = await res.json()
        const co = data?.data ?? data
        if (co?.razao_social || co?.razaoSocial) {
          const filled = new Set<string>()
          const rs = co.razao_social || co.razaoSocial || ""
          if (rs) { setRazaoSocial(rs); filled.add("razaoSocial") }
          const ie = co.inscricao_estadual || co.inscricaoEstadual || co.ie || ""
          if (ie) { setInscricaoEstadual(ie); filled.add("inscricaoEstadual") }
          const rawCep = co.cep || ""
          if (rawCep) { setCep(maskCep(rawCep)); filled.add("cep") }
          if (co.endereco) {
            setEndereco(co.endereco); filled.add("endereco")
          } else {
            if (co.logradouro) { setEndereco(co.logradouro); filled.add("endereco") }
            if (co.numero) { setNumero(co.numero); filled.add("numero") }
            if (co.complemento) { setComplemento(co.complemento); filled.add("complemento") }
            if (co.bairro) { setBairro(co.bairro); filled.add("bairro") }
            if (co.cidade || co.municipio) { setCidade(co.cidade || co.municipio); filled.add("cidade") }
            if (co.estado || co.uf) { setEstado(co.estado || co.uf); filled.add("estado") }
          }
          setLockedFields(filled)
          setCnpjFound(true)
          toast.success("Dados da empresa carregados!")
        } else { setCnpjFound(false); setLockedFields(new Set()) }
      } catch { setCnpjFound(false) }
      finally { setIsCnpjLoading(false) }
    }, 500)
    return () => clearTimeout(timer)
  }, [cnpj, isExempt])

  const handleAutoCalc = () => {
    if (!spaceId || !bookingDate || !startTime || !endTime) { toast.error("Preencha sala, data e horarios para calcular."); return }
    if (rangeConflict) { toast.error("Horario conflitante com reserva existente."); return }
    const room = rooms.find((r) => r.id === spaceId)
    if (!room?.pricing) { toast.error("Sala sem precificacao cadastrada."); return }
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
    if (rangeConflict) return "Horario conflitante com reserva existente."
    if (!eventName.trim()) return "Informe o nome do evento."
    if (!contactName.trim()) return "Informe o nome do contato."
    if (!contactEmail.trim()) return "Informe o e-mail do contato."
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
        bookings: [{
          space_id: spaceId,
          booking_type: bookingType,
          total_amount: parsedAmount,
          onsite_contact_name: contactName.trim(),
          onsite_contact_phone: contactPhone.replace(/\D/g, ""),
          payment_method: isExempt ? "Isento" : paymentMethod,
          cleaning_buffer: cleaningBuffer,
          slots: [{
            date: bookingDate,
            startTime: startTime,
            endTime: endTime,
            slot_event_name: eventName.trim(),
            slot_event_purpose: eventPurpose.trim(),
            slot_attendees: estimatedAttendees ? Number(estimatedAttendees) : null,
          }],
        }],
        company: isExempt ? null : {
          cnpj: cnpj.replace(/\D/g, ""), razao_social: razaoSocial.trim(),
          inscricao_estadual: inscricaoEstadual.trim(), cep: cep.replace(/\D/g, ""),
          endereco: `${endereco.trim()}, ${numero.trim()}${complemento.trim() ? ` - ${complemento.trim()}` : ""}, ${bairro.trim()}, ${cidade.trim()} - ${estado}`,
        },
        user: { name: contactName.trim(), email: contactEmail.trim(), phone: contactPhone.replace(/\D/g, ""), role: "Admin" },
      }
      const res = await authFetch(`${API_BASE_URL}/webhook/api/bookings`, {
        method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      toast.success("Reserva criada com sucesso!")
      onSaved(); onClose()
    } catch { toast.error("Erro ao criar reserva. Tente novamente.") }
    finally { setIsSubmitting(false) }
  }

  if (!open) return null

  const inp = "w-full h-10 px-3.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#184689]/20 focus:border-[#184689]/40 bg-white transition-colors placeholder:text-slate-300"
  const inpLocked = "w-full h-10 px-3.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
  const sel = `${inp} appearance-none cursor-pointer`
  const selLocked = "w-full h-10 px-3.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed appearance-none"
  const lbl = "block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1"

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[3vh]">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative z-50 bg-slate-50 rounded-2xl shadow-2xl w-full max-w-[1120px] max-h-[94vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-slate-200/60">

        {/* ── Header ── */}
        <div className="px-8 py-5 border-b border-slate-200 flex items-center justify-between bg-white rounded-t-2xl shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#184689] flex items-center justify-center shadow-sm">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Nova Reserva</h2>
              <p className="text-sm text-slate-400">Lancamento manual pelo administrador</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 space-y-8">

            {/* ─ Tipo de Reserva ─ */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {BOOKING_TYPES.map((bt) => (
                <button
                  key={bt.value}
                  type="button"
                  onClick={() => setBookingType(bt.value)}
                  className={`relative text-left px-4 py-3.5 rounded-xl border-2 transition-all ${
                    bookingType === bt.value
                      ? "bg-[#184689]/5 border-[#184689] ring-1 ring-[#184689]/20"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-bold ${bookingType === bt.value ? "text-[#184689]" : "text-slate-700"}`}>
                      {bt.label}
                    </span>
                    {bookingType === bt.value && (
                      <CheckCircle2 className="w-4 h-4 text-[#184689]" />
                    )}
                  </div>
                  <span className={`text-[11px] leading-tight ${bookingType === bt.value ? "text-[#184689]/60" : "text-slate-400"}`}>
                    {bt.desc}
                  </span>
                </button>
              ))}
            </div>

            {isExempt && (
              <div className="flex items-center gap-3 px-5 py-3.5 bg-amber-50 border border-amber-200/80 rounded-xl">
                <Tag className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-sm text-amber-700">
                  Reservas do tipo <strong>{bookingType}</strong> sao isentas de cobranca e nao exigem dados de empresa.
                </p>
              </div>
            )}

            {/* ─ Seções empilhadas ─ */}
            <div className="space-y-6">

              {/* 1. Sala e Horario */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <MapPin className="w-4.5 h-4.5 text-[#184689]" />
                  <h3 className="text-sm font-bold text-slate-700">Sala e Horario</h3>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className={lbl}>Sala *</label>
                    <select value={spaceId} onChange={(e) => setSpaceId(e.target.value)} className={sel}>
                      <option value="">Selecione...</option>
                      {activeRooms.map((r) => (
                        <option key={r.id} value={r.id}>{r.name} — {r.capacity} pax</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Data *</label>
                    <input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Inicio *</label>
                    <select
                      value={startTime}
                      onChange={(e) => { setStartTime(e.target.value); if (endTime && e.target.value >= endTime) setEndTime("") }}
                      className={sel}
                    >
                      <option value="">--:--</option>
                      {timeSlots.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Termino *</label>
                    <select value={endTime} onChange={(e) => setEndTime(e.target.value)} className={sel}>
                      <option value="">--:--</option>
                      {endTimeSlots.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                {/* Info badges */}
                {(selectedRoom || durationHours > 0 || isLoadingAvailability) && (
                  <div className="flex items-center gap-3 flex-wrap">
                    {selectedRoom?.floor && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                        <MapPin className="w-3 h-3" /> {selectedRoom.floor}
                      </span>
                    )}
                    {cleaningBuffer > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase bg-blue-50 text-blue-500 px-2 py-0.5 rounded">
                        <Clock className="w-3 h-3" /> Buffer {cleaningBuffer}min
                      </span>
                    )}
                    {durationHours > 0 && !rangeConflict && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded">
                        <Clock className="w-3 h-3" /> {durationHours}h de duracao
                      </span>
                    )}
                    {isLoadingAvailability && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-500">
                        <Loader2 className="w-3 h-3 animate-spin" /> Verificando disponibilidade...
                      </span>
                    )}
                  </div>
                )}

                {occupiedSlotsForDate.length > 0 && (
                  <div className="bg-amber-50/70 border border-amber-200/60 rounded-lg p-3.5">
                    <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5 mb-2">
                      <Clock className="w-3.5 h-3.5" /> Horarios ocupados nesta data
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {occupiedSlotsForDate.map((s, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 text-xs font-mono font-medium bg-white text-amber-800 border border-amber-200 px-2.5 py-1 rounded-md shadow-sm">
                          {s.startTime} – {s.endTime}
                          {cleaningBuffer > 0 && (
                            <span className="text-amber-400 text-[10px]">+{cleaningBuffer}min</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {rangeConflict && (
                  <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-3.5">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-red-700">Conflito de Horario</p>
                      <p className="text-xs text-red-500 mt-0.5">O periodo selecionado se sobrepoe a uma reserva existente. Escolha outro horario.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Empresa (só Locação Cliente) */}
              {!isExempt && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                    <Building2 className="w-4.5 h-4.5 text-[#184689]" />
                    <h3 className="text-sm font-bold text-slate-700">Dados da Empresa</h3>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className={lbl}>CNPJ *</label>
                      <div className="relative">
                        <input
                          type="text" inputMode="numeric" value={cnpj}
                          onChange={(e) => { setCnpj(maskCnpj(e.target.value)); setCnpjFound(false); setLockedFields(new Set()) }}
                          placeholder="00.000.000/0000-00" maxLength={18} className={inp}
                        />
                        {isCnpjLoading && (
                          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-4 h-4 animate-spin text-[#184689]" />
                          </div>
                        )}
                        {!isCnpjLoading && cnpjFound && (
                          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          </div>
                        )}
                      </div>
                      {cnpjFound && (
                        <p className="flex items-center gap-1 text-[11px] text-emerald-600 mt-1.5 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Empresa encontrada
                        </p>
                      )}
                    </div>
                    <div>
                      <label className={lbl}>Razao Social *</label>
                      <input type="text" value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} placeholder="Razao Social" readOnly={lockedFields.has("razaoSocial")} className={lockedFields.has("razaoSocial") ? inpLocked : inp} />
                    </div>
                    <div>
                      <label className={lbl}>Inscricao Estadual</label>
                      <input type="text" value={inscricaoEstadual} onChange={(e) => setInscricaoEstadual(e.target.value)} placeholder="Isento" readOnly={lockedFields.has("inscricaoEstadual")} className={lockedFields.has("inscricaoEstadual") ? inpLocked : inp} />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className={lbl}>CEP *</label>
                      <input type="text" inputMode="numeric" value={cep} onChange={(e) => setCep(maskCep(e.target.value))} placeholder="00000-000" maxLength={9} readOnly={lockedFields.has("cep")} className={lockedFields.has("cep") ? inpLocked : inp} />
                    </div>
                    <div>
                      <label className={lbl}>Endereco *</label>
                      <input type="text" value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, Avenida..." readOnly={lockedFields.has("endereco")} className={lockedFields.has("endereco") ? inpLocked : inp} />
                    </div>
                    <div>
                      <label className={lbl}>Numero *</label>
                      <input type="text" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="123" readOnly={lockedFields.has("numero")} className={lockedFields.has("numero") ? inpLocked : inp} />
                    </div>
                    <div>
                      <label className={lbl}>Complemento</label>
                      <input type="text" value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Sala, Andar..." readOnly={lockedFields.has("complemento")} className={lockedFields.has("complemento") ? inpLocked : inp} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className={lbl}>Bairro *</label>
                      <input type="text" value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Bairro" readOnly={lockedFields.has("bairro")} className={lockedFields.has("bairro") ? inpLocked : inp} />
                    </div>
                    <div>
                      <label className={lbl}>Cidade *</label>
                      <input type="text" value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Cidade" readOnly={lockedFields.has("cidade")} className={lockedFields.has("cidade") ? inpLocked : inp} />
                    </div>
                    <div>
                      <label className={lbl}>UF</label>
                      <select value={estado} onChange={(e) => setEstado(e.target.value)} disabled={lockedFields.has("estado")} className={lockedFields.has("estado") ? selLocked : sel}>
                        {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map((uf) => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Dados do Evento + Responsavel */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <CalendarDays className="w-4.5 h-4.5 text-[#184689]" />
                  <h3 className="text-sm font-bold text-slate-700">Dados do Evento e Responsavel</h3>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={lbl}>Nome do Evento *</label>
                    <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Ex: Reuniao Diretoria 2026" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Finalidade</label>
                    <input type="text" value={eventPurpose} onChange={(e) => setEventPurpose(e.target.value)} placeholder="Ex: Treinamento" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Participantes</label>
                    <input
                      type="text" inputMode="numeric" value={estimatedAttendees}
                      onChange={(e) => setEstimatedAttendees(e.target.value.replace(/\D/g, ""))}
                      placeholder="Ex: 30" className={inp}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={lbl}>Responsavel *</label>
                    <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nome completo" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>E-mail *</label>
                    <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="email@empresa.com" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Telefone</label>
                    <input
                      type="text" inputMode="numeric" value={contactPhone}
                      onChange={(e) => setContactPhone(maskPhone(e.target.value))}
                      placeholder="(00) 00000-0000" maxLength={15} className={inp}
                    />
                  </div>
                </div>
              </div>

              {/* 4. Financeiro */}
              {!isExempt ? (
                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                    <DollarSign className="w-4.5 h-4.5 text-[#184689]" />
                    <h3 className="text-sm font-bold text-slate-700">Financeiro</h3>
                  </div>

                  <div className="grid grid-cols-3 gap-4 items-end">
                    <div>
                      <label className={lbl}>Metodo de Pagamento *</label>
                      <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={sel}>
                        <option value="">Selecione o metodo...</option>
                        <option value="boleto">Boleto Bancario</option>
                        <option value="cartao_credito">Cartao de Credito</option>
                        <option value="pix">PIX</option>
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Valor Total *</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-300">R$</span>
                        <input
                          type="text" inputMode="numeric" value={totalAmount}
                          onChange={(e) => { setIsAutoCalc(false); setTotalAmount(e.target.value.replace(/[^\d,]/g, "")) }}
                          placeholder="0,00" className={`${inp} pl-11 font-semibold text-base`}
                        />
                      </div>
                      {isAutoCalc && (
                        <p className="flex items-center gap-1 text-[11px] text-emerald-600 mt-1.5 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Calculado automaticamente
                        </p>
                      )}
                    </div>
                    <div>
                      <button
                        type="button" onClick={handleAutoCalc} disabled={rangeConflict}
                        className="w-full h-10 flex items-center justify-center gap-2 text-sm font-semibold rounded-lg border-2 transition-all bg-[#184689]/5 text-[#184689] border-[#184689]/20 hover:bg-[#184689]/10 hover:border-[#184689]/30 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Calculator className="w-4 h-4" />
                        Calcular Valor
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
                    <DollarSign className="w-4.5 h-4.5 text-[#184689]" />
                    <h3 className="text-sm font-bold text-slate-700">Financeiro</h3>
                  </div>
                  <div className="flex items-center gap-4 py-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">Reserva Isenta</p>
                      <p className="text-xs text-slate-400 mt-0.5">Nenhum valor sera cobrado para este tipo de reserva.</p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-8 py-5 border-t border-slate-200 bg-white rounded-b-2xl flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400">
            {selectedRoom && bookingDate && startTime && endTime && !rangeConflict && (
              <span>
                <strong className="text-slate-600">{selectedRoom.name}</strong>
                {" — "}
                {new Date(bookingDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                {" "}
                {startTime}–{endTime}
                {!isExempt && totalAmount && ` — R$ ${totalAmount}`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose} disabled={isSubmitting}
              className="h-10 px-5 text-sm font-medium text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit} disabled={isSubmitting || rangeConflict}
              className="h-10 px-7 text-sm font-bold text-white bg-[#184689] rounded-lg hover:bg-[#12356b] transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Criar Reserva
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

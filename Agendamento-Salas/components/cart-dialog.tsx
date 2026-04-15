"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Trash2, Users, Edit2, Check, X, AlertCircle, Loader2, Info,
  ArrowLeft, CalendarDays, Clock, CheckCircle2, ChevronRight,
  Building2, FileText, Tag,
} from "lucide-react"
import type { BookingItem, OccupiedSlot } from "@/app/page"
import type { Room } from "@/components/room-list"
import { cn, isValidCNPJ, API_BASE_URL, type SystemSettings, DEFAULT_SETTINGS } from "@/lib/utils"
import { toast } from "sonner"
import Image from "next/image"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { generateTimeOptions, isSlotOccupied } from "@/components/booking-calendar"

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

const formatBookingDate = (date: Date | undefined) => {
  if (!date) return "—"
  return format(date, "dd MMM yyyy", { locale: ptBR })
}

interface CartDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cartRooms: string[]
  bookings: BookingItem[]
  rooms: Room[]
  occupiedSlotsByRoom: Record<string, OccupiedSlot[]>
  onRemoveRoom: (roomId: string) => void
  onRemoveBooking: (id: string) => void
  onUpdateBooking: (id: string, data: Partial<BookingItem>, markUnsaved?: boolean) => void
  onCheckout: () => void
  systemSettings?: SystemSettings
}

export function CartDialog({
  open,
  onOpenChange,
  cartRooms,
  bookings,
  rooms,
  occupiedSlotsByRoom,
  onRemoveRoom,
  onRemoveBooking,
  onUpdateBooking,
  onCheckout,
  systemSettings = DEFAULT_SETTINGS,
}: CartDialogProps) {
  const router = useRouter()
  const dynamicTimeOptions = useMemo(
    () => generateTimeOptions(systemSettings.open_time, systemSettings.close_time),
    [systemSettings.open_time, systemSettings.close_time]
  )
  const [step, setStep] = useState<1 | 2>(1)
  const [cnpj, setCnpj] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStartTime, setEditStartTime] = useState("")
  const [editEndTime, setEditEndTime] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [couponCode, setCouponCode] = useState("")
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [couponError, setCouponError] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string
    discount_type: "percentage" | "fixed"
    discount_value: number
    description?: string
  } | null>(null)

  const cartBookings = useMemo(
    () => bookings.filter(b => cartRooms.includes(b.roomId) && b.confirmedToCart),
    [bookings, cartRooms]
  )

  const total = useMemo(
    () => cartBookings.reduce((sum, b) => sum + (b.price || 0), 0),
    [cartBookings]
  )

  const totalAssociado = total * 0.9

  const couponDiscount = useMemo(() => {
    if (!appliedCoupon || totalAssociado <= 0) return 0
    if (appliedCoupon.discount_type === "percentage") {
      return totalAssociado * (appliedCoupon.discount_value / 100)
    }
    return Math.min(appliedCoupon.discount_value, totalAssociado)
  }, [appliedCoupon, totalAssociado])

  const finalTotal = totalAssociado - couponDiscount

  const totalSchedules = cartBookings.length

  const hasIncompleteItems = useMemo(() => cartBookings.some(b => !b.startTime || !b.endTime), [cartBookings])
  const hasConflicts = useMemo(() => cartBookings.some(b => b.hasConflict), [cartBookings])

  const orphanBookings = useMemo(
    () => bookings.filter(b => !b.confirmedToCart),
    [bookings]
  )
  const hasOrphanBookings = orphanBookings.length > 0

  const canCheckout = cartRooms.length > 0 && !hasIncompleteItems && !hasConflicts && !hasOrphanBookings

  const isCnpjComplete = cnpj.length === 18
  const isCnpjValidValue = isCnpjComplete && isValidCNPJ(cnpj)

  useEffect(() => {
    if (!open) {
      setStep(1)
      setCnpj("")
      setIsValidating(false)
      setEditingId(null)
      setCouponCode("")
      setCouponError("")
      setAppliedCoupon(null)
      setIsApplyingCoupon(false)
    }
  }, [open])

  const handleApplyCoupon = async () => {
    const code = couponCode.trim()
    if (!code) return

    setIsApplyingCoupon(true)
    setCouponError("")

    try {
      const res = await fetch(
        `${API_BASE_URL}/webhook/api/coupons/validate?code=${encodeURIComponent(code)}`
      )
      const text = await res.text()
      if (!text) { setCouponError("Cupom não encontrado."); setAppliedCoupon(null); return }
      const raw = JSON.parse(text)
      const data = Array.isArray(raw) ? raw[0] : raw

      if (data?.success && data.coupon) {
        const coupon = data.coupon
        setAppliedCoupon({
          code: coupon.code || code,
          discount_type: coupon.discount_type,
          discount_value: parseFloat(coupon.discount_value) || 0,
          description: coupon.description,
        })
        setCouponError("")
        toast.success(`Cupom "${code}" aplicado com sucesso!`)
      } else {
        setAppliedCoupon(null)
        setCouponError(data?.message || "Cupom inválido ou expirado.")
      }
    } catch {
      setCouponError("Erro ao validar cupom. Tente novamente.")
    } finally {
      setIsApplyingCoupon(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode("")
    setCouponError("")
    toast("Cupom removido.")
  }

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "")
    if (v.length > 14) v = v.slice(0, 14)
    v = v.replace(/^(\d{2})(\d)/, "$1.$2")
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    v = v.replace(/\.(\d{3})(\d)/, ".$1/$2")
    v = v.replace(/(\d{4})(\d)/, "$1-$2")
    setCnpj(v)
  }

  const handleProsseguir = async () => {
    setIsValidating(true)
    try {
      const cleanCnpj = cnpj.replace(/\D/g, "")
      const urlValidateCompany = `${API_BASE_URL}/webhook/validate-cnpj-webhook/api/companies/validate/${cleanCnpj}`
      const urlCalculatePricing = `${API_BASE_URL}/webhook/api/pricing/calculate`

      const [companyRes, pricingRes] = await Promise.all([
        fetch(urlValidateCompany).catch((err) => {
          console.error("Erro no fetch validate-cnpj:", err)
          return null
        }),
        fetch(urlCalculatePricing, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cnpj: cleanCnpj,
            reservas: cartBookings.map(b => ({
              space_id: b.roomId,
              date: b.selectedRange.from ? b.selectedRange.from.toISOString().split('T')[0] : null,
              startTime: b.startTime,
              endTime: b.endTime,
            })),
          }),
        }).catch((err) => {
          console.error("Erro no fetch pricing:", err)
          return null
        }),
      ])

      const companyData = companyRes && companyRes.ok ? await companyRes.json() : null
      const pricingData = pricingRes && pricingRes.ok ? await pricingRes.json() : null

      sessionStorage.setItem("acipi_checkout_prep", JSON.stringify({
        company: companyData,
        pricing: pricingData,
        selectedRoomsData: rooms.filter(r => cartRooms.includes(r.id)),
        appliedCoupon: appliedCoupon || null,
      }))

      onOpenChange(false)
      router.push(`/formulario?cnpj=${encodeURIComponent(cnpj)}`)
    } catch (error) {
      console.error("Erro na validação:", error)
      alert("Ocorreu um erro ao verificar os dados. Verifique sua conexão e tente novamente.")
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!max-w-[98vw] !w-[98vw] md:!max-w-[95vw] md:!w-[95vw] lg:!max-w-[92vw] lg:!w-[92vw] xl:!max-w-[88vw] xl:!w-[88vw] h-[95vh] max-h-[95vh] flex flex-col p-0 overflow-hidden gap-0 bg-[#f4f7f9]"
        onInteractOutside={(e) => {
          const target = e.target as Element
          if (target?.closest?.("#whatsapp-button")) e.preventDefault()
        }}
      >
        <DialogTitle className="sr-only">Carrinho de Reservas</DialogTitle>

        {/* HEADER */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 shrink-0 pr-14">
          <div className="flex items-center justify-between">
            <button
              onClick={() => step === 2 ? setStep(1) : onOpenChange(false)}
              className="flex items-center gap-2 text-gray-500 hover:text-[#004b87] transition-colors font-medium cursor-pointer"
            >
              <ArrowLeft size={18} />
              <span>{step === 2 ? "Voltar para revisão" : "Voltar para busca"}</span>
            </button>
            <div className="flex items-center gap-2">
              <span className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                step === 1 ? "bg-[#004b87] text-white" : "bg-[#004b87]/20 text-[#004b87]"
              )}>1</span>
              <span className={cn("text-sm", step === 1 ? "font-semibold text-[#004b87]" : "font-medium text-[#004b87]")}>Revisão</span>
              <div className={cn("w-8 h-px mx-1", step === 2 ? "bg-[#004b87]" : "bg-gray-300")} />
              <span className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                step === 2 ? "bg-[#004b87] text-white" : "bg-gray-200 text-gray-500"
              )}>2</span>
              <span className={cn("text-sm", step === 2 ? "font-semibold text-[#004b87]" : "font-medium text-gray-400 hidden sm:block")}>Contrato</span>
            </div>
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto">
          <main className="px-4 sm:px-6 lg:px-8 py-6">
            {/* DYNAMIC TITLE */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#3a4454]">
                {step === 1 ? "Revisar Reservas" : "Dados do Contrato"}
              </h1>
              <p className="text-gray-500 mt-1">
                {step === 1
                  ? `Você selecionou ${cartRooms.length} ${cartRooms.length === 1 ? "espaço" : "espaços"} (${totalSchedules} ${totalSchedules === 1 ? "sessão" : "sessões"}) para o seu evento.`
                  : "Identificação da empresa responsável pela locação dos espaços."}
              </p>
            </div>

            {cartRooms.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-200">
                <p className="text-xl text-gray-500">Seu carrinho de reservas está vazio.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT COLUMN */}
                <div className="lg:col-span-8 flex flex-col gap-5 relative">

                  {/* STEP 1: Room Cards */}
                  {step === 1 && (
                    <div className="flex flex-col gap-5">
                      {cartRooms.map(roomId => {
                        const room = rooms.find(r => r.id === roomId)
                        const roomBookings = cartBookings.filter(b => b.roomId === roomId).sort(
                          (a, b) => (a.selectedRange.from?.getTime() ?? 0) - (b.selectedRange.from?.getTime() ?? 0)
                        )
                        const roomTotal = roomBookings.reduce((sum, b) => sum + (b.price || 0), 0)
                        const roomOccupiedSlots = occupiedSlotsByRoom[roomId] || []

                        if (!room || roomBookings.length === 0) return null

                        return (
                          <div
                            key={roomId}
                            className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden group hover:shadow-md transition-all duration-300 relative"
                          >
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#004b87] rounded-l-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

                            {/* Room Image - top */}
                            <div className="relative w-full h-40">
                              <Image
                                src={room.image}
                                alt={room.name}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 50vw"
                              />
                              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
                                <Users size={14} className="text-[#004b87]" />
                                <span className="text-xs font-bold text-[#3a4454]">Até {room.capacity} pessoas</span>
                              </div>
                            </div>

                            {/* Room Content - bottom */}
                            <div className="p-5 flex flex-col gap-3">
                              <div className="flex justify-between items-start">
                                <h2 className="text-lg font-bold text-[#3a4454]">{room.name}</h2>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onRemoveRoom(roomId)}
                                  className="text-gray-400 hover:text-red-500 hover:bg-red-50 -mr-2 -mt-1 cursor-pointer"
                                >
                                  <span className="text-xs font-medium hidden sm:block">Remover Sala</span>
                                  <Trash2 size={18} />
                                </Button>
                              </div>

                              {/* Schedule Block */}
                              <div className="bg-[#f0f5fa] rounded-xl p-4 border border-[#e1ebf4]">
                                {roomBookings.length > 1 && (
                                  <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-bold text-[#004b87]">
                                      {roomBookings.length} horários selecionados
                                    </span>
                                  </div>
                                )}

                                <div className="flex flex-col gap-2">
                                  {roomBookings.map((b) => {
                                    const isEditing = editingId === b.id

                                    const startOptions = dynamicTimeOptions.slice(0, -1).map(time => {
                                      const occupied = b.selectedRange.from && isSlotOccupied(b.selectedRange.from, time, roomOccupiedSlots)
                                      return { time, disabled: !!occupied }
                                    })

                                    const getEndOptions = (start: string) => {
                                      const startIdx = dynamicTimeOptions.indexOf(start)
                                      if (startIdx === -1) return []
                                      const options = []
                                      for (let i = startIdx + 1; i < dynamicTimeOptions.length; i++) {
                                        const time = dynamicTimeOptions[i]
                                        const isOccupied = b.selectedRange.from && isSlotOccupied(b.selectedRange.from, dynamicTimeOptions[i - 1], roomOccupiedSlots)
                                        options.push({ time, disabled: !!isOccupied })
                                      }
                                      return options
                                    }
                                    const endOptionsList = editStartTime ? getEndOptions(editStartTime) : []

                                    return (
                                      <div
                                        key={b.id}
                                        className={cn(
                                          "flex flex-col gap-2 bg-white p-3 rounded-lg border shadow-sm",
                                          b.hasConflict ? "border-red-200 bg-red-50/50" : "border-blue-50"
                                        )}
                                      >
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                                            <div className="flex items-center gap-2">
                                              <CalendarDays size={18} className={b.hasConflict ? "text-red-500" : "text-[#004b87]"} />
                                              <span className={cn("font-semibold", b.hasConflict ? "text-red-700" : "text-[#004b87]")}>
                                                {formatBookingDate(b.selectedRange.from)}
                                              </span>
                                            </div>
                                            {!isEditing && b.startTime && b.endTime && (
                                              <>
                                                <div className="hidden sm:block w-px h-6 bg-blue-100" />
                                                <div className="flex items-center gap-2 text-gray-600">
                                                  <Clock size={18} className="text-gray-400" />
                                                  <span className="font-medium text-sm">{b.startTime} - {b.endTime}</span>
                                                </div>
                                              </>
                                            )}
                                          </div>

                                          {!isEditing && (
                                            <div className="flex items-center gap-1 ml-auto">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                  setEditingId(b.id)
                                                  setEditStartTime(b.hasConflict ? "" : b.startTime)
                                                  setEditEndTime(b.hasConflict ? "" : b.endTime)
                                                }}
                                                className="text-[#004b87] border-blue-100 hover:border-[#004b87] hover:bg-blue-50 cursor-pointer"
                                              >
                                                <Edit2 size={14} />
                                                <span className="hidden sm:inline">Alterar</span>
                                              </Button>
                                              {roomBookings.length > 1 && (
                                                <Button
                                                  variant="ghost"
                                                  size="icon-sm"
                                                  onClick={() => onRemoveBooking(b.id)}
                                                  className="text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"
                                                  title="Remover este horário"
                                                >
                                                  <Trash2 size={16} />
                                                </Button>
                                              )}
                                            </div>
                                          )}
                                        </div>

                                        {b.hasConflict && !isEditing && (
                                          <div className="flex items-center gap-1.5">
                                            <AlertCircle className="size-3.5 text-red-500" />
                                            <span className="text-xs text-red-600 font-medium">
                                              Horário indisponível. Clique em Alterar para corrigir.
                                            </span>
                                          </div>
                                        )}

                                        {isEditing && (
                                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-blue-100">
                                            <select
                                              value={editStartTime}
                                              onChange={(e) => { setEditStartTime(e.target.value); setEditEndTime("") }}
                                              className="flex-1 min-w-[80px] rounded-md border cursor-pointer bg-white px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                                            >
                                              <option value="">Início</option>
                                              {startOptions.map(opt => (
                                                <option key={opt.time} value={opt.time} disabled={opt.disabled}>
                                                  {opt.time} {opt.disabled ? "(Ocupado)" : ""}
                                                </option>
                                              ))}
                                            </select>
                                            <select
                                              value={editEndTime}
                                              onChange={(e) => setEditEndTime(e.target.value)}
                                              disabled={!editStartTime}
                                              className="flex-1 min-w-[80px] rounded-md border cursor-pointer bg-white px-2 py-1.5 text-xs disabled:opacity-50 focus:ring-1 focus:ring-primary outline-none"
                                            >
                                              <option value="">Término</option>
                                              {endOptionsList.map(opt => (
                                                <option key={opt.time} value={opt.time} disabled={opt.disabled}>
                                                  {opt.time} {opt.disabled ? "(Ocupado)" : ""}
                                                </option>
                                              ))}
                                            </select>
                                            <div className="flex items-center gap-1 ml-auto">
                                              <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => setEditingId(null)}
                                                className="text-muted-foreground hover:bg-gray-200 cursor-pointer"
                                                title="Cancelar"
                                              >
                                                <X className="size-4" />
                                              </Button>
                                              <Button
                                                size="icon-sm"
                                                onClick={() => {
                                                  if (editStartTime && editEndTime) {
                                                    onUpdateBooking(b.id, { startTime: editStartTime, endTime: editEndTime, hasConflict: false }, false)
                                                    setEditingId(null)
                                                  }
                                                }}
                                                disabled={!editStartTime || !editEndTime}
                                                className="cursor-pointer"
                                                title="Salvar"
                                              >
                                                <Check className="size-4" />
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                                {/* Room subtotal */}
                                <div className="flex flex-col gap-0.5 mt-3 pt-3 border-t border-[#e1ebf4]">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-medium text-gray-500">Não Associado</span>
                                    <span className="text-xs font-semibold text-[#3a4454]">{formatCurrency(roomTotal)}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-medium text-[#004b87]">Associado</span>
                                    <span className="text-xs font-bold text-[#004b87]">{formatCurrency(roomTotal * 0.9)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* STEP 2: Dados Fiscais Card */}
                  {step === 2 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                      {/* Card Header */}
                      <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-4 bg-gray-50/50">
                        <div className="bg-white p-2.5 rounded-lg shadow-sm border border-gray-200">
                          <Building2 className="text-[#004b87]" size={24} />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-[#3a4454]">Dados Fiscais</h2>
                          <p className="text-sm text-gray-500">Etapa obrigatória para a elaboração do documento.</p>
                        </div>
                      </div>

                      <div className="p-6 sm:p-8">
                        {/* Info Alert */}
                        <div className="bg-[#f0f5fa] border border-[#e1ebf4] p-5 rounded-xl flex gap-4 mb-8">
                          <div className="bg-white p-2 rounded-full h-fit shadow-sm shrink-0 border border-blue-100">
                            <FileText size={20} className="text-[#004b87]" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-[#004b87] mb-1">Sobre o preenchimento do contrato</h4>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              Você será direcionado(a) para o preenchimento do formulário necessário para a elaboração do contrato.
                              O preenchimento do formulário <strong>não garante a reserva do espaço</strong>. A reserva será confirmada
                              somente após a assinatura do contrato.
                            </p>
                          </div>
                        </div>

                        {/* CNPJ Input */}
                        <div className="max-w-md">
                          <label htmlFor="cnpj" className="block text-sm font-bold text-[#3a4454] mb-2">
                            Para prosseguir, informe o CNPJ:
                          </label>
                          <div className="relative">
                            <input
                              id="cnpj"
                              type="text"
                              value={cnpj}
                              onChange={handleCnpjChange}
                              placeholder="00.000.000/0000-00"
                              disabled={isValidating}
                              className={cn(
                                "w-full border-2 rounded-xl px-4 py-3.5 text-lg transition-all outline-none focus:border-[#004b87] focus:ring-4 focus:ring-[#004b87]/10",
                                isCnpjComplete && !isCnpjValidValue
                                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                                  : "border-gray-200",
                                isValidating && "opacity-50 cursor-not-allowed"
                              )}
                              maxLength={18}
                            />
                            {isCnpjValidValue && (
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 bg-green-50 p-1 rounded-full">
                                <CheckCircle2 size={18} />
                              </div>
                            )}
                          </div>
                          {isCnpjComplete && !isCnpjValidValue && (
                            <span className="text-xs font-medium text-red-500 mt-2 block">
                              CNPJ inválido. Verifique os números digitados.
                            </span>
                          )}
                          <p className="text-xs text-gray-400 mt-2">Apenas números. O formato será aplicado automaticamente.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: Summary Sidebar (visible on both steps) */}
                <div className="lg:col-span-4">
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 lg:sticky lg:top-6">
                    <h3 className="text-lg font-bold text-[#3a4454] mb-6">Resumo da Reserva</h3>

                    <div className="space-y-3 mb-5">
                      <div className="flex justify-between items-center text-gray-500 text-sm">
                        <span>Subtotal (Não Associado)</span>
                        <span className="font-medium">{formatCurrency(total)}</span>
                      </div>
                      <div className="flex justify-between items-center text-green-700 bg-green-50 px-2.5 py-1.5 rounded-lg border border-green-100">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 size={14} />
                          <span className="font-medium text-xs">Desconto Associado</span>
                        </div>
                        <span className="font-bold text-sm">- {formatCurrency(total * 0.1)}</span>
                      </div>
                      {appliedCoupon && couponDiscount > 0 && (
                        <div className="flex justify-between items-center text-green-700 bg-green-50 px-2.5 py-1.5 rounded-lg border border-green-100">
                          <div className="flex items-center gap-1.5">
                            <Tag size={14} />
                            <span className="font-medium text-xs">Cupom {appliedCoupon.code}</span>
                          </div>
                          <span className="font-bold text-sm">- {formatCurrency(couponDiscount)}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-200 my-5" />

                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Total</p>
                        <p className="text-2xl font-extrabold text-[#004b87]">{formatCurrency(finalTotal)}</p>
                      </div>
                    </div>

                    {/* Cupom de Desconto */}
                    <div className="mb-5">
                      <label className="block text-xs font-semibold text-[#3a4454] mb-1.5">Cupom de desconto</label>
                      {appliedCoupon ? (
                        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-green-700">{appliedCoupon.code}</span>
                              <span className="text-[11px] text-green-600">
                                {appliedCoupon.discount_type === "percentage"
                                  ? `${appliedCoupon.discount_value}% de desconto`
                                  : `- ${formatCurrency(appliedCoupon.discount_value)} de desconto`}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={handleRemoveCoupon}
                            className="text-green-600 hover:text-red-500 transition-colors cursor-pointer p-1"
                            title="Remover cupom"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Tag size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type="text"
                                value={couponCode}
                                onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError("") }}
                                placeholder="Digite o cupom"
                                disabled={isApplyingCoupon}
                                className={cn(
                                  "w-full border rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-[#004b87] focus:ring-2 focus:ring-[#004b87]/10 transition-all",
                                  couponError ? "border-red-300" : "border-gray-200",
                                  isApplyingCoupon && "opacity-50"
                                )}
                                maxLength={20}
                                onKeyDown={(e) => { if (e.key === "Enter" && couponCode.trim()) handleApplyCoupon() }}
                              />
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!couponCode.trim() || isApplyingCoupon}
                              onClick={handleApplyCoupon}
                              className="text-xs font-semibold px-3 cursor-pointer border-[#004b87] text-[#004b87] hover:bg-[#004b87]/5 disabled:opacity-40"
                            >
                              {isApplyingCoupon ? <Loader2 size={14} className="animate-spin" /> : "Aplicar"}
                            </Button>
                          </div>
                          {couponError && (
                            <p className="text-xs text-red-500 font-medium mt-1.5">{couponError}</p>
                          )}
                        </>
                      )}
                    </div>

                    <details className="group text-[11px] mb-6">
                      <summary className="inline-flex items-center gap-1 text-[#004b87] cursor-pointer hover:underline font-medium">
                        <Info className="size-3" />
                        Saiba mais sobre descontos
                      </summary>
                      <div className="mt-1.5 rounded-md bg-blue-50 border border-blue-100 p-2.5 text-xs text-blue-900 leading-relaxed">
                        <span className="font-semibold">Desconto por tempo de associação:</span>
                        <ul className="mt-1 ml-3 list-disc space-y-0.5">
                          <li>Até 12 meses: <strong>10%</strong></li>
                          <li>De 13 a 24 meses: <strong>20%</strong></li>
                          <li>Acima de 24 meses: <strong>30%</strong></li>
                        </ul>
                      </div>
                    </details>

                    {hasOrphanBookings && step === 1 && (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 mb-4">
                        <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-600" />
                        <span>
                          Reservas pendentes não adicionadas ao carrinho. Volte e clique em <strong>&quot;Adicionar sala&quot;</strong>.
                        </span>
                      </div>
                    )}

                    {/* DYNAMIC ACTION BUTTON */}
                    {step === 1 ? (
                      <button
                        onClick={() => setStep(2)}
                        disabled={!canCheckout}
                        className={cn(
                          "w-full bg-[#004b87] hover:bg-[#003865] text-white font-bold text-lg py-4 rounded-xl shadow-md shadow-blue-900/20 hover:shadow-lg transition-all flex justify-center items-center gap-2 group",
                          !canCheckout && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        Continuar para Contrato
                        <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    ) : (
                      <button
                        onClick={handleProsseguir}
                        disabled={isValidating || !isCnpjValidValue}
                        className={cn(
                          "w-full bg-[#004b87] hover:bg-[#003865] text-white font-bold text-lg py-4 rounded-xl shadow-md shadow-blue-900/20 hover:shadow-lg transition-all flex justify-center items-center gap-2 group",
                          (isValidating || !isCnpjValidValue) && "disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
                        )}
                      >
                        {isValidating ? (
                          <>
                            <Loader2 className="animate-spin" size={20} />
                            Processando...
                          </>
                        ) : (
                          <>
                            Prosseguir
                            <ChevronRight className={cn("transition-transform", isCnpjValidValue && "group-hover:translate-x-1")} />
                          </>
                        )}
                      </button>
                    )}

                    {/* DYNAMIC INFO TEXT */}
                    <div className="mt-5 flex items-start gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <Info size={16} className="text-gray-400 shrink-0 mt-0.5" />
                      <p>
                        {step === 1
                          ? "Na próxima etapa você preencherá os dados do responsável legal pelo contrato."
                          : "Após preencher o CNPJ, você será levado ao preenchimento completo do contrato."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog"
import { Trash2, Users, Edit2, Check, X, AlertCircle, Loader2 } from "lucide-react"
import type { BookingItem, OccupiedSlot } from "@/app/page"
import type { Room } from "@/components/room-list"
import { cn, isValidCNPJ } from "@/lib/utils"
import Image from "next/image"
import { TIME_OPTIONS, isSlotOccupied } from "@/components/booking-calendar"

// 🔥 CORREÇÃO NA TIPAGEM: Substituímos occupiedSlots por occupiedSlotsByRoom
interface CartDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cartRooms: string[]
  bookings: BookingItem[]
  rooms: Room[]
  occupiedSlotsByRoom: Record<string, OccupiedSlot[]> // <- Nova tipagem aqui
  onRemoveRoom: (roomId: string) => void
  onUpdateBooking: (id: string, data: Partial<BookingItem>, markUnsaved?: boolean) => void
  onCheckout: () => void
}

export function CartDialog({ 
  open, 
  onOpenChange, 
  cartRooms, 
  bookings, 
  rooms, 
  occupiedSlotsByRoom, // <- Atualizado aqui também
  onRemoveRoom, 
  onUpdateBooking, 
  onCheckout 
}: CartDialogProps) {
  const router = useRouter()
  const [step, setStep] = useState<"cart" | "checkout">("cart")
  const [cnpj, setCnpj] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStartTime, setEditStartTime] = useState("")
  const [editEndTime, setEditEndTime] = useState("")
  
  const [isValidating, setIsValidating] = useState(false)

  const cartBookings = bookings.filter(b => cartRooms.includes(b.roomId))
  const total = cartBookings.reduce((sum, b) => sum + b.price, 0)

  const hasIncompleteItems = cartBookings.some(b => !b.startTime || !b.endTime)
  const hasConflicts = cartBookings.some(b => b.hasConflict)
  const canCheckout = cartRooms.length > 0 && !hasIncompleteItems && !hasConflicts

  useEffect(() => {
    if (!open) {
      setStep("cart")
      setCnpj("")
      setIsValidating(false)
    }
  }, [open])

  const handleProsseguir = async () => {
    setIsValidating(true)
    try {
      const cleanCnpj = cnpj.replace(/\D/g, "")

      const urlValidateCompany = `https://acipiapi.eastus.cloudapp.azure.com/webhook/validate-cnpj-webhook/api/companies/validate/${cleanCnpj}`
      const urlCalculatePricing = `https://acipiapi.eastus.cloudapp.azure.com/webhook/api/pricing/calculate`

      const [companyRes, pricingRes] = await Promise.all([
        fetch(urlValidateCompany).catch((err) => {
          console.error("Erro no fetch validate-cnpj:", err);
          return null;
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
              endTime: b.endTime
            }))
          })
        }).catch((err) => {
          console.error("Erro no fetch pricing:", err);
          return null;
        })
      ])

      const companyData = companyRes && companyRes.ok ? await companyRes.json() : null
      const pricingData = pricingRes && pricingRes.ok ? await pricingRes.json() : null

      sessionStorage.setItem("acipi_checkout_prep", JSON.stringify({
        company: companyData,
        pricing: pricingData,
        selectedRoomsData: rooms.filter(r => cartRooms.includes(r.id))
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
        className="!max-w-[70vw] sm:!max-w-[70vw] md:!max-w-[70vw] lg:!max-w-[70vw] !w-[70vw] h-[80vh] max-h-[80vh] flex flex-col p-0 overflow-hidden gap-0 bg-slate-50"
        onInteractOutside={(e) => {
          const target = e.target as Element;
          if (target?.closest?.('#whatsapp-button')) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader className="p-4 border-b shrink-0 bg-white">
          <DialogTitle className="text-xl font-bold text-[#384050]">
            {step === "cart" ? "Salas Selecionadas" : "Finaliza\u00e7\u00e3o de Reserva"}
          </DialogTitle>
        </DialogHeader>

        {step === "cart" && (
          <>
            <div className="flex-1 overflow-y-auto p-4">
          {cartRooms.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-base">
              Nenhuma sala selecionada no momento.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {cartRooms.map(roomId => {
                const room = rooms.find(r => r.id === roomId)
                const roomBookings = cartBookings.filter(b => b.roomId === roomId)
                
                // 🔥 AGORA ELE PUXA OS SLOTS CORRETOS DA SALA AQUI
                const roomOccupiedSlots = occupiedSlotsByRoom[roomId] || []

                if (!room || roomBookings.length === 0) return null

                return (
                  <div key={roomId} className="bg-white border rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-5">
                    <div className="relative w-full md:w-56 h-40 shrink-0 rounded-lg overflow-hidden bg-gray-100 border">
                      <Image
                        src={room.image}
                        alt={room.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 224px"
                      />
                    </div>

                    <div className="flex flex-1 flex-col">
                      <div className="flex justify-between items-start border-b pb-3 mb-3">
                        <div className="flex flex-col gap-1">
                          <h3 className="font-bold text-lg text-[#384050] leading-tight">{room.name}</h3>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Users className="size-3.5" /> Até {room.capacity} pessoas</span>
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span className="truncate max-w-[200px] hidden sm:inline">
                                {(room.amenities.length > 0 ? room.amenities : ["Wi-Fi", "Projetor", "Ar Condicionado"]).slice(0, 3).join(", ")}
                              </span>
                            </>
                          </div>
                        </div>
                        <button 
                          onClick={() => onRemoveRoom(roomId)}
                          className="text-red-500 hover:text-red-700 cursor-pointer hover:bg-red-50 p-2 rounded-md transition-colors flex items-center gap-1.5 text-xs font-medium shrink-0"
                        >
                          <Trash2 className="size-4" />
                          <span className="hidden sm:inline">Remover Sala</span>
                        </button>
                      </div>
                      
                      <div className="flex flex-col gap-2 mb-4 flex-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Horários Selecionados</span>
                        <div className="flex flex-col gap-1.5">
                          {roomBookings.map(b => {
                            const isEditing = editingId === b.id
                            
                            const startOptions = TIME_OPTIONS.slice(0, -1).map(time => {
                              const occupied = b.selectedRange.from && isSlotOccupied(b.selectedRange.from, time, roomOccupiedSlots);
                              return { time, disabled: !!occupied };
                            });

                            const getEndOptions = (start: string) => {
                              const startIdx = TIME_OPTIONS.indexOf(start);
                              if (startIdx === -1) return [];
                              const options = [];
                              for (let i = startIdx + 1; i < TIME_OPTIONS.length; i++) {
                                const time = TIME_OPTIONS[i];
                                const isOccupied = b.selectedRange.from && isSlotOccupied(b.selectedRange.from, TIME_OPTIONS[i - 1], roomOccupiedSlots);
                                options.push({ time, disabled: !!isOccupied });
                              }
                              return options;
                            };
                            const endOptionsList = editStartTime ? getEndOptions(editStartTime) : [];
                            
                            return (
                              <div 
                                key={b.id} 
                                className={cn(
                                  "flex flex-col gap-2 py-2 px-3 border rounded-md transition-colors",
                                  b.hasConflict ? "bg-red-50/50 border-red-300" : "bg-slate-50 border-slate-200"
                                )}
                              >
                                <div className="flex justify-between items-center text-sm">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                    <span className={cn("font-semibold", b.hasConflict ? "text-red-700" : "text-[#384050]")}>
                                      {b.selectedRange.from?.toLocaleDateString("pt-BR")}
                                    </span>
                                    {!isEditing && (
                                      <span className={cn("text-xs sm:text-sm", b.hasConflict ? "text-red-600 font-medium" : "text-muted-foreground")}>
                                        {b.startTime} às {b.endTime}
                                      </span>
                                    )}
                                  </div>
                                  {!isEditing && (
                                    <div className="flex items-center gap-3">
                                      <button 
                                        onClick={() => {
                                          setEditingId(b.id)
                                          setEditStartTime(b.hasConflict ? "" : b.startTime)
                                          setEditEndTime(b.hasConflict ? "" : b.endTime)
                                        }}
                                        className="text-muted-foreground cursor-pointer hover:text-primary transition-colors p-1"
                                        title="Editar horário"
                                      >
                                        <Edit2 className="size-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                
                                {b.hasConflict && !isEditing && (
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <AlertCircle className="size-3.5 text-red-500" />
                                    <span className="text-xs text-red-600 font-medium leading-tight">
                                      O horário selecionado não está disponível. Por favor, edite.
                                    </span>
                                  </div>
                                )}

                                {isEditing && (
                                  <div className="flex items-center gap-2 mt-1 pt-2 border-t border-slate-200/60">
                                    <select value={editStartTime} onChange={(e) => { setEditStartTime(e.target.value); setEditEndTime(""); }} className="rounded-md border cursor-pointer bg-white px-2 py-1 text-xs focus:ring-1 focus:ring-primary outline-none">
                                      <option value="">Início</option>
                                      {startOptions.map(opt => <option key={opt.time} value={opt.time} disabled={opt.disabled}>{opt.time} {opt.disabled ? "(Ocupado)" : ""}</option>)}
                                    </select>
                                    <select value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} disabled={!editStartTime} className="rounded-md border cursor-pointer bg-white px-2 py-1 text-xs disabled:opacity-50 focus:ring-1 focus:ring-primary outline-none">
                                      <option value="">Término</option>
                                      {endOptionsList.map(opt => <option key={opt.time} value={opt.time} disabled={opt.disabled}>{opt.time} {opt.disabled ? "(Ocupado)" : ""}</option>)}
                                    </select>
                                    
                                    <div className="flex items-center gap-1 ml-auto">
                                      <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground cursor-pointer hover:bg-slate-200 rounded-md transition-colors" title="Cancelar">
                                        <X className="size-4" />
                                      </button>
                                      <button onClick={() => {
                                        if (editStartTime && editEndTime) {
                                          onUpdateBooking(b.id, { startTime: editStartTime, endTime: editEndTime, hasConflict: false }, false)
                                          setEditingId(null)
                                        }
                                      }} disabled={!editStartTime || !editEndTime} className="p-1 text-white bg-primary cursor-pointer hover:bg-primary/90 disabled:opacity-50 rounded-md transition-colors" title="Salvar">
                                        <Check className="size-4" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-white shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col w-full md:w-[320px] gap-1.5">
            <div className="flex justify-between items-center w-full">
              <span className="text-sm font-semibold text-[#384050]">Valor para Não Associado</span>
              <span className="text-base font-bold text-[#384050]">R$ {total.toFixed(2).replace(".", ",")}</span>
            </div>
            <div className="flex justify-between items-center w-full text-primary">
              <span className="text-sm font-bold">Valor para Associado</span>
              <span className="text-base font-bold">R$ {(total * 0.9).toFixed(2).replace(".", ",")}</span>
            </div>
          </div>
          <div className="flex w-full md:w-auto md:justify-end">
            <button
              onClick={() => setStep("checkout")}
              disabled={!canCheckout}
              className={cn(
                "w-full md:w-auto rounded-lg bg-primary px-10 py-3 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              Avançar
            </button>
          </div>
        </div>
          </>
        )}
        {step === "checkout" && (
          <>
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 flex flex-col">
              <div className="max-w-2xl w-full mx-auto flex flex-col gap-6">
                <div className="bg-blue-50 border border-blue-200 text-blue-900 p-5 rounded-xl text-sm leading-relaxed shadow-sm">
                  {"Voc\u00ea ser\u00e1 direcionado(a) para o preenchimento do formul\u00e1rio necess\u00e1rio para a elabora\u00e7\u00e3o do contrato. O preenchimento do formul\u00e1rio n\u00e3o garante a reserva do espa\u00e7o. A reserva ser\u00e1 confirmada somente ap\u00f3s a assinatura do contrato."}
                </div>

                <div className="flex flex-col gap-3 mt-2">
                  <label htmlFor="cnpj" className="text-sm font-semibold text-[#384050]">
                    {"Para prosseguir, informe o CNPJ:"}
                  </label>
                  <input
                    id="cnpj"
                    type="text"
                    value={cnpj}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, "")
                      if (v.length > 14) v = v.slice(0, 14)
                      v = v.replace(/^(\d{2})(\d)/, "$1.$2")
                      v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
                      v = v.replace(/\.(\d{3})(\d)/, ".$1/$2")
                      v = v.replace(/(\d{4})(\d)/, "$1-$2")
                      setCnpj(v)
                    }}
                    placeholder="00.000.000/0000-00"
                    disabled={isValidating}
                    className={cn(
                      "w-full rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm",
                      cnpj.length === 18 && !isValidCNPJ(cnpj) ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "border-gray-300",
                      isValidating && "opacity-50 cursor-not-allowed"
                    )}
                  />
                  {cnpj.length === 18 && !isValidCNPJ(cnpj) && (
                    <span className="text-xs font-medium text-red-500 -mt-1">
                      CNPJ inválido. Verifique os números digitados.
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 border-t bg-white shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-10 flex gap-3">
              <button
                onClick={() => setStep("cart")}
                disabled={isValidating}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 text-base font-bold text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Voltar
              </button>
              <button
                onClick={handleProsseguir}
                disabled={cnpj.length < 18 || !isValidCNPJ(cnpj) || isValidating}
                className={cn(
                  "w-full rounded-lg bg-primary px-4 py-2.5 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90 flex items-center justify-center gap-2",
                  (cnpj.length < 18 || !isValidCNPJ(cnpj) || isValidating) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                )}
              >
                {isValidating ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Prosseguir"
                )}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
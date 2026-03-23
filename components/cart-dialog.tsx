"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog"
import { Trash2, Users, Edit2, Check, X } from "lucide-react"
import type { BookingItem } from "@/app/page"
import { ROOMS } from "@/components/room-list"
import { cn, isValidCNPJ } from "@/lib/utils"
import Image from "next/image"
import { isSlotOccupied, TIME_OPTIONS } from "@/components/booking-calendar"

interface CartDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cartRooms: string[]
  bookings: BookingItem[]
  onRemoveRoom: (roomId: string) => void
  onUpdateBooking: (id: string, data: Partial<BookingItem>, markUnsaved?: boolean) => void
  onCheckout: () => void
}

export function CartDialog({ open, onOpenChange, cartRooms, bookings, onRemoveRoom, onUpdateBooking, onCheckout }: CartDialogProps) {
  const router = useRouter()
  const [step, setStep] = useState<"cart" | "checkout">("cart")
  const [cnpj, setCnpj] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStartTime, setEditStartTime] = useState("")
  const [editEndTime, setEditEndTime] = useState("")

  // Filtra apenas os agendamentos das salas que foram adicionadas ao carrinho
  const cartBookings = bookings.filter(b => cartRooms.includes(b.roomId))
  // Calcula o valor total de todos os itens
  const total = cartBookings.reduce((sum, b) => sum + b.price, 0)

  // Reseta os estados quando o carrinho for fechado
  useEffect(() => {
    if (!open) {
      setStep("cart")
      setCnpj("")
    }
  }, [open])

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
            {/* Área rolável com os itens do carrinho */}
            <div className="flex-1 overflow-y-auto p-4">
          {cartRooms.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-base">
              Nenhuma sala selecionada no momento.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {cartRooms.map(roomId => {
                const room = ROOMS.find(r => r.id === roomId)
                const roomBookings = cartBookings.filter(b => b.roomId === roomId)
                if (!room || roomBookings.length === 0) return null

                const roomTotal = roomBookings.reduce((sum, b) => sum + b.price, 0)

                return (
                  <div key={roomId} className="bg-white border rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-5">
                    {/* Imagem da Sala */}
                    <div className="relative w-full md:w-56 h-40 shrink-0 rounded-lg overflow-hidden bg-gray-100 border">
                      <Image
                        src={room.image}
                        alt={room.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 224px"
                      />
                    </div>

                    {/* Detalhes da Sala e Agendamentos */}
                    <div className="flex flex-1 flex-col">
                      <div className="flex justify-between items-start border-b pb-3 mb-3">
                        <div className="flex flex-col gap-1">
                          <h3 className="font-bold text-lg text-[#384050] leading-tight">{room.name}</h3>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Users className="size-3.5" /> Até {room.capacity} pessoas</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="truncate max-w-[200px] hidden sm:inline">{room.amenities.slice(0, 3).join(", ")}</span>
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
                      
                      {/* Lista de Horários Selecionados */}
                      <div className="flex flex-col gap-2 mb-4 flex-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Horários Selecionados</span>
                        <div className="flex flex-col gap-1.5">
                          {roomBookings.map(b => {
                            const isEditing = editingId === b.id
                            
                            const startOptions = TIME_OPTIONS.slice(0, -1).map(time => {
                              const occupied = b.selectedRange.from && isSlotOccupied(b.roomId, b.selectedRange.from, time);
                              return { time, disabled: !!occupied };
                            });

                            const getEndOptions = (start: string) => {
                              const startIdx = TIME_OPTIONS.indexOf(start);
                              if (startIdx === -1) return [];
                              const options = [];
                              let hitOccupied = false;
                              for (let i = startIdx + 1; i < TIME_OPTIONS.length; i++) {
                                const time = TIME_OPTIONS[i];
                                if (b.selectedRange.from && isSlotOccupied(b.roomId, b.selectedRange.from, TIME_OPTIONS[i - 1])) {
                                  hitOccupied = true;
                                }
                                options.push({ time, disabled: hitOccupied });
                              }
                              return options;
                            };
                            const endOptionsList = editStartTime ? getEndOptions(editStartTime) : [];
                            
                            return (
                              <div key={b.id} className="flex flex-col gap-2 py-1.5 px-3 bg-slate-50 border rounded-md">
                                <div className="flex justify-between items-center text-sm">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                    <span className="font-semibold text-[#384050]">
                                      {b.selectedRange.from?.toLocaleDateString("pt-BR")}
                                    </span>
                                    {!isEditing && (
                                      <span className="text-muted-foreground text-xs sm:text-sm">
                                        {b.startTime} às {b.endTime}
                                      </span>
                                    )}
                                  </div>
                                  {!isEditing && (
                                    <div className="flex items-center gap-3">
                                      <span className="font-bold text-[#384050]">R$ {b.price.toFixed(2).replace(".", ",")}</span>
                                      <button 
                                        onClick={() => {
                                          setEditingId(b.id)
                                          setEditStartTime(b.startTime)
                                          setEditEndTime(b.endTime)
                                        }}
                                        className="text-muted-foreground cursor-pointer hover:text-primary transition-colors p-1"
                                        title="Editar horário"
                                      >
                                        <Edit2 className="size-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                
                                {isEditing && (
                                  <div className="flex items-center gap-2 mt-1 pt-2 border-t border-slate-200">
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
                                          onUpdateBooking(b.id, { startTime: editStartTime, endTime: editEndTime }, false)
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

                      {/* Subtotal */}
                      <div className="flex justify-end pt-3 border-t font-bold text-base text-[#384050]">
                        Subtotal: R$ {roomTotal.toFixed(2).replace(".", ",")}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Rodapé fixo com Valor Total e Botão */}
        <div className="p-4 border-t bg-white shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-10">
          <div className="flex flex-col gap-1.5 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-[#384050]">Valor para Não Associado</span>
              <span className="text-base font-bold text-[#384050]">R$ {total.toFixed(2).replace(".", ",")}</span>
            </div>
            <div className="flex justify-between items-center text-primary">
              <span className="text-sm font-bold">Valor para Associado</span>
              <span className="text-base font-bold">R$ {(total * 0.9).toFixed(2).replace(".", ",")}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              * Para associados, o desconto pode chegar até 30%.
            </p>
          </div>
          <button
            onClick={() => setStep("checkout")}
            disabled={cartRooms.length === 0}
            className={cn(
              "w-full rounded-lg bg-primary px-4 py-2.5 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            Avançar
          </button>
        </div>
          </>
        )}
        {step === "checkout" && (
          <>
            {/* Formulário de Checkout */}
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
                    className={cn(
                      "w-full rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm",
                      cnpj.length === 18 && !isValidCNPJ(cnpj) ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "border-gray-300"
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
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 text-base font-bold text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  onOpenChange(false)
                  router.push(`/formulario?cnpj=${encodeURIComponent(cnpj)}`)
                }}
                disabled={cnpj.length < 18 || !isValidCNPJ(cnpj)}
                className={cn(
                  "w-full rounded-lg bg-primary px-4 py-2.5 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                Prosseguir
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
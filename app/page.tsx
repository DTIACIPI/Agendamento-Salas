"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Header } from "@/components/header"
import { RoomList, ROOMS, type Room } from "@/components/room-list"
import { BookingCalendar, isRangeAvailable } from "@/components/booking-calendar"
import { CartDialog } from "@/components/cart-dialog"
import { Card } from "@/components/ui/card"
import { MousePointer2, Calendar as CalendarIcon, FileCheck, Sparkles, Clock } from "lucide-react"
import { calculateRoomPrice } from "@/lib/utils"

export interface BookingItem {
  id: string
  roomId: string
  selectedRange: { from?: Date; to?: Date }
  startTime: string
  endTime: string
  price: number
}

const ReservationProcessCard = () => {
  const steps = [
    {
      id: 1,
      title: "Selecione a Sala",
      description: "Escolha o espaço ideal na lista à esquerda.",
      icon: (
        <div className="relative">
          <div className="w-12 h-9 border-2 border-[#184689] rounded-sm flex items-center justify-center bg-white/50">
             <div className="w-4 h-1 bg-[#184689] absolute bottom-1 right-2 rounded-full opacity-20"></div>
          </div>
          <MousePointer2 className="w-6 h-6 text-[#184689] absolute -bottom-2 -right-2 fill-white" />
        </div>
      ),
    },
    {
      id: 2,
      title: "Verifique Disponibilidade",
      description: "Visualize datas e horários abertos.",
      icon: (
        <div className="relative">
          <CalendarIcon className="w-10 h-10 text-[#184689]" />
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
            <Clock className="w-5 h-5 text-[#184689]" />
          </div>
        </div>
      ),
    },
    {
      id: 3,
      title: "Confirme e Reserve",
      description: "Finalize sua solicitação e confirme.",
      icon: (
        <div className="relative">
          <FileCheck className="w-10 h-10 text-[#184689]" />
        </div>
      ),
    },
  ]

  return (
    <div className="relative w-full overflow-hidden rounded-xl shadow-sm bg-white min-h-[580px] flex flex-col items-center p-12 border border-gray-100 font-sans">
      <div className="relative z-10 w-full flex flex-col items-center">
        <div className="text-center mb-16">
          <h1 className="text-[42px] font-bold text-[#184689] tracking-tight mb-2 leading-tight">Processo de Reserva</h1>
          <p className="text-gray-700/80 text-[19px] font-normal">Siga estes três passos simples para começar:</p>
        </div>

        <div className="relative w-full max-w-lg">
          <div className="absolute left-[15px] top-4 bottom-4 w-[1px] bg-gray-200" />
          <div className="space-y-14">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center gap-8">
                <div className="flex items-center shrink-0">
                  <div className="z-20 w-8 h-8 rounded-full bg-[#184689] flex items-center justify-center text-white text-sm font-semibold">{step.id}</div>
                  <div className="ml-8 w-14 flex justify-center">{step.icon}</div>
                </div>
                <div className="flex flex-col">
                  <h3 className="text-[22px] font-bold text-[#384050] tracking-tight">{step.title}</h3>
                  <p className="text-gray-700/70 text-lg font-normal leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-24 flex flex-col items-center">
          <div className="flex items-center gap-2 text-gray-700/40 font-normal text-lg">
            <span>Nenhum espaço selecionado.</span>
            <Sparkles className="w-5 h-5 opacity-30" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const calendarRef = useRef<HTMLDivElement>(null)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [selectedRanges, setSelectedRanges] = useState<Record<string, { from?: Date; to?: Date }>>({})
  const [startTimes, setStartTimes] = useState<Record<string, string>>({})
  const [endTimes, setEndTimes] = useState<Record<string, string>>({})
  const [isAssociado, setIsAssociado] = useState(false)
  const [associadoMonths, setAssociadoMonths] = useState(0)
  const [cnpj, setCnpj] = useState("")
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [bookings, setBookings] = useState<BookingItem[]>([])
  const [unsavedIds, setUnsavedIds] = useState<string[]>([])
  const [cartRooms, setCartRooms] = useState<string[]>([])
  const [isHydrated, setIsHydrated] = useState(false)

  const handleSelectRoom = useCallback((room: Room) => {
    setSelectedRoom((prev) => (prev?.id === room.id ? null : room))
    // Não limpamos mais os estados globais para permitir seleções independentes
  }, [])

  const handleSelectRange = useCallback(({ from, to }: { from?: Date; to?: Date }) => {
    if (!selectedRoom) return;
    setSelectedRanges(prev => ({ ...prev, [selectedRoom.id]: { from, to } }))
    setStartTimes(prev => ({ ...prev, [selectedRoom.id]: "" }))
    setEndTimes(prev => ({ ...prev, [selectedRoom.id]: "" }))
  }, [selectedRoom])

  const handleSelectOther = useCallback(() => {
    setSelectedRoom(null)
  }, [])

  const handleConfirm = useCallback(() => {
    if (selectedRoom && !cartRooms.includes(selectedRoom.id)) {
      setCartRooms((prev) => [...prev, selectedRoom.id])
    }
  }, [selectedRoom, cartRooms])

  // Estados derivados específicos da sala atual
  const roomSelectedRange = selectedRoom ? (selectedRanges[selectedRoom.id] || {}) : {}
  const roomStartTime = selectedRoom ? (startTimes[selectedRoom.id] || "") : ""
  const roomEndTime = selectedRoom ? (endTimes[selectedRoom.id] || "") : ""
  const roomBookings = selectedRoom ? bookings.filter((b) => b.roomId === selectedRoom.id) : []
  const roomTotal = roomBookings.reduce((acc, item) => acc + item.price, 0)

  // Calculate price for current selection (draft)
  const currentPriceData = selectedRoom
    ? calculateRoomPrice(
        selectedRoom,
        roomSelectedRange.from || roomSelectedRange.to, // pass a date or undefined; util handles range inside if needed
        roomStartTime,
        roomEndTime,
        isAssociado ? associadoMonths : 0,
        roomSelectedRange.from && roomSelectedRange.to ? roomSelectedRange : undefined
      )
    : { basePrice: 0, discountPercent: 0, discount: 0, finalPrice: 0, appliedMinimumHours: 0 }

  const handleRemoveBooking = useCallback((id: string) => {
    setBookings((prev) => prev.filter((item) => item.id !== id))
    setUnsavedIds((prev) => prev.filter((uId) => uId !== id))
  }, [])

  const handleEditBooking = useCallback((id: string) => {
    // No longer used for toggling visibility, but kept for compatibility if needed
  }, [])

  const handleSaveBooking = useCallback((id: string) => {
    setUnsavedIds((prev) => prev.filter((unsavedId) => unsavedId !== id))
  }, [])

  const handleUpdateBooking = useCallback((id: string, data: Partial<BookingItem>, markUnsaved = true) => {
    setBookings((prev) => prev.map((item) => {
      if (item.id === id) {
        const updatedItem = { ...item, ...data }
        
        // Recalculate price if times or range changed
        const roomForBooking = ROOMS.find(r => r.id === item.roomId)
        if (roomForBooking && (data.startTime !== undefined || data.endTime !== undefined || data.selectedRange !== undefined)) {
          const priceData = calculateRoomPrice(
            roomForBooking,
            updatedItem.selectedRange.from || updatedItem.selectedRange.to,
            updatedItem.startTime,
            updatedItem.endTime,
            isAssociado ? associadoMonths : 0,
            updatedItem.selectedRange.from && updatedItem.selectedRange.to ? updatedItem.selectedRange : undefined
          )
          updatedItem.price = priceData.finalPrice
        }
        

        return updatedItem
      }
      return item
    }))

    if (markUnsaved) {
      setUnsavedIds((prev) => prev.includes(id) ? prev : [...prev, id])
    } else {
      setUnsavedIds((prev) => prev.filter((uId) => uId !== id))
    }
  }, [selectedRoom, isAssociado, associadoMonths])

  const handleDaySelect = useCallback((date: Date) => {
    if (!selectedRoom) return;
    
    const sTime = startTimes[selectedRoom.id] || ""
    const eTime = endTimes[selectedRoom.id] || ""

    // Check if date is already booked
    const existingBooking = bookings.find(b => 
      b.roomId === selectedRoom.id && b.selectedRange.from?.toDateString() === date.toDateString()
    )

    if (existingBooking) {
      // If exists, maybe remove it? Or just focus? 
      // For now, let's just remove it to toggle selection like a checkbox
      handleRemoveBooking(existingBooking.id)
    } else {
      let price = 0
      
      // Se o horário padrão conflitar com o dia escolhido, deixamos em branco para o usuário escolher manualmente
      let validStartTime = sTime
      let validEndTime = eTime
      if (sTime && eTime && !isRangeAvailable(selectedRoom.id, date, date, sTime, eTime)) {
        validStartTime = ""
        validEndTime = ""
      }

      if (validStartTime && validEndTime) {
        const priceData = calculateRoomPrice(
          selectedRoom,
          date,
          validStartTime,
          validEndTime,
          isAssociado ? associadoMonths : 0,
          { from: date, to: date }
        )
        price = priceData.finalPrice
      }

      const newItem: BookingItem = {
        id: Math.random().toString(36).substr(2, 9),
        roomId: selectedRoom.id,
        selectedRange: { from: date, to: date },
        startTime: validStartTime,
        endTime: validEndTime,
        price: price
      }
      setBookings((prev) => {
        const newBookings = [...prev, newItem]
        // Ordena os agendamentos por data (crescente)
        return newBookings.sort((a, b) => {
          const dateA = a.selectedRange.from?.getTime() ?? 0
          const dateB = b.selectedRange.from?.getTime() ?? 0
          return dateA - dateB
        })
      })
    }
  }, [bookings, startTimes, endTimes, selectedRoom, isAssociado, associadoMonths, handleRemoveBooking])

  const handleApplyDefaultTime = useCallback((start: string, end: string) => {
    if (!selectedRoom) return;
    setStartTimes(prev => ({ ...prev, [selectedRoom.id]: start }))
    setEndTimes(prev => ({ ...prev, [selectedRoom.id]: end }))
    
    setBookings((prev) => prev.map((item) => {
      if (item.roomId === selectedRoom.id) {
        const priceData = calculateRoomPrice(
          selectedRoom,
          item.selectedRange.from || item.selectedRange.to,
          start,
          end,
          isAssociado ? associadoMonths : 0,
          item.selectedRange.from && item.selectedRange.to ? item.selectedRange : undefined
        )
        return {
          ...item,
          startTime: start,
          endTime: end,
          price: priceData.finalPrice
        }
      }
      return item
    }))
  }, [selectedRoom, isAssociado, associadoMonths])

  // Recalcula os valores de todos os agendamentos caso o status de associado mude
  useEffect(() => {
    setBookings((prev) => prev.map((item) => {
      const roomForBooking = ROOMS.find(r => r.id === item.roomId)
      if (!roomForBooking) return item
      
      const priceData = calculateRoomPrice(
        roomForBooking,
        item.selectedRange.from || item.selectedRange.to,
        item.startTime,
        item.endTime,
        isAssociado ? associadoMonths : 0,
        item.selectedRange.from && item.selectedRange.to ? item.selectedRange : undefined
      )
      
      return item.price !== priceData.finalPrice ? { ...item, price: priceData.finalPrice } : item
    }))
  }, [isAssociado, associadoMonths])

  // Limpa a sala do carrinho caso o usuário remova todos os horários daquela sala
  useEffect(() => {
    setCartRooms(prev => prev.filter(roomId => bookings.some(b => b.roomId === roomId)))
    
    // Limpa também os horários de rascunho se a sala não tiver mais agendamentos
    setStartTimes(prev => {
      const next = { ...prev }
      let changed = false
      Object.keys(next).forEach(roomId => {
        if (!bookings.some(b => b.roomId === roomId) && next[roomId] !== "") {
          next[roomId] = ""
          changed = true
        }
      })
      return changed ? next : prev
    })
    setEndTimes(prev => {
      const next = { ...prev }
      let changed = false
      Object.keys(next).forEach(roomId => {
        if (!bookings.some(b => b.roomId === roomId) && next[roomId] !== "") {
          next[roomId] = ""
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [bookings])

  // Rola suavemente para o calendário quando uma sala é selecionada
  useEffect(() => {
    if (selectedRoom && calendarRef.current) {
      // O yOffset é um recuo para o header fixo não cobrir o calendário (aprox 100px)
      const yOffset = -100; 
      const y = calendarRef.current.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, [selectedRoom?.id])

  const cartItemCount = cartRooms.length

  const handleRemoveFromCart = useCallback((roomId: string) => {
    setCartRooms((prev) => prev.filter((id) => id !== roomId))
  }, [])

  // Restaura o estado salvo ao carregar a página (quando voltar do formulário)
  useEffect(() => {
    const saved = sessionStorage.getItem("acipi_booking_state")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.selectedRoomId) {
          const room = ROOMS.find(r => r.id === parsed.selectedRoomId)
          if (room) setSelectedRoom(room)
        }
        if (parsed.selectedRanges) {
          const restoredRanges: any = {}
          for (const key in parsed.selectedRanges) {
            restoredRanges[key] = {
              from: parsed.selectedRanges[key].from ? new Date(parsed.selectedRanges[key].from) : undefined,
              to: parsed.selectedRanges[key].to ? new Date(parsed.selectedRanges[key].to) : undefined,
            }
          }
          setSelectedRanges(restoredRanges)
        }
        if (parsed.startTimes) setStartTimes(parsed.startTimes)
        if (parsed.endTimes) setEndTimes(parsed.endTimes)
        if (parsed.isAssociado !== undefined) setIsAssociado(parsed.isAssociado)
        if (parsed.associadoMonths !== undefined) setAssociadoMonths(parsed.associadoMonths)
        if (parsed.cnpj !== undefined) setCnpj(parsed.cnpj)
        if (parsed.unsavedIds) setUnsavedIds(parsed.unsavedIds)
        if (parsed.cartRooms) setCartRooms(parsed.cartRooms)
        if (parsed.bookings) {
          setBookings(parsed.bookings.map((b: any) => ({
            ...b,
            selectedRange: {
              from: b.selectedRange.from ? new Date(b.selectedRange.from) : undefined,
              to: b.selectedRange.to ? new Date(b.selectedRange.to) : undefined,
            }
          })))
        }
      } catch (err) {
        console.error("Erro ao recuperar estado:", err)
      }
    }
    setIsHydrated(true)
  }, [])

  // Salva o estado atual na sessão para preservar ao trocar de página
  useEffect(() => {
    if (!isHydrated) return
    const stateToSave = {
      selectedRoomId: selectedRoom?.id || null,
      selectedRanges,
      startTimes,
      endTimes,
      isAssociado,
      associadoMonths,
      cnpj,
      unsavedIds,
      cartRooms,
      bookings,
    }
    sessionStorage.setItem("acipi_booking_state", JSON.stringify(stateToSave))
  }, [selectedRoom, selectedRanges, startTimes, endTimes, isAssociado, associadoMonths, cnpj, unsavedIds, cartRooms, bookings, isHydrated])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header cartCount={cartItemCount} onCartClick={() => setIsCartOpen(true)} />

      <main className="mx-auto w-full max-w-[1920px] flex-1 px-4 py-6 lg:px-8">

        <div className="mb-6 px-3">
          <h2 className="text-2xl font-bold tracking-tight text-[#384050] text-balance">
            Agendamento de Salas
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {"Escolha um espa\u00e7o, selecione data e hor\u00e1rio para realizar seu pr\u00e9-agendamento."}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[30%_1fr] items-start">
          {/* Left Column: Room List */}
          <div className="flex flex-col gap-4">
            <RoomList
              selectedRoomId={selectedRoom?.id ?? null}
              onSelectRoom={handleSelectRoom}
            />
          </div>

          {/* Right Column: Calendar + Summary */}
          <div ref={calendarRef} className="flex flex-col gap-4">
            {selectedRoom ? (
              selectedRoom.available ? (
                <>
                  <Card className="px-8 py-6">
                      <BookingCalendar
                        room={selectedRoom}
                        selectedRange={roomSelectedRange}
                        onDaySelect={handleDaySelect}
                        onSelectRange={handleSelectRange}
                        startTime={roomStartTime}
                        endTime={roomEndTime}
                        onStartTimeChange={(time) => {
                          if (selectedRoom) setStartTimes(prev => ({ ...prev, [selectedRoom.id]: time }))
                        }}
                        onEndTimeChange={(time) => {
                          if (selectedRoom) setEndTimes(prev => ({ ...prev, [selectedRoom.id]: time }))
                        }}
                        isAssociado={isAssociado}
                        onToggleAssociado={() => {
                          setIsAssociado((v) => !v)
                          if (isAssociado) {
                            setCnpj("")
                            setAssociadoMonths(0)
                          }
                        }}
                        associadoMonths={associadoMonths}
                        onAssociadoMonthsChange={setAssociadoMonths}
                        cnpj={cnpj}
                        onCnpjChange={setCnpj}
                        onConfirm={handleConfirm} // This now confirms everything
                        priceData={currentPriceData}
                        bookings={roomBookings}
                        onRemoveBooking={handleRemoveBooking}
                        onEditBooking={handleEditBooking}
                        onUpdateBooking={handleUpdateBooking}
                        onSaveBooking={handleSaveBooking}
                        unsavedIds={unsavedIds}
                        onApplyDefaultTime={handleApplyDefaultTime}
                        totalPrice={roomTotal}
                      />
                  </Card>

                </>
              ) : (
                <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground shadow-sm">
                  Este espaço não está disponível para locação no momento.
                </div>
              )
            ) : (
              <ReservationProcessCard />
            )}
          </div>
        </div>
      </main>

      <footer className="border-t bg-card py-4">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-muted-foreground lg:px-8">
          {"ACIPI \u2014 Associa\u00e7\u00e3o Comercial e Industrial de Piracicaba. Todos os direitos reservados."}
        </div>
      </footer>

      <CartDialog
        open={isCartOpen}
        onOpenChange={setIsCartOpen}
        cartRooms={cartRooms}
        bookings={bookings}
        onUpdateBooking={handleUpdateBooking}
        onRemoveRoom={handleRemoveFromCart}
        onCheckout={() => {
          setIsCartOpen(false)
          setCartRooms([])
          setBookings([])
        }}
      />
    </div>
  )
}

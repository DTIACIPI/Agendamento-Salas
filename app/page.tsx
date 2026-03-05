"use client"

import { useState, useCallback } from "react"
import { Header } from "@/components/header"
import { RoomList, ROOMS, type Room } from "@/components/room-list"
import { BookingCalendar, isRangeAvailable } from "@/components/booking-calendar"
import { BookingSummary } from "@/components/booking-summary"
import { UnavailableState } from "@/components/unavailable-state"
import { SuccessDialog } from "@/components/success-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarDays } from "lucide-react"
import { calculateRoomPrice } from "@/lib/utils"

export default function Home() {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [isAssociado, setIsAssociado] = useState(false)
  const [associadoMonths, setAssociadoMonths] = useState(0)
  const [cnpj, setCnpj] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSelectRoom = useCallback((room: Room) => {
    setSelectedRoom(room)
    setSelectedDate(undefined)
    setStartTime("")
    setEndTime("")
    setCnpj("")
  }, [])

  const handleSelectDate = useCallback((date: Date | undefined) => {
    setSelectedDate(date)
    setStartTime("")
    setEndTime("")
  }, [])

  const handleSelectOther = useCallback(() => {
    setSelectedRoom(null)
    setSelectedDate(undefined)
    setStartTime("")
    setEndTime("")
    setCnpj("")
  }, [])

  const handleConfirm = useCallback(() => {
    setShowSuccess(true)
  }, [])

  // Check if the selected range has a conflict
  const hasConflict =
    selectedRoom &&
    selectedDate &&
    startTime &&
    endTime &&
    !isRangeAvailable(selectedRoom.id, selectedDate, startTime, endTime)

  const priceData = selectedRoom
    ? calculateRoomPrice(
        selectedRoom,
        selectedDate,
        startTime,
        endTime,
        isAssociado ? associadoMonths : 0
      )
    : { basePrice: 0, discountPercent: 0, discount: 0, finalPrice: 0, appliedMinimumHours: 0 }

  const total = priceData.finalPrice

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-foreground text-balance">
            Agendamento de Salas
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {"Escolha um espa\u00e7o, selecione data e hor\u00e1rio para realizar seu pr\u00e9-agendamento."}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Left Column: Room List */}
          <div className="flex flex-col gap-4">
            <RoomList
              selectedRoomId={selectedRoom?.id ?? null}
              onSelectRoom={handleSelectRoom}
            />
          </div>

          {/* Right Column: Calendar + Summary */}
          <div className="flex flex-col gap-4">
            {selectedRoom ? (
              selectedRoom.available ? (
                <>
                  <Card>
                    <CardContent className="p-4 lg:p-6">
                      <BookingCalendar
                        room={selectedRoom}
                        selectedDate={selectedDate}
                        onSelectDate={handleSelectDate}
                        startTime={startTime}
                        endTime={endTime}
                        onStartTimeChange={setStartTime}
                        onEndTimeChange={setEndTime}
                      />
                    </CardContent>
                  </Card>

                  {hasConflict ? (
                    <UnavailableState
                      currentRoom={selectedRoom}
                      selectedDate={selectedDate}
                      startTime={startTime}
                      endTime={endTime}
                      onSelectRoom={(room) => {
                        handleSelectRoom(room)
                        // Preserve date and times when switching rooms
                        setSelectedDate(selectedDate)
                        setStartTime(startTime)
                        setEndTime(endTime)
                      }}
                      onSelectOther={handleSelectOther}
                    />
                  ) : (
                    <BookingSummary
                      room={selectedRoom}
                      selectedDate={selectedDate}
                      startTime={startTime}
                      endTime={endTime}
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
                      onConfirm={handleConfirm}
                    />
                  )}
                </>
              ) : (
                <UnavailableState
                  currentRoom={selectedRoom}
                  selectedDate={selectedDate}
                  startTime={startTime}
                  endTime={endTime}
                  onSelectRoom={handleSelectRoom}
                  onSelectOther={handleSelectOther}
                />
              )
            ) : (
              <Card className="flex flex-1 items-center justify-center border-dashed">
                <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-secondary">
                    <CalendarDays className="size-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      {"Nenhum espa\u00e7o selecionado"}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {"Selecione um espa\u00e7o na lista ao lado para ver a disponibilidade e agendar."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t bg-card py-4">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-muted-foreground lg:px-8">
          {"ACIPI \u2014 Associa\u00e7\u00e3o Comercial e Industrial de Piracicaba. Todos os direitos reservados."}
        </div>
      </footer>

      {selectedRoom && (
        <SuccessDialog
          open={showSuccess}
          onOpenChange={setShowSuccess}
          roomName={selectedRoom.name}
          date={selectedDate}
          startTime={startTime}
          endTime={endTime}
          total={total}
        />
      )}
    </div>
  )
}

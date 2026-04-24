"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import type { OccupiedSlot } from "@/app/page"
import { type SystemSettings, DEFAULT_SETTINGS, addBusinessDays } from "@/lib/utils"
import { ptBR } from "date-fns/locale"
import { addMonths } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import {
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Users,
  Wifi,
  Monitor,
  MapPin,
  Plus,
  Trash2,

  Save,
  X,
  Loader2,
  CheckCircle2,
  Info,

} from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import type { Room } from "@/components/room-list"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

// Generate 30-minute interval time options from open_time to close_time
export function generateTimeOptions(openTime = "08:00", closeTime = "22:00"): string[] {
  const times: string[] = []
  const startHour = parseInt(openTime.substring(0, 2), 10)
  const endHour = parseInt(closeTime.substring(0, 2), 10)
  for (let h = startHour; h <= endHour; h++) {
    times.push(`${String(h).padStart(2, "0")}:00`)
    if (h < endHour) {
      times.push(`${String(h).padStart(2, "0")}:30`)
    }
  }
  return times
}

export const TIME_OPTIONS = generateTimeOptions()

function getDraftEndOptions(start: string, timeOptions: string[] = TIME_OPTIONS) {
  const startIdx = timeOptions.indexOf(start)
  if (startIdx === -1) return []
  const options = []
  for (let i = startIdx + 1; i < timeOptions.length; i++) {
    options.push({ time: timeOptions[i], disabled: false })
  }
  return options
}

const timeToMinutes = (time: string): number => {
  if (!time) return 0;
  const hours = parseInt(time.substring(0, 2), 10);
  const minutes = parseInt(time.substring(3, 5), 10);

  if (isNaN(hours) || isNaN(minutes)) return 0;
  return (hours * 60) + minutes;
};

export function isSlotOccupied(
  date: Date,
  time: string,
  occupiedSlots: OccupiedSlot[],
  cleaningBuffer: number = 0
): boolean {
  if (!date || !time) return false;

  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const timeInMinutes = timeToMinutes(time);

  for (const slot of occupiedSlots) {
    if (slot.date === dateKey) {
      const startInMinutes = timeToMinutes(slot.startTime);
      const endInMinutes = timeToMinutes(slot.endTime) + cleaningBuffer;

      if (timeInMinutes >= startInMinutes && timeInMinutes < endInMinutes) {
        return true;
      }
    }
  }
  return false;
}

export function isRangeAvailable(
  date: Date,
  start: string,
  end: string,
  occupiedSlots: OccupiedSlot[],
  timeOptions: string[] = TIME_OPTIONS,
  cleaningBuffer: number = 0
): boolean {
  const startIdx = timeOptions.indexOf(start);
  const endIdx = timeOptions.indexOf(end);
  if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) return false;

  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const rangeStart = timeToMinutes(start);
  const rangeEnd = timeToMinutes(end) + cleaningBuffer;

  for (const slot of occupiedSlots) {
    if (slot.date === dateKey) {
      const slotStart = timeToMinutes(slot.startTime);
      const slotEnd = timeToMinutes(slot.endTime) + cleaningBuffer;
      if (rangeStart < slotEnd && rangeEnd > slotStart) {
        return false;
      }
    }
  }
  return true;
}

interface BookingCalendarProps {
  room: Room
  // allows selecting a single date or a consecutive range
  selectedRange: { from?: Date; to?: Date }
  onSelectRange: (range: { from?: Date; to?: Date }) => void
  startTime: string
  endTime: string
  onStartTimeChange: (time: string) => void
  onEndTimeChange: (time: string) => void
  isAssociado: boolean
  onToggleAssociado: () => void
  associadoMonths: number
  onAssociadoMonthsChange: (months: number) => void
  cnpj: string
  onCnpjChange: (cnpj: string) => void
  onConfirm: () => void
  priceData: {
    basePrice: number
    discountPercent: number
    discount: number
    finalPrice: number
    appliedMinimumHours: number
  }
  bookings: any[] // room-specific bookings for calendar/editing
  allBookings: any[] // ALL bookings across all rooms for global summary
  allRooms: Room[] // ALL rooms for name lookup
  cartRooms: string[] // rooms already confirmed to cart
  onDaySelect: (date: Date) => void
  onRemoveBooking: (id: string) => void
  onUpdateBooking: (id: string, data: any) => void
  onSaveBooking: (id: string) => void
  unsavedIds: string[]
  totalPrice: number
  onApplyDefaultTime: (start: string, end: string) => void
  onMonthChange: (date: Date) => void;
  occupiedSlots: OccupiedSlot[];
  availabilityLoading: boolean;
  isRoomDetailsLoading?: boolean;
  onSwitchRoom?: (roomId: string) => void;
  systemSettings?: SystemSettings;
}

export function BookingCalendar({
  room,
  selectedRange,
  onDaySelect,
  onSelectRange,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  onConfirm,
  priceData,
  bookings,
  allBookings,
  allRooms,
  cartRooms,
  onRemoveBooking,
  onUpdateBooking,
  onSaveBooking,
  unsavedIds,
  onApplyDefaultTime,
  totalPrice,
  onMonthChange,
  occupiedSlots,
  availabilityLoading,
  isRoomDetailsLoading,
  onSwitchRoom,
  systemSettings = DEFAULT_SETTINGS,
}: BookingCalendarProps) {
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  const [draftStartTime, setDraftStartTime] = useState(startTime)
  const [draftEndTime, setDraftEndTime] = useState(endTime)

  // Dynamic time options based on system settings
  const dynamicTimeOptions = useMemo(
    () => generateTimeOptions(systemSettings.open_time, systemSettings.close_time),
    [systemSettings.open_time, systemSettings.close_time]
  )
  const today = new Date()
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const [leftMonth, setLeftMonth] = useState(currentMonth)

  // --- LÓGICA DE PREFETCH E DEBOUNCE (NOVO) ---
  const isFirstRender = useRef(true);
  const prevRoomId = useRef(room.id);
  const onMonthChangeRef = useRef(onMonthChange);

  // Mantém a refência da função atualizada para não dar erro de dependência
  useEffect(() => {
    onMonthChangeRef.current = onMonthChange;
  }, [onMonthChange]);

  useEffect(() => {
    // Se for o primeiro carregamento ou se mudou de sala: Busca IMEDIATAMENTE (Prefetch)
    if (isFirstRender.current || prevRoomId.current !== room.id) {
      onMonthChangeRef.current(leftMonth);
      isFirstRender.current = false;
      prevRoomId.current = room.id;
      return;
    }

    // Se o usuário apenas navegou nos meses: Espera 500ms antes de buscar (Debounce)
    const handler = setTimeout(() => {
      onMonthChangeRef.current(leftMonth);
    }, 500);

    // Limpa o timeout anterior se o usuário clicar de novo antes de 500ms
    return () => clearTimeout(handler);
  }, [leftMonth, room.id]);
  // ---------------------------------------------

  // Cria uma chave a partir dos agendamentos para forçar a nova renderização do calendário na mudança da data da seleção
  const selectionKey = useMemo(
    () => bookings.map((b) => `${b.id}-${b.selectedRange.from?.getTime() || 0}`).join("-"),
    [bookings]
  )

  // Reset carousel when room changes
  useEffect(() => {
    setCarouselIndex(0)
  }, [room.id])

  // Sync draft times when parent resets them
  useEffect(() => {
    setDraftStartTime(startTime)
    setDraftEndTime(endTime)
  }, [startTime, endTime])

  const draftStartOptions = useMemo(() => {
    return dynamicTimeOptions.slice(0, -1).map(time => ({ time, disabled: false }));
  }, [dynamicTimeOptions]);

  const draftEndOptions = useMemo(
    () => draftStartTime ? getDraftEndOptions(draftStartTime, dynamicTimeOptions) : [],
    [draftStartTime, dynamicTimeOptions]
  )

  const hasIncompleteItems = useMemo(() => bookings.some(b => !b.startTime || !b.endTime), [bookings])
  const hasConflicts = useMemo(() => bookings.some(b => b.hasConflict), [bookings])
  // All bookings grouped by room, current room first
  // Current room pending: show all items (even mid-edit with empty endTime)
  // Other rooms + confirmed: only show items with complete times
  const pendingByRoom = useMemo(() => {
    const visible = allBookings.filter(b => {
      // Current room, not confirmed: show if has startTime or room default time is set
      if (b.roomId === room.id && !b.confirmedToCart) return b.startTime || (startTime && endTime)
      // Confirmed items (any room) or other rooms pending: show only complete items
      return b.startTime && b.endTime
    })
    const groups = new Map<string, typeof visible>()
    for (const b of visible) {
      const list = groups.get(b.roomId) || []
      list.push(b)
      groups.set(b.roomId, list)
    }
    // Sort dates within each group
    for (const list of groups.values()) {
      list.sort((a, b) => (a.selectedRange.from?.getTime() ?? 0) - (b.selectedRange.from?.getTime() ?? 0))
    }
    // Current room first, then others
    const sorted: { roomId: string; roomName: string; items: typeof visible }[] = []
    if (groups.has(room.id)) {
      sorted.push({ roomId: room.id, roomName: room.name, items: groups.get(room.id)! })
    }
    for (const [rid, items] of groups) {
      if (rid === room.id) continue
      const r = allRooms.find(r => r.id === rid)
      sorted.push({ roomId: rid, roomName: r?.name || "Sala", items })
    }
    return sorted
  }, [allBookings, room.id, room.name, allRooms, startTime, endTime])

  // canConfirm: all unconfirmed bookings must be complete (have times, no conflicts)
  const allPendingComplete = useMemo(
    () => allBookings.filter(b => !b.confirmedToCart).every(b => b.startTime && b.endTime && !b.hasConflict),
    [allBookings]
  )
  const hasPendingBookings = useMemo(
    () => allBookings.some(b => !b.confirmedToCart),
    [allBookings]
  )
  const canConfirm = hasPendingBookings && !hasIncompleteItems && !hasConflicts && allPendingComplete

  const roomImages = useMemo(() => {
    return room.images && room.images.length > 0 ? room.images : [room.image];
  }, [room.images, room.image]);

  const fullyBookedDatesSet = useMemo(() => {
    const set = new Set<string>();
    const dateKeys = new Set(occupiedSlots.map(s => s.date));
    const allSlots = dynamicTimeOptions.slice(0, -1);
    for (const dateKey of dateKeys) {
      const slotsForDate = occupiedSlots.filter(s => s.date === dateKey);
      const [year, month, day] = dateKey.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      if (allSlots.every(t => isSlotOccupied(d, t, slotsForDate))) {
        set.add(dateKey);
      }
    }
    return set;
  }, [occupiedSlots, dynamicTimeOptions]);

  const isDateFullyBooked = useCallback((date: Date) => {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return fullyBookedDatesSet.has(key);
  }, [fullyBookedDatesSet]);

  // Antecedencia minima de 3 dias uteis (seg-sex)
  const minBookingDate = useMemo(() => addBusinessDays(new Date(), 3), []);

  const disabledDates = useMemo(() => {
    const matchers: any[] = [
      { before: minBookingDate },
      isDateFullyBooked
    ]
    if (systemSettings.block_sundays) {
      matchers.splice(1, 0, { dayOfWeek: [0] })
    }
    return matchers
  }, [minBookingDate, isDateFullyBooked, systemSettings.block_sundays]);

  const handlePrevImage = useCallback(() => {
    setCarouselIndex((prev) => (prev === 0 ? roomImages.length - 1 : prev - 1))
  }, [roomImages.length])

  const handleNextImage = useCallback(() => {
    setCarouselIndex((prev) => (prev === roomImages.length - 1 ? 0 : prev + 1))
  }, [roomImages.length])

  const handleDefineTime = useCallback(() => {
    onApplyDefaultTime(draftStartTime, draftEndTime)
  }, [onApplyDefaultTime, draftStartTime, draftEndTime])

  return (
    <div className="flex flex-col gap-2">
      {/* Header - Title and Subtitle */}
      <div>
        <h3 className="text-lg font-bold text-[#384050]">
          {"Sele\u00e7\u00e3o de data e hora"}
        </h3>
      </div>

      {/* Main Content: Calendars and Right Side (aligned) */}
      <div className="flex flex-col gap-6 2xl:flex-row 2xl:gap-6 2xl:items-start">
        {/* Left side: Calendars */}
        <div className="flex-1">
        <div className="rounded-lg border bg-card px-2 sm:px-4 py-4 sm:py-6 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 lg:gap-[38px]">
            <div className="flex justify-center">
              <Calendar
                key={`left-${selectionKey}`}
                mode="multiple"
                selected={bookings.map(b => b.selectedRange.from).filter(Boolean) as Date[]}
                onDayClick={onDaySelect}
                locale={ptBR}
                month={leftMonth}
                onMonthChange={(month) => {
                  setLeftMonth(month);
                  // Disparo direto da API removido daqui para respeitar o debounce
                }}
                disabled={disabledDates}
                modifiersClassNames={{
                  disabled: "bg-muted text-muted-foreground !opacity-100 rounded-md"
                }}
                className="mx-auto"
              />
            </div>
            <div className="flex justify-center">
              <Calendar
                key={`right-${selectionKey}`}
                mode="multiple"
                selected={bookings.map(b => b.selectedRange.from).filter(Boolean) as Date[]}
                onDayClick={onDaySelect}
                locale={ptBR}
                month={addMonths(leftMonth, 1)}
                onMonthChange={(month) => {
                  const newLeftMonth = addMonths(month, -1);
                  setLeftMonth(newLeftMonth);
                  // Disparo direto da API removido daqui para respeitar o debounce
                }}
                disabled={disabledDates}
                modifiersClassNames={{
                  disabled: "bg-muted text-muted-foreground !opacity-100 rounded-md"
                }}
                className="mx-auto"
              />
            </div>
          </div>
        {/* Legend area below calendars */}
        <div className="mt-2 border rounded-lg bg-card px-4 sm:px-6 lg:px-8 py-4 sm:py-6 text-sm text-muted-foreground">
          
          {/* amenities icons DINÂMICOS */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-3 mb-3 border-b text-[#384050] text-[13px]">

            {/* Capacidade Fixa Sempre Visível */}
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <Users className="size-3.5 text-primary" />
              <span>Capacidade: {room.capacity} pessoas</span>
            </div>

            {/* Andar */}
            {room.floor && (
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <MapPin className="size-3.5 text-primary" />
                <span>{room.floor}</span>
              </div>
            )}

            {/* Loop das Comodidades do Banco de Dados */}
            {room.amenities && room.amenities.length > 0 ? (
              room.amenities.map((amenity, index) => {
                let Icon = CheckCircle2;
                const text = amenity.toLowerCase();
                if (text.includes("projetor") || text.includes("tela")) Icon = Monitor;
                else if (text.includes("internet") || text.includes("wi-fi") || text.includes("wifi")) Icon = Wifi;

                return (
                  <div key={index} className="flex items-center gap-1.5 whitespace-nowrap">
                    <Icon className="size-3.5 text-primary" />
                    <span>{amenity}</span>
                  </div>
                )
              })
            ) : (
              <span className="text-xs italic opacity-60">Nenhuma comodidade extra listada</span>
            )}
          </div>

          {/* color legend and rule */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-4 text-[13px]">
            <div className="flex items-center gap-1.5">
              <span className="block w-2.5 h-2.5 rounded-full border"></span>
              <span>Livre</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="block w-2.5 h-2.5 rounded-full bg-primary"></span>
              <span>Selecionado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="block w-2.5 h-2.5 rounded-full bg-muted"></span>
              <span>Indisponível</span>
            </div>
            <div className="w-full mt-1.5 pt-1.5 border-t border-border/50 text-xs md:w-auto md:mt-0 md:pt-0 md:border-t-0 md:ml-auto">
              Antecedência mínima de 5 dias
            </div>
          </div>

          {/* DESCRIÇÃO DA SALA (NOVA SEÇÃO) */}
          {room.description && (
            <div className="pt-4 border-t border-border/60">
              <h5 className="text-xs font-semibold text-[#384050] uppercase tracking-wider mb-1.5">
                Sobre o Espaço
              </h5>
              <p className="text-[13px] leading-relaxed text-muted-foreground/90">
                {room.description}
              </p>
            </div>
          )}

        </div>
        </div>

        {/* Right side: Image Carousel + Booking Summary */}
        <div className="w-full max-w-md mx-auto 2xl:max-w-none 2xl:mx-0 2xl:w-[280px] shrink-0 flex flex-col gap-4">
        {/* Image Carousel */}
        <div className="relative aspect-video w-full overflow-hidden rounded-lg group bg-gray-100">
          {roomImages.map((img, idx) => (
            <Image
              key={idx}
              src={img}
              alt={`${room.name} - Foto ${idx + 1}`}
              fill
              className={cn(
                "object-cover cursor-pointer transition-opacity duration-300 ease-in-out",
                idx === carouselIndex ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"
              )}
              sizes="320px"
              onClick={() => setIsLightboxOpen(true)}
              priority={idx === 0}
            />
          ))}

          {isRoomDetailsLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/10 backdrop-blur-[2px] transition-all duration-300">
              <Loader2 className="size-8 animate-spin text-white drop-shadow-md" />
            </div>
          )}  

          {roomImages.length > 1 && (
            <div className="absolute inset-0 z-20 flex items-center justify-between p-2 pointer-events-none">
              {/* Previous button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handlePrevImage()
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md hover:bg-background pointer-events-auto cursor-pointer"
                aria-label="Imagem anterior"
              >
                <ChevronLeft className="size-5" />
              </button>

              {/* Next button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleNextImage()
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md hover:bg-background pointer-events-auto cursor-pointer"
                aria-label="Pr\u00f3xima imagem"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          )}

              {/* Dot indicators (Bottom) */}
              {roomImages.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
                {roomImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCarouselIndex(idx)}
                    className={cn(
                      "size-2 rounded-full transition-all",
                      idx === carouselIndex
                        ? "bg-background w-4"
                        : "bg-background/60 hover:bg-background/80"
                    )}
                    aria-label={`Ir para imagem ${idx + 1}`}
                  />
                ))}
              </div>
              )}

              {/* Counter (Top Right) */}
              {roomImages.length > 1 && (
                <div className="absolute top-2 right-2 z-20 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                  {carouselIndex + 1}/{roomImages.length}
                </div>
              )}
        </div>

        {/* Lightbox dialog */}
        <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
          <DialogContent 
            className="max-w-[90vw] h-[85vh] md:max-w-6xl p-0 border-none bg-white shadow-xl overflow-hidden flex flex-col ring-0 focus:outline-none focus-visible:outline-none rounded-xl"
            onInteractOutside={(e) => {
              const target = e.target as Element;
              if (target?.closest?.('#whatsapp-button')) {
                e.preventDefault();
              }
            }}
          >
            <DialogTitle className="sr-only">
              Galeria de imagens - {room.name}
            </DialogTitle>
            
            <div className="relative flex-1 w-full flex items-center justify-center bg-gray-50/50 group overflow-hidden">
              {/* Close Button - Custom Custom styled for better visibility */}
              <button
                onClick={() => setIsLightboxOpen(false)}
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/80 text-gray-500 hover:bg-white hover:text-gray-900 transition-all shadow-sm"
              >
                <X className="size-6" />
              </button>

              {/* Main Image */}
              {roomImages.map((img, idx) => (
                <Image
                  key={idx}
                  src={img}
                  alt={`${room.name} - Foto ${idx + 1}`}
                  fill
                  className={cn(
                    "object-contain transition-opacity duration-300 ease-in-out",
                    idx === carouselIndex ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                  )}
                  sizes="100vw"
                  priority={idx === 0}
                />
              ))}
              
              {/* Navigation Controls */}
              {roomImages.length > 1 && (
                <>
              <button
                onClick={handlePrevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/80 text-gray-700 hover:bg-white hover:text-black transition-all shadow-sm"
                aria-label="Imagem anterior"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/80 text-gray-700 hover:bg-white hover:text-black transition-all shadow-sm"
                aria-label="Próxima imagem"
              >
                <ChevronRight className="size-6" />
              </button>
                </>
              )}
            </div>

            {/* Thumbnails Strip */}
            {roomImages.length > 1 && (
              <div className="h-24 shrink-0 w-full bg-white border-t p-4 flex items-center justify-center gap-3 overflow-x-auto">
                {roomImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCarouselIndex(idx)}
                    className={cn(
                      "relative h-full aspect-[4/3] overflow-hidden rounded-md border-2 transition-all",
                      idx === carouselIndex
                        ? "border-primary ring-2 ring-primary/20 opacity-100"
                        : "border-transparent opacity-50 hover:opacity-100 hover:border-gray-200"
                    )}
                  >
                    <Image
                      src={img}
                      alt={`Miniatura ${idx + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Booking Summary */}
        <div className="flex flex-col gap-2">
          <h4 className="text-lg font-bold text-[#384050]">
            Resumo da Reserva
          </h4>

          {/* Default Time Selector Box */}
          {(!startTime || !endTime || bookings.length === 0) && (
          <div className="rounded-lg border bg-card p-3 shadow-sm">
            <h5 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Definir Horário
            </h5>
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <select
                    value={draftStartTime}
                    onChange={(e) => {
                      setDraftStartTime(e.target.value)
                      setDraftEndTime("")
                    }}
                    disabled={availabilityLoading}
                    className="w-full appearance-none cursor-pointer rounded-md border bg-background px-2 py-1.5 pr-6 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Início</option>
                    {draftStartOptions.map((opt) => (
                      <option key={opt.time} value={opt.time} disabled={opt.disabled}>{opt.time} {opt.disabled ? "(Ocupado)" : ""}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
                </div>
                <div className="relative">
                  <select
                    value={draftEndTime}
                    onChange={(e) => setDraftEndTime(e.target.value)}
                    disabled={!draftStartTime || availabilityLoading}
                    className="w-full appearance-none cursor-pointer rounded-md border bg-background px-2 py-1.5 pr-6 text-sm disabled:opacity-50 disabled:cursor-not-allowed focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Término</option>
                    {draftEndOptions.map((opt) => (
                      <option key={opt.time} value={opt.time} disabled={opt.disabled}>{opt.time} {opt.disabled ? "(Ocupado)" : ""}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              <button
                onClick={handleDefineTime}
                disabled={bookings.length === 0 || !draftStartTime || !draftEndTime || availabilityLoading}
                className={cn(
                  "w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {availabilityLoading ? "Verificando..." : "Definir Horário"}
              </button>
            </div>
          </div>
          )}

          {/* Pending bookings grouped by room, current room first */}
          {pendingByRoom.map((group, groupIdx) => {
            const isCurrentRoom = group.roomId === room.id
            const hasConfirmedItems = group.items.some(b => b.confirmedToCart)
            const hasPendingItems = group.items.some(b => !b.confirmedToCart)
            return (
              <div key={group.roomId} className={cn(
                "rounded-lg border border-border bg-card overflow-hidden",
                groupIdx > 0 && "mt-1"
              )}>
                {/* Room group header */}
                <div className="flex items-center gap-1.5 border-b border-border/60 px-3 py-2.5">
                  <span className="text-sm font-bold text-[#384050]">{group.roomName}</span>
                  <span className="text-[10px] text-muted-foreground font-medium">({group.items.length} {group.items.length === 1 ? "dia" : "dias"})</span>
                  {hasConfirmedItems && (
                    <span className="text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">No carrinho</span>
                  )}
                  {!isCurrentRoom && (
                    <button
                      onClick={() => onSwitchRoom?.(group.roomId)}
                      className="ml-auto text-[11px] font-medium text-primary cursor-pointer hover:underline"
                    >
                      Editar
                    </button>
                  )}
                </div>

                {/* Items — separated by thin border-bottom, no individual cards */}
                {group.items.map((item, itemIdx) => {
                  const isUnsaved = unsavedIds.includes(item.id)
                  const isLast = itemIdx === group.items.length - 1

                  const roomBuffer = room.cleaning_buffer ?? 0;

                  const itemStartOptions = isCurrentRoom ? dynamicTimeOptions.slice(0, -1).map(time => {
                    const occupied = item.selectedRange.from && isSlotOccupied(item.selectedRange.from, time, occupiedSlots, roomBuffer);
                    return { time, disabled: !!occupied };
                  }) : [];

                  const getItemEndOptions = (start: string) => {
                    if (!item.selectedRange.from) return [];
                    const startIdx = dynamicTimeOptions.indexOf(start);
                    if (startIdx === -1) return [];
                    const options = [];
                    let hitBlock = false;
                    for (let i = startIdx + 1; i < dynamicTimeOptions.length; i++) {
                      const time = dynamicTimeOptions[i];
                      if (hitBlock) {
                        options.push({ time, disabled: true });
                        continue;
                      }
                      const available = isRangeAvailable(item.selectedRange.from, start, time, occupiedSlots, dynamicTimeOptions, roomBuffer);
                      if (!available) {
                        hitBlock = true;
                        options.push({ time, disabled: true });
                      } else {
                        options.push({ time, disabled: false });
                      }
                    }
                    return options;
                  };
                  const isStartOccupied = !!(item.startTime && item.selectedRange.from && isSlotOccupied(item.selectedRange.from, item.startTime, occupiedSlots, roomBuffer));
                  const itemEndOptions = isCurrentRoom && item.startTime && !isStartOccupied ? getItemEndOptions(item.startTime) : [];

                  return (isCurrentRoom && !item.confirmedToCart) ? (
                    <div
                      key={item.id}
                      className={cn(
                        "flex flex-col gap-2 px-3 py-2.5 text-sm",
                        !isLast && "border-b border-border/40",
                        (item.hasConflict || isStartOccupied) && "bg-red-50/50"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-medium">{item.selectedRange.from?.toLocaleDateString("pt-BR")}</span>
                        <button
                          onClick={() => onRemoveBooking(item.id)}
                          className="p-1 hover:bg-red-100 cursor-pointer rounded-md text-muted-foreground hover:text-red-600 transition-colors"
                          title="Remover"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                      {isStartOccupied && (
                        <span className="text-xs text-red-600 font-medium leading-tight">
                          Horário de início indisponível. Selecione outro horário.
                        </span>
                      )}
                      {item.hasConflict && !isStartOccupied && (
                        <span className="text-xs text-red-600 font-medium leading-tight">
                          O horário selecionado não está disponível.
                        </span>
                      )}
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={item.startTime}
                            onChange={(e) => onUpdateBooking(item.id, { startTime: e.target.value, endTime: "" })}
                            disabled={availabilityLoading}
                            className={cn(
                              "w-full rounded-md border cursor-pointer bg-background px-2 py-1.5 text-sm",
                              isStartOccupied && "border-red-300"
                            )}
                          >
                            <option value="">Início</option>
                            {itemStartOptions.map((opt) => (
                              <option key={opt.time} value={opt.time} disabled={opt.disabled}>{opt.time} {opt.disabled ? "(Ocupado)" : ""}</option>
                            ))}
                          </select>
                          <select
                            value={isStartOccupied ? "" : item.endTime}
                            onChange={(e) => onUpdateBooking(item.id, { endTime: e.target.value })}
                            disabled={!item.startTime || isStartOccupied || availabilityLoading}
                            className="w-full rounded-md border cursor-pointer bg-background px-2 py-1.5 text-sm disabled:opacity-50"
                          >
                            <option value="">Término</option>
                            {itemEndOptions.map((opt) => (
                              <option key={opt.time} value={opt.time} disabled={opt.disabled}>{opt.time} {opt.disabled ? "(Ocupado)" : ""}</option>
                            ))}
                          </select>
                        </div>
                        {isUnsaved && (
                          <button
                            onClick={() => onSaveBooking(item.id)}
                            disabled={!item.startTime || !item.endTime}
                            className={cn(
                              "flex items-center justify-center cursor-pointer gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90",
                              "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                          >
                            <Save className="size-3" />
                            Salvar Horário
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      key={item.id}
                      className={cn(
                        "flex flex-col gap-1 px-3 py-2.5 text-sm",
                        !isLast && "border-b border-border/40",
                        item.hasConflict && "bg-red-50/50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{item.selectedRange.from?.toLocaleDateString("pt-BR")}</span>
                        <span className="text-xs text-muted-foreground">{item.startTime} às {item.endTime}</span>
                      </div>
                      {item.hasConflict && (
                        <span className="text-xs text-red-600 font-medium leading-tight">
                          Horário indisponível
                        </span>
                      )}
                    </div>
                  )
                })}
                {/* Subtotal da sala */}
                {group.items.some(i => i.price > 0) && (() => {
                  const sub = group.items.reduce((sum, i) => sum + (i.price || 0), 0)
                  return (
                    <div className="flex flex-col gap-0.5 px-3 py-2 border-t border-border/60 bg-slate-50/50">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-muted-foreground">Não Associado</span>
                        <span className="text-[11px] font-semibold text-[#384050]">R$ {sub.toFixed(2).replace(".", ",")}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-primary font-medium">Associado</span>
                        <span className="text-[11px] font-bold text-primary">R$ {(sub * 0.9).toFixed(2).replace(".", ",")}</span>
                      </div>
                      {isCurrentRoom && (
                        <div className="mt-1">
                          <p className="text-[10px] text-muted-foreground">* Para associados, o desconto pode chegar até 30%.</p>
                          <details className="group text-[10px] mt-0.5">
                            <summary className="inline-flex items-center gap-1 text-primary cursor-pointer hover:underline font-medium">
                              <Info className="size-3" />
                              Saiba mais
                            </summary>
                            <div className="mt-1 rounded-md bg-blue-50 border border-blue-100 p-2 text-[11px] text-blue-900 leading-relaxed">
                              <span className="font-semibold">Desconto por tempo de associação:</span>
                              <ul className="mt-0.5 ml-3 list-disc space-y-0.5">
                                <li>Até 12 meses: <strong>10%</strong></li>
                                <li>De 13 a 24 meses: <strong>20%</strong></li>
                                <li>Acima de 24 meses: <strong>30%</strong></li>
                              </ul>
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )
          })}

              {/* Confirm Button */}
              {bookings.length > 0 && startTime && endTime && (
              <button
                onClick={onConfirm}
                disabled={!canConfirm}
                className={cn(
                  "mt-2 w-full rounded-lg border-2 cursor-pointer border-[#384050] px-6 py-3 text-base font-semibold text-[#384050] transition-colors",
                  "hover:bg-[#384050] hover:text-background",
                  "disabled:cursor-not-allowed disabled:opacity-40"
                )}
              >
                Adicionar sala
              </button>
              )}
        </div>
      </div>
      </div>
    </div>
  )
}
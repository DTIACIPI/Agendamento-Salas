"use client"

import { useState, useEffect, useRef } from "react"
import type { OccupiedSlot } from "@/app/page"
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
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Loader2,
  CheckCircle2,
} from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import type { Room } from "@/components/room-list"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

// Generate 30-minute interval time options from 08:00 to 22:00
function generateTimeOptions(): string[] {
  const times: string[] = []
  for (let h = 8; h <= 22; h++) {
    times.push(`${String(h).padStart(2, "0")}:00`)
    if (h < 22) {
      times.push(`${String(h).padStart(2, "0")}:30`)
    }
  }
  return times
}

export const TIME_OPTIONS = generateTimeOptions()

const timeToMinutes = (time: string): number => {
  if (!time) return 0;
  // Pega estritamente os 5 primeiros caracteres ("12:00:00" vira "12:00")
  const cleanTime = time.substring(0, 5);
  const [hours, minutes] = cleanTime.split(':').map(Number);
  
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return (hours * 60) + minutes;
};

export function isSlotOccupied(
  date: Date,
  time: string,
  occupiedSlots: OccupiedSlot[]
): boolean {
  if (!date || !time) return false;
  
  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const timeInMinutes = timeToMinutes(time);

  for (const slot of occupiedSlots) {
    if (slot.date === dateKey) {
      // Cria a margem de limpeza (30 min antes e 30 min depois)
      const startInMinutes = timeToMinutes(slot.startTime) - 30;
      const endInMinutes = timeToMinutes(slot.endTime) + 30;
      
      // Bloqueia se o horário cair EXATAMENTE dentro da margem de limpeza.
      // Usamos "<" (menor estrito) no endInMinutes para que a opção de 12:30 fique perfeitamente LIVRE.
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
  occupiedSlots: OccupiedSlot[]
): boolean {
  const startIdx = TIME_OPTIONS.indexOf(start);
  const endIdx = TIME_OPTIONS.indexOf(end);
  if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) return false;

  for (let i = startIdx; i < endIdx; i++) {
    if (isSlotOccupied(date, TIME_OPTIONS[i], occupiedSlots)) return false;
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
  bookings: any[] // Using any for simplicity in diff, ideally import BookingItem type
  onDaySelect: (date: Date) => void
  onRemoveBooking: (id: string) => void
  onEditBooking: (id: string) => void
  onUpdateBooking: (id: string, data: any) => void
  onSaveBooking: (id: string) => void
  unsavedIds: string[]
  totalPrice: number
  onApplyDefaultTime: (start: string, end: string) => void
  onMonthChange: (date: Date) => void;
  occupiedSlots: OccupiedSlot[];
  availabilityLoading: boolean;
  isRoomDetailsLoading?: boolean;
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
  onRemoveBooking,
  onEditBooking,
  onUpdateBooking,
  onSaveBooking,
  unsavedIds,
  onApplyDefaultTime,
  totalPrice,
  onMonthChange,
  occupiedSlots,
  availabilityLoading,
  isRoomDetailsLoading,
}: BookingCalendarProps) {
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  const [draftStartTime, setDraftStartTime] = useState(startTime)
  const [draftEndTime, setDraftEndTime] = useState(endTime)
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
  const selectionKey = bookings.map((b) => `${b.id}-${b.selectedRange.from?.getTime() || 0}`).join("-")

  // Reset carousel when room changes
  useEffect(() => {
    setCarouselIndex(0)
    setDraftStartTime(startTime)
    setDraftEndTime(endTime)
  }, [room.id, startTime, endTime]) // Sync if parent resets

  const draftStartOptions = TIME_OPTIONS.slice(0, -1).map(time => {
    return { time, disabled: false };
  });

  const getDraftEndOptions = (start: string) => {
    const startIdx = TIME_OPTIONS.indexOf(start);
    if (startIdx === -1) return [];
    const options = [];
    for (let i = startIdx + 1; i < TIME_OPTIONS.length; i++) {
      const time = TIME_OPTIONS[i];
      options.push({ time, disabled: false });
    }
    return options;
  };
  const draftEndOptions = draftStartTime ? getDraftEndOptions(draftStartTime) : [];

  const hasIncompleteItems = bookings.some(b => !b.startTime || !b.endTime)
  const hasConflicts = bookings.some(b => b.hasConflict)
  const canConfirm = bookings.length > 0 && !hasIncompleteItems && !hasConflicts

  const roomImages = room.images && room.images.length > 0 ? room.images : [room.image]

  const isDateFullyBooked = (date: Date) => {
    // Consider a date fully booked if all time slots are occupied
    return TIME_OPTIONS.slice(0, -1).every(t => isSlotOccupied(date, t, occupiedSlots));
  };

  const disabledDates = [
    { before: new Date(new Date().setHours(0, 0, 0, 0)) },
    { dayOfWeek: [0] }, // Disable all Sundays
    isDateFullyBooked
  ];

  const handlePrevImage = () => {
    setCarouselIndex((prev) => (prev === 0 ? roomImages.length - 1 : prev - 1))
  }

  const handleNextImage = () => {
    setCarouselIndex((prev) => (prev === roomImages.length - 1 ? 0 : prev + 1))
  }

  const handleDefineTime = () => {
    onApplyDefaultTime(draftStartTime, draftEndTime)
  }

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
        <div className="rounded-lg border bg-card px-8 py-6 flex flex-wrap justify-center gap-6 xl:justify-between">
            <div className="flex-1 flex justify-center">
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
            <div className="flex-1 flex justify-center">
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
        <div className="mt-2 border rounded-lg bg-card px-8 py-6 text-sm text-muted-foreground">
          
          {/* amenities icons DINÂMICOS */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5 pb-3 mb-3 border-b text-[#384050]">
            
            {/* Capacidade Fixa Sempre Visível */}
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <Users className="size-4 text-primary" />
              <span>Capacidade: {room.capacity} pessoas</span>
            </div>

            {/* Loop das Comodidades do Banco de Dados */}
            {room.amenities && room.amenities.length > 0 ? (
              room.amenities.map((amenity, index) => {
                let Icon = CheckCircle2; 
                const text = amenity.toLowerCase();
                if (text.includes("projetor") || text.includes("tela")) Icon = Monitor;
                else if (text.includes("internet") || text.includes("wi-fi") || text.includes("wifi")) Icon = Wifi;
                
                return (
                  <div key={index} className="flex items-center gap-1.5 whitespace-nowrap">
                    <Icon className="size-4 text-primary" />
                    <span>{amenity}</span>
                  </div>
                )
              })
            ) : (
              <span className="text-xs italic opacity-60">Nenhuma comodidade extra listada</span>
            )}
          </div>

          {/* color legend and rule */}
          <div className="flex flex-wrap items-center gap-6 md:gap-8 pb-4">
            <div className="flex items-center gap-2">
              <span className="block w-3 h-3 rounded-full border"></span>
              <span>Livre</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="block w-3 h-3 rounded-full bg-primary"></span>
              <span>Selecionado</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="block w-3 h-3 rounded-full bg-muted"></span>
              <span>Indisponível</span>
            </div>
            <div className="ml-auto pl-6 border-l border-border hidden md:block">
              Reservas com antecedência mínima de 24 horas
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
        <div className="w-full 2xl:w-[320px] shrink-0 flex flex-col gap-4">
        {/* Image Carousel */}
        <div className="relative aspect-video w-full overflow-hidden rounded-lg group">
          <Image
            src={roomImages[carouselIndex]}
            alt={`${room.name} - Foto ${carouselIndex + 1}`}
            fill
            className="object-cover cursor-pointer"
            sizes="320px"
            onClick={() => setIsLightboxOpen(true)}
          />

          {isRoomDetailsLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 backdrop-blur-[2px] transition-all duration-300">
              <Loader2 className="size-8 animate-spin text-white drop-shadow-md" />
            </div>
          )}  

          {roomImages.length > 1 && (
            <div className="absolute inset-0 flex items-center justify-between p-2 pointer-events-none">
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
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
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
                <div className="absolute top-2 right-2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
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
              <Image
                key={carouselIndex} // Force re-render for animation
                src={roomImages[carouselIndex]}
                alt={`${room.name} - Foto ${carouselIndex + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
              
              {/* Navigation Controls */}
              {roomImages.length > 1 && (
                <>
              <button
                onClick={handlePrevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 text-gray-700 hover:bg-white hover:text-black transition-all shadow-sm"
                aria-label="Imagem anterior"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 text-gray-700 hover:bg-white hover:text-black transition-all shadow-sm"
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
          {(!startTime || !endTime) && (
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
                    disabled={bookings.length === 0 || availabilityLoading}
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
                    disabled={bookings.length === 0 || !draftStartTime || availabilityLoading}
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

          {/* List of Added Bookings */}
          {bookings.length > 0 && startTime && endTime && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Itens Adicionados</span>
              {bookings.map((item) => {
                const isUnsaved = unsavedIds.includes(item.id)
                
                const itemStartOptions = TIME_OPTIONS.slice(0, -1).map(time => {
                  const occupied = item.selectedRange.from && isSlotOccupied(item.selectedRange.from, time, occupiedSlots);
                  return { time, disabled: !!occupied };
                });
                
                const getItemEndOptions = (start: string) => {
                  const startIdx = TIME_OPTIONS.indexOf(start);
                  if (startIdx === -1) return [];
                  const options = [];
                  
                  for (let i = startIdx + 1; i < TIME_OPTIONS.length; i++) {
                    const time = TIME_OPTIONS[i];
                    
                    // Agora validamos apenas se o bloquinho imediatamente anterior a esta opção está ocupado.
                    const isOccupied = item.selectedRange.from && isSlotOccupied(item.selectedRange.from, TIME_OPTIONS[i - 1], occupiedSlots);
                    
                    options.push({ time, disabled: !!isOccupied });
                  }
                  return options;
                };
                const itemEndOptions = item.startTime ? getItemEndOptions(item.startTime) : [];

                return (
                <div 
                  key={item.id} 
                  className={cn(
                    "flex flex-col gap-2 p-3 rounded-lg border text-sm transition-colors bg-card shadow-sm",
                    item.hasConflict ? "border-red-300 bg-red-50/50" : "border-border"
                  )}
                >
                  <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">
                      {item.selectedRange.from?.toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  
                  <div className="flex gap-1">
                    <button
                      onClick={() => onRemoveBooking(item.id)}
                      className="p-1.5 hover:bg-red-100 cursor-pointer rounded-md text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remover"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  </div>

                    {item.hasConflict && (
                      <span className="text-xs text-red-600 font-medium leading-tight">
                        O horário selecionado não está disponível.
                      </span>
                    )}

                    <div className="flex flex-col gap-2 pt-2 border-t">
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={item.startTime}
                          onChange={(e) => onUpdateBooking(item.id, { startTime: e.target.value, endTime: "", hasConflict: false })}
                          disabled={availabilityLoading}
                          className="w-full rounded-md border cursor-pointer bg-background px-2 py-1.5 text-sm"
                        >
                          <option value="">Início</option>
                          {itemStartOptions.map((opt) => (
                            <option key={opt.time} value={opt.time} disabled={opt.disabled}>{opt.time} {opt.disabled ? "(Ocupado)" : ""}</option>
                          ))}
                        </select>
                        <select
                          value={item.endTime}
                          onChange={(e) => onUpdateBooking(item.id, { endTime: e.target.value, hasConflict: false })}
                          disabled={!item.startTime || availabilityLoading}
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
                          "mt-2 flex items-center justify-center cursor-pointer gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        <Save className="size-3" />
                        Salvar Horário
                      </button>
                      )}
                    </div>
                </div>
                )
              })}
            </div>
          )}

              {/* Estimated Price */}
              {(totalPrice > 0) && startTime && endTime && (
                <div className="flex flex-col gap-1.5 rounded-lg border bg-slate-50 p-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-[#384050]">Valor para Não Associado</span>
                    <span className="text-base font-bold text-[#384050]">R$ {totalPrice.toFixed(2).replace(".", ",")}</span>
                  </div>
                  <div className="flex justify-between items-center text-primary">
                <span className="text-sm font-bold">Valor para Associado</span>
                <span className="text-base font-bold">R$ {(totalPrice * 0.9).toFixed(2).replace(".", ",")}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    * Para associados, o desconto pode chegar até 30%.
                  </p>
                </div>
              )}

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
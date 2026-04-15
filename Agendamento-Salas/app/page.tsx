"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { Header } from "@/components/header"
import { RoomList, type Room } from "@/components/room-list"
import { BookingCalendar, isRangeAvailable, generateTimeOptions } from "@/components/booking-calendar"
import { CartDialog } from "@/components/cart-dialog"
import { Card } from "@/components/ui/card"
import { MousePointer2, Calendar as CalendarIcon, FileCheck, Sparkles, Clock } from "lucide-react"
import { calculateRoomPrice, API_BASE_URL, formatDateToISO, type SystemSettings, DEFAULT_SETTINGS } from "@/lib/utils"
import { toast } from "sonner"
import React from "react"

export interface BookingItem {
  id: string
  roomId: string
  selectedRange: { from?: Date; to?: Date }
  startTime: string
  endTime: string
  price: number
  hasConflict?: boolean
  confirmedToCart?: boolean
}

export interface OccupiedSlot {
  date: string;
  startTime: string;
  endTime: string;
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
    <div className="relative w-full overflow-hidden rounded-xl shadow-sm bg-white min-h-[320px] sm:min-h-[480px] lg:min-h-[580px] flex flex-col items-center p-6 sm:p-8 lg:p-12 border border-gray-100 font-sans">
      <div className="relative z-10 w-full flex flex-col items-center">
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h1 className="text-2xl sm:text-[32px] lg:text-[42px] font-bold text-[#184689] tracking-tight mb-2 leading-tight">Processo de Reserva</h1>
          <p className="text-gray-700/80 text-sm sm:text-base lg:text-[19px] font-normal">Siga estes três passos simples para começar:</p>
        </div>

        <div className="relative w-full max-w-lg">
          <div className="absolute left-[15px] top-4 bottom-4 w-[1px] bg-gray-200" />
          <div className="space-y-8 sm:space-y-10 lg:space-y-14">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center gap-4 sm:gap-6 lg:gap-8">
                <div className="flex items-center shrink-0">
                  <div className="z-20 w-8 h-8 rounded-full bg-[#184689] flex items-center justify-center text-white text-sm font-semibold">{step.id}</div>
                  <div className="ml-4 sm:ml-6 lg:ml-8 w-14 flex justify-center">{step.icon}</div>
                </div>
                <div className="flex flex-col">
                  <h3 className="text-base sm:text-lg lg:text-[22px] font-bold text-[#384050] tracking-tight">{step.title}</h3>
                  <p className="text-gray-700/70 text-sm sm:text-base lg:text-lg font-normal leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 sm:mt-16 lg:mt-24 flex flex-col items-center">
          <div className="flex items-center gap-2 text-gray-700/40 font-normal text-sm sm:text-base lg:text-lg">
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
  const roomCacheRef = useRef<Record<string, Room>>({})
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const bookingsRef = useRef<BookingItem[]>([])
  const cartRoomsRef = useRef<string[]>([])
  const roomsRef = useRef<Room[]>([])
  
  const availabilityCacheRef = useRef<Record<string, OccupiedSlot[]>>({});

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const selectedRoomId = selectedRoom?.id ?? null

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
  const [rooms, setRooms] = useState<Room[]>([])
  
  const [occupiedSlotsByRoom, setOccupiedSlotsByRoom] = useState<Record<string, OccupiedSlot[]>>({});
  
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [isRoomDetailsLoading, setIsRoomDetailsLoading] = useState(false);
  const [viewedMonth, setViewedMonth] = useState(new Date());
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);

  bookingsRef.current = bookings
  cartRoomsRef.current = cartRooms
  roomsRef.current = rooms

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/webhook/api/settings`, { cache: 'no-store' })
        if (!res.ok) throw new Error("Falha ao buscar configurações")
        const data = await res.json()
        if (data.success && data.settings) {
          setSystemSettings(data.settings)
        }
      } catch (error) {
        console.error("Erro ao carregar configurações do sistema:", error)
      } finally {
        setIsSettingsLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const dynamicTimeOptions = useMemo(
    () => generateTimeOptions(systemSettings.open_time, systemSettings.close_time),
    [systemSettings.open_time, systemSettings.close_time]
  )

  const handleSelectRoom = useCallback((room: Room) => {
    setSelectedRoom((prev) => {
      if (prev?.id === room.id) return null;
      return roomCacheRef.current[room.id] || room;
    })
  }, [])

  const handleSwitchRoom = useCallback((roomId: string) => {
    const target = rooms.find(r => r.id === roomId)
    if (target) {
      setSelectedRoom(roomCacheRef.current[roomId] || target)
    }
  }, [rooms])

  const handleStartTimeChange = useCallback((time: string) => {
    if (selectedRoom) setStartTimes(prev => ({ ...prev, [selectedRoom.id]: time }))
  }, [selectedRoom])

  const handleEndTimeChange = useCallback((time: string) => {
    if (selectedRoom) setEndTimes(prev => ({ ...prev, [selectedRoom.id]: time }))
  }, [selectedRoom])

  const handleToggleAssociado = useCallback(() => {
    setIsAssociado((v) => {
      if (v) {
        setCnpj("")
        setAssociadoMonths(0)
      }
      return !v
    })
  }, [])

  const handleCartOpen = useCallback(() => setIsCartOpen(true), [])

  useEffect(() => {
    if (!selectedRoomId || !selectedRoom) return;
    if (selectedRoom.images && selectedRoom.images.length > 1) return;

    const fetchRoomDetails = async () => {
      setIsRoomDetailsLoading(true);
      try {
        const apiUrl = `${API_BASE_URL}/webhook/977b3245-3a83-43db-97be-cbc2eb07f9dc/api/spaces/${selectedRoom.id}`;
        const res = await fetch(apiUrl, { cache: 'no-store' });
        
        if (!res.ok) throw new Error("Falha ao buscar dossiê no n8n");

        const text = await res.text();
        if (!text) throw new Error("Resposta vazia da API");
        const data = JSON.parse(text);
        const detailedRoom = Array.isArray(data) ? data[0] : data;
        
        if (detailedRoom && detailedRoom.id) {
          const enrichedRoom = { ...selectedRoom, ...detailedRoom };
          roomCacheRef.current[detailedRoom.id] = enrichedRoom;

          setSelectedRoom((prev) => {
            if (prev?.id !== detailedRoom.id) return prev;
            return enrichedRoom;
          });

          setRooms((prev) => prev.map(r => r.id === detailedRoom.id ? enrichedRoom : r));
        }
      } catch (error) {
        console.error("Erro ao carregar o dossiê da sala:", error);
        toast.error("Não foi possível carregar os detalhes da sala.")
      } finally {
        setIsRoomDetailsLoading(false);
      }
    };

    fetchRoomDetails();
  }, [selectedRoomId]);

  useEffect(() => {
    if (!selectedRoomId || !selectedRoom) return;

    const fetchRange = async () => {
      const startDate = new Date(viewedMonth.getFullYear(), viewedMonth.getMonth(), 1);
      const endDate = new Date(viewedMonth.getFullYear(), viewedMonth.getMonth() + 2, 0);

      const startStr = formatDateToISO(startDate);
      const endStr = formatDateToISO(endDate);

      const cacheKey = `${selectedRoom.id}_${startStr}_${endStr}`;

      if (availabilityCacheRef.current[cacheKey]) {
        setOccupiedSlotsByRoom(prev => ({ ...prev, [selectedRoom.id]: availabilityCacheRef.current[cacheKey] }));
        return; 
      }

      setAvailabilityLoading(true);
      try {
        const apiUrl = `${API_BASE_URL}/webhook/api/availability?space_id=${selectedRoom.id}&start_date=${startStr}&end_date=${endStr}`;
        
        const res = await fetch(apiUrl, { cache: 'no-store' });
        if (!res.ok) throw new Error("Falha ao buscar viabilidade do período");
        
        const textData = await res.text();
        
        if (!textData) {
          availabilityCacheRef.current[cacheKey] = [];
          setOccupiedSlotsByRoom(prev => ({ ...prev, [selectedRoom.id]: [] }));
          return;
        }

        const data = JSON.parse(textData);
        
        if (data.success && data.occupied) {
          availabilityCacheRef.current[cacheKey] = data.occupied;
          setOccupiedSlotsByRoom(prev => ({ ...prev, [selectedRoom.id]: data.occupied }));
        } else {
          availabilityCacheRef.current[cacheKey] = [];
          setOccupiedSlotsByRoom(prev => ({ ...prev, [selectedRoom.id]: [] }));
        }
      } catch (error) {
        console.error("Erro no prefetch de disponibilidade:", error);
      } finally {
        setAvailabilityLoading(false);
      }
    };

    fetchRange();
  }, [selectedRoomId, viewedMonth]);

  const handleSelectRange = useCallback(({ from, to }: { from?: Date; to?: Date }) => {
    if (!selectedRoom) return;
    setSelectedRanges(prev => ({ ...prev, [selectedRoom.id]: { from, to } }))
    setStartTimes(prev => ({ ...prev, [selectedRoom.id]: "" }))
    setEndTimes(prev => ({ ...prev, [selectedRoom.id]: "" }))
  }, [selectedRoom])

  const handleConfirm = useCallback(() => {
    if (!selectedRoom) return

    const currentBookings = bookingsRef.current
    const currentCartRooms = cartRoomsRef.current

    // Pega TODOS os rascunhos pendentes de TODAS as salas
    const pendingBookings = currentBookings.filter(
      b => b.startTime && b.endTime && !b.hasConflict && !b.confirmedToCart
    )

    if (pendingBookings.length === 0) {
      toast.error("Nenhum horário definido.", { description: "Defina horários válidos para avançar." });
      return;
    }

    const pendingRoomIds = [...new Set(pendingBookings.map(b => b.roomId))]

    setBookings(prev => {
      let next = [...prev];

      pendingBookings.forEach(pending => {
        // Encontra se esse dia JÁ EXISTIA no carrinho para a mesma sala
        const existingConfirmedIdx = next.findIndex(b =>
          b.roomId === pending.roomId &&
          b.confirmedToCart &&
          b.selectedRange.from?.toDateString() === pending.selectedRange.from?.toDateString() &&
          b.id !== pending.id
        );

        // Remove o velho do carrinho para não duplicar
        if (existingConfirmedIdx !== -1) {
          next.splice(existingConfirmedIdx, 1);
        }

        // Marca o rascunho como confirmado
        const pIdx = next.findIndex(b => b.id === pending.id);
        if (pIdx !== -1) {
          next[pIdx] = { ...next[pIdx], confirmedToCart: true };
        }
      });

      return next;
    });

    // Reseta horários padrão de todas as salas confirmadas
    setStartTimes(prev => {
      const next = { ...prev }
      pendingRoomIds.forEach(id => { next[id] = "" })
      return next
    })
    setEndTimes(prev => {
      const next = { ...prev }
      pendingRoomIds.forEach(id => { next[id] = "" })
      return next
    })

    // Adiciona ao carrinho salas que ainda não estavam
    const newRoomIds = pendingRoomIds.filter(id => !currentCartRooms.includes(id))
    if (newRoomIds.length > 0) {
      setCartRooms(prev => [...prev, ...newRoomIds])
    }

    const isUpdate = newRoomIds.length === 0
    toast.success(isUpdate ? "Carrinho atualizado!" : "Adicionado ao carrinho!")
  }, [selectedRoom])

  const roomSelectedRange = selectedRoom ? (selectedRanges[selectedRoom.id] || {}) : {}
  const roomStartTime = selectedRoom ? (startTimes[selectedRoom.id] || "") : ""
  const roomEndTime = selectedRoom ? (endTimes[selectedRoom.id] || "") : ""
  
  // O Calendário só mostra os rascunhos que ainda não foram para o carrinho
  const roomBookings = useMemo(
    () => selectedRoom ? bookings.filter((b) => b.roomId === selectedRoom.id && !b.confirmedToCart) : [],
    [bookings, selectedRoom]
  )
  
  const pendingGlobalBookings = useMemo(
    () => bookings.filter(b => !b.confirmedToCart),
    [bookings]
  )

  const roomTotal = useMemo(
    () => roomBookings.reduce((acc, item) => acc + item.price, 0),
    [roomBookings]
  )

  const currentPriceData = useMemo(() => {
    if (!selectedRoom) return { basePrice: 0, discountPercent: 0, discount: 0, finalPrice: 0, appliedMinimumHours: 0 }
    const range = selectedRanges[selectedRoom.id] || {}
    const sTime = startTimes[selectedRoom.id] || ""
    const eTime = endTimes[selectedRoom.id] || ""
    return calculateRoomPrice(
      selectedRoom,
      range.from || range.to,
      sTime,
      eTime,
      isAssociado ? associadoMonths : 0,
      range.from && range.to ? range : undefined,
      systemSettings
    )
  }, [selectedRoom, selectedRanges, startTimes, endTimes, isAssociado, associadoMonths, systemSettings])

  const handleRemoveBooking = useCallback((id: string) => {
    setBookings((prev) => prev.filter((item) => item.id !== id))
    setUnsavedIds((prev) => prev.filter((uId) => uId !== id))
  }, [])

  const handleSaveBooking = useCallback((id: string) => {
    setUnsavedIds((prev) => prev.filter((unsavedId) => unsavedId !== id))
  }, [])

  const handleUpdateBooking = useCallback((id: string, data: Partial<BookingItem>, markUnsaved = true) => {
    setBookings((prev) => prev.map((item) => {
      if (item.id === id) {
        const updatedItem = { ...item, ...data }
        const roomForBooking = rooms.find(r => r.id === item.roomId)
        if (roomForBooking && (data.startTime !== undefined || data.endTime !== undefined || data.selectedRange !== undefined)) {
          const priceData = calculateRoomPrice(
            roomForBooking,
            updatedItem.selectedRange.from || updatedItem.selectedRange.to,
            updatedItem.startTime,
            updatedItem.endTime,
            isAssociado ? associadoMonths : 0,
            updatedItem.selectedRange.from && updatedItem.selectedRange.to ? updatedItem.selectedRange : undefined,
            systemSettings
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
  }, [isAssociado, associadoMonths, rooms, systemSettings])

  const handleDaySelect = useCallback((date: Date) => {
    const performSelect = async () => { 
      if (!selectedRoom) return

      // Procura APENAS nos rascunhos pendentes. Ignora 100% se já está no carrinho ou não.
      const pendingBooking = bookings.find(
        (b) => b.roomId === selectedRoom.id && b.selectedRange.from?.toDateString() === date.toDateString() && !b.confirmedToCart
      )

      // Se clicou num rascunho que já está na tela, desmarca da tela (toggle)
      if (pendingBooking) {
        handleRemoveBooking(pendingBooking.id)
        return
      }

      // Se não é rascunho, cria um item NOVO.
      const sTime = startTimes[selectedRoom.id] || ""
      const eTime = endTimes[selectedRoom.id] || ""
      let price = 0
      let hasConflict = false

      if (sTime && eTime) {
        setAvailabilityLoading(true)
        try {
          const dateStr = formatDateToISO(date)
          const apiUrl = `${API_BASE_URL}/webhook/api/availability?space_id=${selectedRoom.id}&start_date=${dateStr}&end_date=${dateStr}`
          
          const res = await fetch(apiUrl, { cache: 'no-store' })
          if (!res.ok) throw new Error("API fetch failed")
          
          const textData = await res.text();
          let availabilityData: any = { success: false, occupied: [] };
          
          if (textData) {
            availabilityData = JSON.parse(textData);
          }

          let daySpecificOccupiedSlots: OccupiedSlot[] = []
          if (availabilityData.success && availabilityData.occupied) {
            daySpecificOccupiedSlots = availabilityData.occupied
            
            setOccupiedSlotsByRoom((prev) => {
              const roomSlots = prev[selectedRoom.id] || [];
              const filtered = roomSlots.filter((s) => s.date !== dateStr)
              return { ...prev, [selectedRoom.id]: [...filtered, ...daySpecificOccupiedSlots] }
            })
            
            const cacheKeys = Object.keys(availabilityCacheRef.current);
            for (const key of cacheKeys) {
              if (key.includes(selectedRoom.id)) {
                const cachedArray = availabilityCacheRef.current[key];
                const filteredCache = cachedArray.filter((s) => s.date !== dateStr);
                availabilityCacheRef.current[key] = [...filteredCache, ...daySpecificOccupiedSlots];
              }
            }
          }

          if (!isRangeAvailable(date, sTime, eTime, daySpecificOccupiedSlots, dynamicTimeOptions)) {
            hasConflict = true
          }

          const priceData = calculateRoomPrice(
            selectedRoom, date, sTime, eTime, isAssociado ? associadoMonths : 0, { from: date, to: date }, systemSettings
          )
          price = priceData.finalPrice
        } catch (error) {
          hasConflict = false
          try {
            const priceData = calculateRoomPrice(
              selectedRoom, date, sTime, eTime, isAssociado ? associadoMonths : 0, { from: date, to: date }, systemSettings
            )
            price = priceData.finalPrice
          } catch (e) {
            price = 0
          }
        } finally {
          setAvailabilityLoading(false)
        }
      }

      const newItem: BookingItem = {
        id: Math.random().toString(36).substr(2, 9),
        roomId: selectedRoom.id,
        selectedRange: { from: date, to: date },
        startTime: sTime,
        endTime: eTime,
        price: price,
        hasConflict,
        confirmedToCart: false, // É apenas um rascunho novo!
      }
      
      setBookings((prev) => {
        const newBookings = [...prev, newItem]
        return newBookings.sort((a, b) => {
          const dateA = a.selectedRange.from?.getTime() ?? 0
          const dateB = b.selectedRange.from?.getTime() ?? 0
          return dateA - dateB
        })
      })
    }
    performSelect();
  }, [bookings, startTimes, endTimes, selectedRoom, isAssociado, associadoMonths, handleRemoveBooking])

  const handleApplyDefaultTime = useCallback(async (start: string, end: string) => {
    if (!selectedRoom) return;
    setStartTimes(prev => ({ ...prev, [selectedRoom.id]: start }))
    setEndTimes(prev => ({ ...prev, [selectedRoom.id]: end }))
    
    // Atualiza APENAS os rascunhos que estão na tela
    const roomBookingsToUpdate = bookings.filter(item => item.roomId === selectedRoom.id && !item.confirmedToCart);
    if (roomBookingsToUpdate.length === 0) return;

    setAvailabilityLoading(true);

    try {
      const fetchPromises = roomBookingsToUpdate.map(item => {
        if (!item.selectedRange.from) return Promise.resolve({ success: false, date: null });
        const dateStr = formatDateToISO(item.selectedRange.from);
        const apiUrl = `${API_BASE_URL}/webhook/api/availability?space_id=${selectedRoom.id}&start_date=${dateStr}&end_date=${dateStr}`;
        
        return fetch(apiUrl, { cache: 'no-store' })
          .then(async res => {
            if (!res.ok) throw new Error(`API fetch failed for ${dateStr}`);
            const textData = await res.text();
            if (!textData) return { success: false, occupied: [] };
            return JSON.parse(textData);
          })
          .then(data => ({ ...data, date: dateStr }));
      });

      const results = await Promise.allSettled(fetchPromises);
      
      const availabilityMap = new Map<string, OccupiedSlot[]>();
      const allNewOccupiedSlots: OccupiedSlot[] = [];

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success) {
          const date = result.value.date;
          const occupied = result.value.occupied || [];
          if (date) {
            availabilityMap.set(date, occupied);
            allNewOccupiedSlots.push(...occupied);
          }
        }
      });

      setOccupiedSlotsByRoom(prev => {
        const roomSlots = prev[selectedRoom.id] || [];
        const datesToUpdate = Array.from(availabilityMap.keys());
        const filtered = roomSlots.filter(s => !datesToUpdate.includes(s.date));
        return { ...prev, [selectedRoom.id]: [...filtered, ...allNewOccupiedSlots] };
      });

      const cacheKeys = Object.keys(availabilityCacheRef.current);
      for (const key of cacheKeys) {
        if (key.includes(selectedRoom.id)) {
          let cachedArray = availabilityCacheRef.current[key];
          const datesToUpdate = Array.from(availabilityMap.keys());
          cachedArray = cachedArray.filter((s) => !datesToUpdate.includes(s.date));
          availabilityCacheRef.current[key] = [...cachedArray, ...allNewOccupiedSlots];
        }
      }

      setBookings(prev => prev.map(item => {
        if (item.roomId !== selectedRoom.id || item.confirmedToCart) return item;

        const dateStr = item.selectedRange.from ? formatDateToISO(item.selectedRange.from) : null;
        const dayOccupiedSlots = dateStr ? availabilityMap.get(dateStr) || [] : [];
        
        const hasConflict = !!(item.selectedRange.from && !isRangeAvailable(item.selectedRange.from, start, end, dayOccupiedSlots, dynamicTimeOptions));

        const priceData = calculateRoomPrice(selectedRoom, item.selectedRange.from, start, end, isAssociado ? associadoMonths : 0, item.selectedRange.from && item.selectedRange.to ? { from: item.selectedRange.from, to: item.selectedRange.to } : undefined, systemSettings);

        return { ...item, startTime: start, endTime: end, price: priceData.finalPrice, hasConflict };
      }));

    } catch (error) {
      console.error("Failed to apply default time and validate", error);
      toast.error("Erro ao aplicar o horário padrão. Tente novamente.")
    } finally {
      setAvailabilityLoading(false);
    }
  }, [selectedRoom, isAssociado, associadoMonths, bookings])

  useEffect(() => {
    setBookings((prev) => prev.map((item) => {
      const roomForBooking = rooms.find(r => r.id === item.roomId)
      if (!roomForBooking) return item
      
      const priceData = calculateRoomPrice(
        roomForBooking,
        item.selectedRange.from || item.selectedRange.to,
        item.startTime,
        item.endTime,
        isAssociado ? associadoMonths : 0,
        item.selectedRange.from && item.selectedRange.to ? item.selectedRange : undefined,
        systemSettings
      )

      return item.price !== priceData.finalPrice ? { ...item, price: priceData.finalPrice } : item
    }))
  }, [isAssociado, associadoMonths, rooms, systemSettings])

  useEffect(() => {
    setCartRooms(prev => prev.filter(roomId => bookings.some(b => b.roomId === roomId && b.confirmedToCart)))
  }, [bookings])

  useEffect(() => {
    if (selectedRoomId && calendarRef.current) {
      const yOffset = -100;
      const y = calendarRef.current.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, [selectedRoomId])

  const cartItemCount = cartRooms.length

  const handleRemoveFromCart = useCallback((roomId: string) => {
    setCartRooms((prev) => prev.filter((id) => id !== roomId))
    setBookings((prev) => prev.filter((b) => b.roomId !== roomId))
  }, [])

  useEffect(() => {
    const saved = sessionStorage.getItem("acipi_booking_state")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.selectedRoom) setSelectedRoom(parsed.selectedRoom)
        
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
        if (parsed.occupiedSlotsByRoom) setOccupiedSlotsByRoom(parsed.occupiedSlotsByRoom) 
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

  useEffect(() => {
    if (!isHydrated) return
    clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      const stateToSave = {
        selectedRoom,
        selectedRanges,
        startTimes,
        endTimes,
        isAssociado,
        associadoMonths,
        cnpj,
        unsavedIds,
        cartRooms,
        bookings,
        occupiedSlotsByRoom,
      }
      sessionStorage.setItem("acipi_booking_state", JSON.stringify(stateToSave))
    }, 500)
    return () => clearTimeout(saveTimeoutRef.current)
  }, [selectedRoom, selectedRanges, startTimes, endTimes, isAssociado, associadoMonths, cnpj, unsavedIds, cartRooms, bookings, occupiedSlotsByRoom, isHydrated])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header cartCount={cartItemCount} onCartClick={handleCartOpen} />

      <main className="mx-auto w-full max-w-[1920px] flex-1 px-4 py-6 lg:px-8">

        <div className="mb-6 px-3">
          <h2 className="text-2xl font-bold tracking-tight text-[#384050] text-balance">
            Agendamento de Salas
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {"Escolha um espa\u00e7o, selecione data e hor\u00e1rio para realizar seu pr\u00e9-agendamento."}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(420px,45%)_1fr] xl:grid-cols-[minmax(460px,38%)_1fr] 2xl:grid-cols-[minmax(530px,30%)_1fr] items-start">
          {/* Left Column: Room List */}
          <div className="flex flex-col gap-4">
            <RoomList
              selectedRoomId={selectedRoom?.id ?? null}
              onSelectRoom={handleSelectRoom}
              onLoadedSpaces={setRooms}
            />
          </div>

          {/* Right Column: Calendar + Summary */}
          <div ref={calendarRef} className="flex flex-col gap-4">
            {selectedRoom ? (
              selectedRoom.available ? (
                isSettingsLoading ? (
                  <Card className="px-6 py-12 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Carregando configurações...</span>
                    </div>
                  </Card>
                ) : (
                <>
                  <Card className="px-6 py-6">
                      <BookingCalendar
                        key={selectedRoom.id}
                        room={selectedRoom}
                        selectedRange={roomSelectedRange}
                        onDaySelect={handleDaySelect}
                        onSelectRange={handleSelectRange}
                        startTime={roomStartTime}
                        endTime={roomEndTime}
                        onStartTimeChange={handleStartTimeChange}
                        onEndTimeChange={handleEndTimeChange}
                        isAssociado={isAssociado}
                        onToggleAssociado={handleToggleAssociado}
                        associadoMonths={associadoMonths}
                        onAssociadoMonthsChange={setAssociadoMonths}
                        cnpj={cnpj}
                        onCnpjChange={setCnpj}
                        onConfirm={handleConfirm}
                        priceData={currentPriceData}
                        bookings={roomBookings}
                        allBookings={pendingGlobalBookings}
                        allRooms={rooms}
                        cartRooms={cartRooms}
                        onRemoveBooking={handleRemoveBooking}
                        onUpdateBooking={handleUpdateBooking}
                        onSaveBooking={handleSaveBooking}
                        unsavedIds={unsavedIds}
                        onApplyDefaultTime={handleApplyDefaultTime}
                        onMonthChange={setViewedMonth}
                        occupiedSlots={selectedRoom ? (occupiedSlotsByRoom[selectedRoom.id] || []) : []}
                        availabilityLoading={availabilityLoading}
                        totalPrice={roomTotal}
                        isRoomDetailsLoading={isRoomDetailsLoading}
                        onSwitchRoom={handleSwitchRoom}
                        systemSettings={systemSettings}
                      />
                  </Card>

                </>
                )
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
      <CartDialog
        open={isCartOpen}
        onOpenChange={setIsCartOpen}
        cartRooms={cartRooms}
        bookings={bookings}
        rooms={rooms}
        occupiedSlotsByRoom={occupiedSlotsByRoom}
        onRemoveRoom={handleRemoveFromCart}
        onRemoveBooking={handleRemoveBooking}
        onUpdateBooking={handleUpdateBooking}
        onCheckout={() => setIsCartOpen(false)}
        systemSettings={systemSettings}
      />
    </div>
  )
}
"use client"

import { useCallback, useEffect, useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { DashboardView } from "@/components/views/dashboard-view"
import { ReservasView } from "@/components/views/reservas-view"
import { AgendaView } from "@/components/views/agenda-view"
import { SalasView } from "@/components/views/salas-view"
import { CuponsView } from "@/components/views/cupons-view"
import { ContratosView } from "@/components/views/contratos-view"
import { ClientesView } from "@/components/views/clientes-view"
import { ConfigView } from "@/components/views/config-view"
import { BookingDossier } from "@/components/modals/booking-dossier"
import { CouponModal } from "@/components/modals/coupon-modal"
import { RoomModal } from "@/components/modals/room-modal"
import {
  initialCoupons,
  initialClients,
  initialContracts,
} from "@/lib/mock-data"
import { API_BASE_URL, DEFAULT_SETTINGS } from "@/lib/utils"
import type {
  BookingListItem,
  Coupon,
  Room,
  SystemSettings,
  TabId,
} from "@/lib/types"

export default function AdminDashboard() {
  // Layout states
  const [activeTab, setActiveTab] = useState<TabId>("dashboard")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Data states (mock — ainda sem rota GET)
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons)

  // Data states (API)
  const [rooms, setRooms] = useState<Room[]>([])
  const [isRoomsLoading, setIsRoomsLoading] = useState(true)
  const [bookings, setBookings] = useState<BookingListItem[]>([])
  const [isBookingsLoading, setIsBookingsLoading] = useState(true)

  // Modal states
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)

  // Global system settings
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SETTINGS)
  const [isSettingsLoading, setIsSettingsLoading] = useState(true)

  // Fetch: settings
  useEffect(() => {
    const controller = new AbortController()

    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/webhook/api/settings`, {
          cache: "no-store",
          signal: controller.signal,
        })
        if (!res.ok) throw new Error("Falha ao buscar configurações")
        const data = await res.json()
        if (data?.success && data.settings) {
          setSystemSettings(data.settings as SystemSettings)
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return
        console.error("Erro ao carregar configurações do sistema:", error)
      } finally {
        setIsSettingsLoading(false)
      }
    }

    fetchSettings()
    return () => controller.abort()
  }, [])

  // Fetch: spaces
  useEffect(() => {
    const controller = new AbortController()

    const fetchSpaces = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/webhook/api/spaces`, {
          cache: "no-store",
          signal: controller.signal,
        })
        if (!res.ok) throw new Error("Falha ao buscar salas")
        const data = await res.json()
        // API retorna [{"data": [...]}] (array com objeto) ou {"data": [...]}
        const payload = Array.isArray(data) ? data[0] : data
        if (Array.isArray(payload?.data)) {
          setRooms(
            payload.data.map((r: Record<string, unknown>) => ({
              ...r,
              available: r.available === 1 || r.available === true,
            })) as Room[]
          )
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return
        console.error("Erro ao carregar salas:", error)
      } finally {
        setIsRoomsLoading(false)
      }
    }

    fetchSpaces()
    return () => controller.abort()
  }, [])

  // Fetch: bookings
  const fetchBookings = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(`${API_BASE_URL}/webhook/api/bookings`, {
        cache: "no-store",
        signal,
      })
      if (!res.ok) throw new Error("Falha ao buscar reservas")
      const data = await res.json()
      if (Array.isArray(data?.data)) {
        setBookings(data.data as BookingListItem[])
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return
      console.error("Erro ao carregar reservas:", error)
    } finally {
      setIsBookingsLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchBookings(controller.signal)
    return () => controller.abort()
  }, [fetchBookings])

  // Handlers
  const handleBookingStatusChanged = async () => {
    await fetchBookings()
  }

  const handleToggleCoupon = (id: number) => {
    setCoupons((prev) => prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c)))
  }

  const openCouponModal = (coupon: Coupon | null) => {
    setEditingCoupon(coupon)
    setIsCouponModalOpen(true)
  }

  const openRoomModal = (room: Room | null) => {
    setEditingRoom(room)
    setIsRoomModalOpen(true)
  }

  const handleSaveCoupon = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsCouponModalOpen(false)
  }

  const handleRoomSaved = () => {
    setIsRoomModalOpen(false)
    // Re-fetch rooms
    setIsRoomsLoading(true)
    fetch(`${API_BASE_URL}/webhook/api/spaces`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const payload = Array.isArray(data) ? data[0] : data
        if (Array.isArray(payload?.data)) {
          setRooms(
            payload.data.map((r: Record<string, unknown>) => ({
              ...r,
              available: r.available === 1 || r.available === true,
            })) as Room[]
          )
        }
      })
      .catch(console.error)
      .finally(() => setIsRoomsLoading(false))
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden text-slate-900">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Topbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />

        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 relative">
          <div className="max-w-7xl mx-auto h-full">
            {activeTab === "dashboard" && <DashboardView />}
            {activeTab === "reservas" && (
              <ReservasView
                bookings={bookings}
                isLoading={isBookingsLoading}
                onOpenDossier={setSelectedBookingId}
              />
            )}
            {activeTab === "agenda" && (
              <AgendaView
                rooms={rooms}
                systemSettings={systemSettings}
                isSettingsLoading={isSettingsLoading}
              />
            )}
            {activeTab === "salas" && (
              <SalasView
                rooms={rooms}
                isLoading={isRoomsLoading}
                onOpenRoomModal={openRoomModal}
              />
            )}
            {activeTab === "cupons" && (
              <CuponsView
                coupons={coupons}
                onToggleCoupon={handleToggleCoupon}
                onOpenCouponModal={openCouponModal}
              />
            )}
            {activeTab === "contratos" && <ContratosView contracts={initialContracts} />}
            {activeTab === "clientes" && <ClientesView clients={initialClients} />}
            {activeTab === "config" && (
              <ConfigView
                systemSettings={systemSettings}
                isSettingsLoading={isSettingsLoading}
                onSettingsChange={setSystemSettings}
              />
            )}
          </div>
        </div>

        {/* Modais & Sheets */}
        <BookingDossier
          bookingId={selectedBookingId}
          onClose={() => setSelectedBookingId(null)}
          onStatusChanged={handleBookingStatusChanged}
        />
        <CouponModal
          open={isCouponModalOpen}
          editingCoupon={editingCoupon}
          onClose={() => setIsCouponModalOpen(false)}
          onSubmit={handleSaveCoupon}
        />
        <RoomModal
          open={isRoomModalOpen}
          editingRoom={editingRoom}
          onClose={() => setIsRoomModalOpen(false)}
          onSaved={handleRoomSaved}
        />
      </main>
    </div>
  )
}

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

  // Data states (API)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [isCouponsLoading, setIsCouponsLoading] = useState(true)

  // Data states (API)
  const [rooms, setRooms] = useState<Room[]>([])
  const [isRoomsLoading, setIsRoomsLoading] = useState(true)
  const [bookings, setBookings] = useState<BookingListItem[]>([])
  const [isBookingsLoading, setIsBookingsLoading] = useState(true)
  const [bookingsTotal, setBookingsTotal] = useState(0)
  const [bookingsPage, setBookingsPage] = useState(1)
  const BOOKINGS_PER_PAGE = 10

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
  const fetchSpaces = useCallback(async (signal?: AbortSignal) => {
    setIsRoomsLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/webhook/api/spaces`, {
        cache: "no-store",
        signal,
      })
      if (!res.ok) throw new Error("Falha ao buscar salas")
      const data = await res.json()
      // API retorna [{"data": [...]}] (array wrapping objeto)
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
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchSpaces(controller.signal)
    return () => controller.abort()
  }, [fetchSpaces])

  // Fetch: coupons
  const fetchCoupons = useCallback(async (signal?: AbortSignal) => {
    setIsCouponsLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/webhook/api/coupons`, {
        cache: "no-store",
        signal,
      })
      if (!res.ok) throw new Error("Falha ao buscar cupons")
      const data = await res.json()
      // API retorna array direto de cupons: [{cupom1}, {cupom2}]
      const list = Array.isArray(data) ? data : (data?.data ?? [])
      setCoupons(
        list.map((c: Record<string, unknown>) => ({
          ...c,
          is_active: c.is_active === 1 || c.is_active === true,
        })) as Coupon[]
      )
    } catch (error) {
      if ((error as Error).name === "AbortError") return
      console.error("Erro ao carregar cupons:", error)
    } finally {
      setIsCouponsLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchCoupons(controller.signal)
    return () => controller.abort()
  }, [fetchCoupons])

  // Fetch: bookings (paginado)
  const fetchBookings = useCallback(async (page?: number, signal?: AbortSignal) => {
    const p = page ?? bookingsPage
    const offset = (p - 1) * BOOKINGS_PER_PAGE
    setIsBookingsLoading(true)
    try {
      const res = await fetch(
        `${API_BASE_URL}/webhook/api/bookings?limit=${BOOKINGS_PER_PAGE}&offset=${offset}`,
        { cache: "no-store", signal },
      )
      if (!res.ok) throw new Error("Falha ao buscar reservas")
      const data = await res.json()
      if (Array.isArray(data?.data)) {
        setBookings(data.data as BookingListItem[])
        setBookingsTotal(typeof data.total === "number" ? data.total : 0)
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return
      console.error("Erro ao carregar reservas:", error)
    } finally {
      setIsBookingsLoading(false)
    }
  }, [bookingsPage])

  useEffect(() => {
    const controller = new AbortController()
    fetchBookings(bookingsPage, controller.signal)
    return () => controller.abort()
  }, [bookingsPage, fetchBookings])

  // Handlers
  const handleBookingStatusChanged = async () => {
    await fetchBookings(bookingsPage)
  }

  const handleBookingsPageChange = (page: number) => {
    setBookingsPage(page)
  }

  const openCouponModal = (coupon: Coupon | null) => {
    setEditingCoupon(coupon)
    setIsCouponModalOpen(true)
  }

  const handleCouponSaved = () => {
    setIsCouponModalOpen(false)
    fetchCoupons()
  }

  const handleDeleteCoupon = async (couponId: string) => {
    await fetch(`${API_BASE_URL}/webhook/859fd086-48d2-4255-a555-956f4a56e8c7/api/coupons/${couponId}`, {
      method: "DELETE",
    })
    await fetchCoupons()
  }

  const openRoomModal = (room: Room | null) => {
    setEditingRoom(room)
    setIsRoomModalOpen(true)
  }

  const handleRoomSaved = () => {
    setIsRoomModalOpen(false)
    fetchSpaces()
  }

  const handleDeleteRoom = async (roomId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/webhook/b843ead7-f97c-4674-ab95-82c9ee731171/api/spaces/${roomId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Falha ao excluir sala")
      fetchSpaces()
    } catch (error) {
      console.error("Erro ao excluir sala:", error)
    }
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
          <div className="max-w-7xl mx-auto pb-8">
            {activeTab === "dashboard" && <DashboardView />}
            {activeTab === "reservas" && (
              <ReservasView
                bookings={bookings}
                isLoading={isBookingsLoading}
                total={bookingsTotal}
                page={bookingsPage}
                perPage={BOOKINGS_PER_PAGE}
                onPageChange={handleBookingsPageChange}
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
                onDeleteRoom={handleDeleteRoom}
              />
            )}
            {activeTab === "cupons" && (
              <CuponsView
                coupons={coupons}
                isLoading={isCouponsLoading}
                onOpenCouponModal={openCouponModal}
                onDeleteCoupon={handleDeleteCoupon}
                onRefresh={fetchCoupons}
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
          onSaved={handleCouponSaved}
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

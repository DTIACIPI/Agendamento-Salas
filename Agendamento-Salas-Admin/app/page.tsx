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
import { EmpresasView } from "@/components/views/empresas-view"
import { ConfigView } from "@/components/views/config-view"
import { BookingDossier } from "@/components/modals/booking-dossier"
import { CompanyDossier } from "@/components/modals/company-dossier"
import { CouponModal } from "@/components/modals/coupon-modal"
import { RoomModal } from "@/components/modals/room-modal"
import {
  initialContracts,
} from "@/lib/mock-data"
import { API_BASE_URL, DEFAULT_SETTINGS } from "@/lib/utils"
import type {
  BookingListItem,
  Company,
  Coupon,
  Room,
  SystemSettings,
  TabId,
} from "@/lib/types"

export default function AdminDashboard() {
  // Layout states
  const VALID_TABS: TabId[] = ["dashboard", "reservas", "agenda", "salas", "cupons", "contratos", "empresas", "config"]
  const [activeTab, setActiveTab] = useState<TabId | null>(null)
  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as TabId
    setActiveTab(VALID_TABS.includes(hash) ? hash : "dashboard")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab)
    window.location.hash = tab
  }
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

  // Data states: companies (API)
  const [companies, setCompanies] = useState<Company[]>([])
  const [isCompaniesLoading, setIsCompaniesLoading] = useState(true)
  const [companiesPage, setCompaniesPage] = useState(1)
  const [companiesTotalPages, setCompaniesTotalPages] = useState(1)
  const [companiesTotalRecords, setCompaniesTotalRecords] = useState(0)
  const COMPANIES_PER_PAGE = 10

  // Modal states
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [bookingReturnCompanyId, setBookingReturnCompanyId] = useState<string | null>(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
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
      const text = await res.text()
      if (!text) { setBookings([]); setBookingsTotal(0); return }
      const data = JSON.parse(text)
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

  // Fetch: companies (paginado)
  const fetchCompanies = useCallback(async (page?: number, signal?: AbortSignal) => {
    const p = page ?? companiesPage
    setIsCompaniesLoading(true)
    try {
      const res = await fetch(
        `${API_BASE_URL}/webhook/api/companies?page=${p}&limit=${COMPANIES_PER_PAGE}`,
        { cache: "no-store", signal },
      )
      if (!res.ok) throw new Error("Falha ao buscar empresas")
      const data = await res.json()
      if (Array.isArray(data?.data)) {
        setCompanies(data.data as Company[])
      }
      if (data?.pagination) {
        setCompaniesTotalPages(data.pagination.total_pages ?? 1)
        setCompaniesTotalRecords(data.pagination.total_records ?? 0)
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return
      console.error("Erro ao carregar empresas:", error)
    } finally {
      setIsCompaniesLoading(false)
    }
  }, [companiesPage])

  useEffect(() => {
    const controller = new AbortController()
    fetchCompanies(companiesPage, controller.signal)
    return () => controller.abort()
  }, [companiesPage, fetchCompanies])

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

  const handleCompaniesPageChange = (page: number) => {
    setCompaniesPage(page)
  }

  const handleCompanyUpdated = () => {
    fetchCompanies(companiesPage)
  }

  // Aguardar leitura do hash antes de renderizar (evita flash no F5)
  if (activeTab === null) return null

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden text-slate-900">
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
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
                onOpenBooking={setSelectedBookingId}
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
            {activeTab === "empresas" && (
              <EmpresasView
                companies={companies}
                isLoading={isCompaniesLoading}
                page={companiesPage}
                totalPages={companiesTotalPages}
                totalRecords={companiesTotalRecords}
                onPageChange={handleCompaniesPageChange}
                onOpenDetail={setSelectedCompanyId}
              />
            )}
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
          onClose={() => {
            setSelectedBookingId(null)
            setBookingReturnCompanyId(null)
          }}
          onStatusChanged={handleBookingStatusChanged}
          onBack={bookingReturnCompanyId ? () => {
            setSelectedBookingId(null)
            setSelectedCompanyId(bookingReturnCompanyId)
            setBookingReturnCompanyId(null)
          } : undefined}
        />
        <CompanyDossier
          companyId={selectedCompanyId}
          companies={companies}
          onClose={() => setSelectedCompanyId(null)}
          onCompanyUpdated={handleCompanyUpdated}
          onOpenBooking={(bookingId) => {
            setBookingReturnCompanyId(selectedCompanyId)
            setSelectedCompanyId(null)
            setSelectedBookingId(bookingId)
          }}
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

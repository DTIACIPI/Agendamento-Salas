"use client"

import { useCallback, useEffect, useState } from "react"
import { AuthProvider, useAuth } from "@/lib/auth/auth-context"
import { AuthGuard } from "@/components/auth/auth-guard"
import { authFetch } from "@/lib/auth/auth-fetch"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { DashboardView } from "@/components/views/dashboard-view"
import { ReservasView } from "@/components/views/reservas-view"
import { AgendaView } from "@/components/views/agenda-view"
import { SalasView } from "@/components/views/salas-view"
import { CuponsView } from "@/components/views/cupons-view"
import { ContratosView } from "@/components/views/contratos-view"
import { EmpresasView } from "@/components/views/empresas-view"
import { UsersView } from "@/components/views/users-view"
import { ConfigView } from "@/components/views/config-view"
import { BookingDossier } from "@/components/modals/booking-dossier"
import { CompanyDossier } from "@/components/modals/company-dossier"
import { CouponModal } from "@/components/modals/coupon-modal"
import { RoomModal } from "@/components/modals/room-modal"
import { UserModal } from "@/components/modals/user-modal"
import { NewBookingModal } from "@/components/modals/new-booking-modal"
import { toast } from "sonner"
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
  User,
} from "@/lib/types"

export default function Page() {
  return (
    <AuthProvider>
      <AuthGuard>
        <AdminDashboard />
      </AuthGuard>
    </AuthProvider>
  )
}

const VALID_TABS: TabId[] = ["dashboard", "reservas", "agenda", "salas", "cupons", "contratos", "empresas", "usuarios", "config"]
const SUPER_ADMIN_TABS: TabId[] = ["usuarios"]
const BOOKINGS_PER_PAGE = 10
const COMPANIES_PER_PAGE = 10

function AdminDashboard() {
  const { user, isSuperAdmin } = useAuth()

  const [activeTab, setActiveTab] = useState<TabId | null>(null)
  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as TabId
    const initial = VALID_TABS.includes(hash) ? hash : "dashboard"
    // Route guard: bloqueia abas restritas para nao-Super
    if (SUPER_ADMIN_TABS.includes(initial) && !isSuperAdmin) {
      setActiveTab("dashboard")
      window.location.hash = "dashboard"
      toast.error("Acesso negado. Apenas Super Admins podem acessar esta area.")
      return
    }
    setActiveTab(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const handleTabChange = (tab: TabId) => {
    if (SUPER_ADMIN_TABS.includes(tab) && !isSuperAdmin) {
      toast.error("Acesso negado. Apenas Super Admins podem acessar esta area.")
      return
    }
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

  // Data states: companies (API)
  const [companies, setCompanies] = useState<Company[]>([])
  const [isCompaniesLoading, setIsCompaniesLoading] = useState(true)
  const [companiesPage, setCompaniesPage] = useState(1)
  const [companiesTotalPages, setCompaniesTotalPages] = useState(1)
  const [companiesTotalRecords, setCompaniesTotalRecords] = useState(0)

  // Data states: users (API)
  const [users, setUsers] = useState<User[]>([])
  const [isUsersLoading, setIsUsersLoading] = useState(true)

  // Modal states
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [bookingReturnCompanyId, setBookingReturnCompanyId] = useState<string | null>(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false)

  // Global system settings
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SETTINGS)
  const [isSettingsLoading, setIsSettingsLoading] = useState(true)

  // Fetch: settings
  useEffect(() => {
    const controller = new AbortController()

    const fetchSettings = async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/webhook/api/settings`, {
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
      const res = await authFetch(`${API_BASE_URL}/webhook/api/spaces`, {
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
      const res = await authFetch(`${API_BASE_URL}/webhook/api/coupons`, {
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
      const res = await authFetch(
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
      const res = await authFetch(
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

  // Fetch: users (somente Super Admin) — GET /webhook/api/users
  const fetchUsers = useCallback(async (signal?: AbortSignal) => {
    setIsUsersLoading(true)
    try {
      const res = await authFetch(`${API_BASE_URL}/webhook/api/users`, {
        cache: "no-store",
        signal,
      })
      if (!res.ok) throw new Error("Falha ao buscar utilizadores")
      const text = await res.text()
      if (!text) { setUsers([]); return }
      const data = JSON.parse(text)

      // Normaliza: { success, data: [...] } ou { success, data: {...} } ou array direto
      const payload = data?.data ?? data
      const list: unknown[] = Array.isArray(payload) ? payload : (payload && typeof payload === "object" ? [payload] : [])

      setUsers(
        list.map((raw) => {
          const u = raw as Record<string, unknown>
          return {
            ...u,
            is_active: u.is_active === 1 || u.is_active === true,
            role: (u.role_name ?? u.role ?? "Admin") as User["role"],
          }
        }) as User[]
      )
    } catch (error) {
      if ((error as Error).name === "AbortError") return
      console.error("Erro ao carregar utilizadores:", error)
    } finally {
      setIsUsersLoading(false)
    }
  }, [])

  // So busca usuarios se for Super Admin (evita chamada 401 desnecessaria)
  useEffect(() => {
    if (!isSuperAdmin) return
    const controller = new AbortController()
    fetchUsers(controller.signal)
    return () => controller.abort()
  }, [isSuperAdmin, fetchUsers])

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
    await authFetch(`${API_BASE_URL}/webhook/859fd086-48d2-4255-a555-956f4a56e8c7/api/coupons/${couponId}`, {
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
      const res = await authFetch(`${API_BASE_URL}/webhook/b843ead7-f97c-4674-ab95-82c9ee731171/api/spaces/${roomId}`, {
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

  const openUserModal = (u: User | null) => {
    setEditingUser(u)
    setIsUserModalOpen(true)
  }

  const handleUserSaved = () => {
    setIsUserModalOpen(false)
    fetchUsers()
  }

  const handleToggleUserStatus = async (userId: string, activate: boolean) => {
    if (activate) {
      const target = users.find((u) => String(u.id) === String(userId))
      const role_id = target?.role === "Super Admin" ? 1 : 2
      const res = await authFetch(`${API_BASE_URL}/webhook/4a72b69f-b638-4681-9823-28f5d855af58/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ name: target?.name ?? "", role_id, is_active: 1 }),
      })
      if (!res.ok) throw new Error("Falha ao ativar usuario")
    } else {
      // Desativar: DELETE
      const res = await authFetch(`${API_BASE_URL}/webhook/4b4d1e81-fc13-4550-a4d7-9bbe71ae598e/api/users/${userId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Falha ao desativar usuario")
    }
    await fetchUsers()
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
        isSuperAdmin={isSuperAdmin}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Topbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onMenuClick={() => setIsMobileMenuOpen(true)}
          userName={user?.name}
          userRole={user?.role}
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
                onNewBooking={() => setIsNewBookingModalOpen(true)}
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
                isSuperAdmin={isSuperAdmin}
                onOpenRoomModal={openRoomModal}
                onDeleteRoom={isSuperAdmin ? handleDeleteRoom : undefined}
              />
            )}
            {activeTab === "cupons" && (
              <CuponsView
                coupons={coupons}
                isLoading={isCouponsLoading}
                onOpenCouponModal={isSuperAdmin ? openCouponModal : undefined}
                onDeleteCoupon={isSuperAdmin ? handleDeleteCoupon : undefined}
                canToggle={isSuperAdmin}
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
            {activeTab === "usuarios" && isSuperAdmin && (
              <UsersView
                users={users}
                isLoading={isUsersLoading}
                currentUserEmail={user?.email}
                onOpenUserModal={openUserModal}
                onToggleUserStatus={handleToggleUserStatus}
              />
            )}
            {activeTab === "config" && (
              <ConfigView
                systemSettings={systemSettings}
                isSettingsLoading={isSettingsLoading}
                onSettingsChange={isSuperAdmin ? setSystemSettings : undefined}
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
          isSuperAdmin={isSuperAdmin}
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
          isSuperAdmin={isSuperAdmin}
        />
        <UserModal
          open={isUserModalOpen}
          editingUser={editingUser}
          onClose={() => setIsUserModalOpen(false)}
          onSaved={handleUserSaved}
        />
        <NewBookingModal
          open={isNewBookingModalOpen}
          rooms={rooms}
          onClose={() => setIsNewBookingModalOpen(false)}
          onSaved={() => {
            setIsNewBookingModalOpen(false)
            fetchBookings(bookingsPage)
          }}
        />
      </main>
    </div>
  )
}

"use client"

import { useState } from "react"
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
  initialBookings,
  initialRooms,
  initialCoupons,
  initialClients,
  initialContracts,
} from "@/lib/mock-data"
import type { Booking, Room, Coupon, TabId } from "@/lib/types"

export default function AdminDashboard() {
  // Layout states
  const [activeTab, setActiveTab] = useState<TabId>("dashboard")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Data states
  const [bookings, setBookings] = useState<Booking[]>(initialBookings)
  const [rooms] = useState<Room[]>(initialRooms)
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons)

  // Modal states
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)

  // Handlers
  const handleSaveBooking = (updated: Booking) => {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
    setSelectedBooking(updated)
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
    // TODO: ligar ao state quando houver backend
  }

  const handleSaveRoom = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsRoomModalOpen(false)
    // TODO: ligar ao state quando houver backend
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
              <ReservasView bookings={bookings} onOpenDossier={setSelectedBooking} />
            )}
            {activeTab === "agenda" && <AgendaView rooms={rooms} />}
            {activeTab === "salas" && <SalasView rooms={rooms} onOpenRoomModal={openRoomModal} />}
            {activeTab === "cupons" && (
              <CuponsView
                coupons={coupons}
                onToggleCoupon={handleToggleCoupon}
                onOpenCouponModal={openCouponModal}
              />
            )}
            {activeTab === "contratos" && <ContratosView contracts={initialContracts} />}
            {activeTab === "clientes" && <ClientesView clients={initialClients} />}
            {activeTab === "config" && <ConfigView />}
          </div>
        </div>

        {/* Modais & Sheets */}
        <BookingDossier
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onSave={handleSaveBooking}
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
          onSubmit={handleSaveRoom}
        />
      </main>
    </div>
  )
}

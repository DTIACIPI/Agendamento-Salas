"use client"

import {
  LayoutDashboard, CalendarRange, DoorOpen, Ticket,
  FileSignature, Users, Settings, Calendar as CalIcon,
} from "lucide-react"
import type { TabId } from "@/lib/types"

interface NavItem {
  id: TabId
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "reservas", label: "Reservas", icon: CalendarRange },
  { id: "agenda", label: "Agenda Central", icon: CalIcon },
  { id: "salas", label: "Salas", icon: DoorOpen },
  { id: "cupons", label: "Cupons", icon: Ticket },
  { id: "contratos", label: "Contratos", icon: FileSignature },
  { id: "empresas", label: "Empresas", icon: Users },
  { id: "config", label: "Configuracoes", icon: Settings },
]

interface SidebarProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  isMobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ activeTab, onTabChange, isMobileOpen, onMobileClose }: SidebarProps) {
  return (
    <>
      {/* Overlay mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#184689] text-white transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex lg:flex-col shadow-xl ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 h-20 border-b border-white/10 px-6 shrink-0 bg-[#113262]">
          <div className="w-8 h-8 bg-white rounded flex items-center justify-center shadow-inner">
            <span className="text-[#184689] font-black text-xl leading-none">A</span>
          </div>
          <span className="text-xl font-bold tracking-tight">Admin ACIPI</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id)
                onMobileClose()
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.id
                  ? "bg-white text-[#184689] shadow-md"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5" /> {item.label}
            </button>
          ))}
        </nav>
      </aside>
    </>
  )
}

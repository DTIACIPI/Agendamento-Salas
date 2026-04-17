"use client"

import { useState, useRef, useEffect } from "react"
import { Menu, Search, Bell, LogOut, ChevronDown, User } from "lucide-react"
import { useAuth } from "@/lib/auth/auth-context"
import { ProfileModal } from "@/components/modals/profile-modal"

interface TopbarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  onMenuClick: () => void
  userName?: string
  userRole?: string
}

export function Topbar({ searchQuery, onSearchChange, onMenuClick, userName, userRole }: TopbarProps) {
  const { logout } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    if (isMenuOpen) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isMenuOpen])

  const initials = userName
    ? userName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?"

  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 relative z-10 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          className="lg:hidden p-2 rounded-md hover:bg-slate-100 text-slate-600"
          onClick={onMenuClick}
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg border border-slate-200 focus-within:border-[#184689] focus-within:ring-1 focus-within:ring-[#184689]/20 transition-all w-64 md:w-80">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar reserva, empresa..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
          <Bell className="w-6 h-6" />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
        </button>

        <div className="h-8 w-px bg-slate-200 hidden sm:block" />

        {/* User dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-9 h-9 rounded-full bg-[#184689]/10 border border-[#184689]/20 flex items-center justify-center text-[#184689] font-bold text-sm">
              {initials}
            </div>
            <div className="hidden sm:block text-sm text-left">
              <p className="font-semibold text-slate-700 leading-none">{userName ?? "Utilizador"}</p>
              <p className="text-slate-500 text-xs mt-1">{userRole ?? "Admin"}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 hidden sm:block transition-transform ${isMenuOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Dropdown menu */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-700 truncate">{userName}</p>
                <p className="text-xs text-slate-400 truncate mt-0.5">{userRole}</p>
              </div>
              <button
                onClick={() => {
                  setIsMenuOpen(false)
                  setIsProfileOpen(true)
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <User className="w-4 h-4 text-slate-400" />
                Meus Dados
              </button>
              <div className="border-t border-slate-100 my-1" />
              <button
                onClick={() => {
                  setIsMenuOpen(false)
                  logout()
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>

      <ProfileModal open={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </header>
  )
}

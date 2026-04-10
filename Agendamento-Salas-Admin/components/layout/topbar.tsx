"use client"

import { Menu, Search, Bell } from "lucide-react"

interface TopbarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  onMenuClick: () => void
}

export function Topbar({ searchQuery, onSearchChange, onMenuClick }: TopbarProps) {
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

        <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-full bg-[#184689]/10 border border-[#184689]/20 flex items-center justify-center text-[#184689] font-bold text-sm">
            JS
          </div>
          <div className="hidden sm:block text-sm">
            <p className="font-semibold text-slate-700 leading-none">Joao Silva</p>
            <p className="text-slate-500 text-xs mt-1">Super Admin</p>
          </div>
        </div>
      </div>
    </header>
  )
}

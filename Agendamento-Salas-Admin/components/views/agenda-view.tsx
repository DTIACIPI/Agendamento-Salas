"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react"
import { API_BASE_URL } from "@/lib/utils"
import type { Room, SystemSettings, AgendaEvent } from "@/lib/types"

type ViewMode = "day" | "week" | "month"

interface AgendaViewProps {
  rooms: Room[]
  systemSettings: SystemSettings
  isSettingsLoading: boolean
  onOpenBooking?: (bookingId: string) => void
}

/* ─── Helpers ─── */

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + (m || 0)
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function startOfWeek(d: Date): Date {
  const r = new Date(d)
  const day = r.getDay()
  r.setDate(r.getDate() - ((day + 6) % 7))
  return r
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

const WEEKDAY_SHORT = ["S", "T", "Q", "Q", "S", "S", "D"]
const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"]
const MONTH_NAMES = ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]

// Paleta de cores vibrantes estilo Bryntum — borda esquerda + fundo suave
const ROOM_PALETTE = [
  { accent: "#3b82f6", bg: "rgba(59,130,246,0.12)", text: "#1e40af", dot: "#3b82f6" },
  { accent: "#f59e0b", bg: "rgba(245,158,11,0.12)", text: "#92400e", dot: "#f59e0b" },
  { accent: "#10b981", bg: "rgba(16,185,129,0.12)", text: "#065f46", dot: "#10b981" },
  { accent: "#8b5cf6", bg: "rgba(139,92,246,0.12)", text: "#5b21b6", dot: "#8b5cf6" },
  { accent: "#ef4444", bg: "rgba(239,68,68,0.12)", text: "#991b1b", dot: "#ef4444" },
  { accent: "#06b6d4", bg: "rgba(6,182,212,0.12)", text: "#155e75", dot: "#06b6d4" },
  { accent: "#f97316", bg: "rgba(249,115,22,0.12)", text: "#9a3412", dot: "#f97316" },
  { accent: "#ec4899", bg: "rgba(236,72,153,0.12)", text: "#9d174d", dot: "#ec4899" },
]

const HOUR_HEIGHT = 40 // px por hora

/* ─── Componente principal ─── */

export function AgendaView({ rooms, systemSettings, isSettingsLoading, onOpenBooking }: AgendaViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("week")
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  })
  const [events, setEvents] = useState<AgendaEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filterText, setFilterText] = useState("")

  // Lista unificada de salas
  const agendaRooms = useMemo(() => {
    const map = new Map<string, { id: string; name: string; capacity?: number }>()
    for (const r of rooms) map.set(r.id, { id: r.id, name: r.name, capacity: r.capacity })
    for (const ev of events) {
      if (!map.has(ev.space_id)) map.set(ev.space_id, { id: ev.space_id, name: ev.space_name })
    }
    return Array.from(map.values())
  }, [rooms, events])

  // Mapa de cor por space_id
  const getColor = useCallback((spaceId: string) => {
    const idx = agendaRooms.findIndex((r) => r.id === spaceId)
    return ROOM_PALETTE[(idx >= 0 ? idx : 0) % ROOM_PALETTE.length]
  }, [agendaRooms])

  // Sempre busca o mês inteiro
  const dateRange = useMemo(() => {
    const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const last = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    const calStart = startOfWeek(first)
    const calEnd = addDays(startOfWeek(addDays(last, 6)), 6)
    return { from: fmt(calStart), to: fmt(calEnd) }
  }, [currentDate.getFullYear(), currentDate.getMonth()])

  const fetchEvents = useCallback(async (from: string, to: string) => {
    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/webhook/api/agenda?date_from=${from}&date_to=${to}`, { cache: "no-store" })
      if (!res.ok) throw new Error("Falha ao buscar agenda")
      const text = await res.text()
      if (!text) { setEvents([]); return }
      const data = JSON.parse(text)
      setEvents(Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : data?.id ? [data] : [])
    } catch (error) {
      console.error("Erro ao carregar agenda:", error)
      setEvents([])
    } finally { setIsLoading(false) }
  }, [])

  useEffect(() => { fetchEvents(dateRange.from, dateRange.to) }, [dateRange.from, dateRange.to, fetchEvents])

  // Filtrar eventos por texto
  const filteredEvents = useMemo(() => {
    if (!filterText.trim()) return events
    const q = filterText.toLowerCase()
    return events.filter(e =>
      e.event_name.toLowerCase().includes(q) ||
      e.company_name.toLowerCase().includes(q) ||
      e.space_name.toLowerCase().includes(q)
    )
  }, [events, filterText])

  const hourSlots = useMemo(() => {
    const start = parseInt(systemSettings.open_time.substring(0, 2), 10)
    const end = parseInt(systemSettings.close_time.substring(0, 2), 10)
    if (isNaN(start) || isNaN(end) || end <= start) return []
    const slots: number[] = []
    for (let h = start; h < end; h++) slots.push(h)
    return slots
  }, [systemSettings.open_time, systemSettings.close_time])

  const totalMinutes = hourSlots.length > 0 ? (hourSlots[hourSlots.length - 1] + 1 - hourSlots[0]) * 60 : 1
  const firstHour = hourSlots.length > 0 ? hourSlots[0] : 8

  const navigate = (dir: -1 | 1) => {
    setCurrentDate((prev) => {
      if (viewMode === "day") return addDays(prev, dir)
      if (viewMode === "week") return addDays(prev, dir * 7)
      const d = new Date(prev); d.setMonth(d.getMonth() + dir); return d
    })
  }
  const goToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); setCurrentDate(d) }

  const periodLabel = useMemo(() => {
    if (viewMode === "day") return currentDate.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
    if (viewMode === "week") {
      const s = startOfWeek(currentDate)
      const e = addDays(s, 6)
      return `${s.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} — ${e.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`
    }
    return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
  }, [viewMode, currentDate])

  const today = new Date(); today.setHours(0, 0, 0, 0)

  /* ─── Mini Calendar (sidebar) ─── */
  function MiniCalendar() {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const calStart = startOfWeek(firstDay)

    const weeks: Date[][] = []
    let cursor = new Date(calStart)
    for (let w = 0; w < 6; w++) {
      const week: Date[] = []
      for (let d = 0; d < 7; d++) { week.push(new Date(cursor)); cursor = addDays(cursor, 1) }
      weeks.push(week)
      if (cursor.getMonth() !== month && w >= 3) break
    }

    const navigateMonth = (dir: -1 | 1) => {
      const d = new Date(currentDate); d.setMonth(d.getMonth() + dir); setCurrentDate(d)
    }

    return (
      <div className="select-none">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigateMonth(-1)} className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-semibold text-slate-700">{MONTH_NAMES[month]} {year}</span>
          <button onClick={() => navigateMonth(1)} className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-7 gap-0">
          {WEEKDAY_SHORT.map((l, i) => (
            <div key={i} className="text-center text-[10px] font-semibold text-slate-400 py-1">{l}</div>
          ))}
          {weeks.flat().map((d, i) => {
            const isMonth = d.getMonth() === month
            const isT = isSameDay(d, today)
            const isSel = isSameDay(d, currentDate)
            const hasEv = filteredEvents.some(e => e.date === fmt(d))
            return (
              <button
                key={i}
                onClick={() => { setCurrentDate(d); if (viewMode === "month") setViewMode("day") }}
                className={`relative w-full aspect-square flex items-center justify-center text-[11px] rounded-full transition-colors
                  ${isT ? "bg-[#184689] text-white font-bold" : isSel ? "bg-blue-100 text-[#184689] font-bold" : isMonth ? "text-slate-700 hover:bg-slate-100" : "text-slate-300"}`}
              >
                {d.getDate()}
                {hasEv && !isT && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  /* ─── Tooltip flutuante ─── */
  function EventTooltip({ ev, openBelow = false }: { ev: AgendaEvent; openBelow?: boolean }) {
    const c = getColor(ev.space_id)
    const statusColor = ev.status === "Confirmada" ? "bg-emerald-100 text-emerald-700"
      : ev.status === "Cancelada" ? "bg-red-100 text-red-700"
      : ev.status === "Pendente" ? "bg-amber-100 text-amber-700"
      : "bg-blue-100 text-blue-700"

    const posClass = openBelow
      ? "top-full left-1/2 -translate-x-1/2 mt-2"
      : "bottom-full left-1/2 -translate-x-1/2 mb-2"

    return (
      <div
        className={`absolute z-[100] ${posClass} w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-0 pointer-events-none opacity-0 group-hover/card:opacity-100 group-hover/card:pointer-events-auto transition-opacity duration-150`}
      >
        {/* Barra colorida topo */}
        <div className="h-1.5 rounded-t-xl" style={{ backgroundColor: c.accent }} />
        <div className="p-3 space-y-2">
          <div>
            <p className="text-sm font-bold text-slate-800 leading-snug">{ev.event_name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{ev.company_name}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-semibold">{ev.start_time} - {ev.end_time}</span>
            <span className="text-slate-300">|</span>
            <span>{new Date(ev.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: c.accent }} />
            <span className="text-xs text-slate-600">{ev.space_name}</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>{ev.status}</span>
            <span className="text-[10px] text-blue-600 font-medium">Clique para detalhes</span>
          </div>
        </div>
      </div>
    )
  }

  /* ─── Event Card (reutilizável) ─── */
  function EventCard({ ev, vertical = false, compact = false, tooltipBelow = false }: { ev: AgendaEvent; vertical?: boolean; compact?: boolean; tooltipBelow?: boolean }) {
    const c = getColor(ev.space_id)
    if (compact) {
      return (
        <div className="relative group/card">
          <button
            onClick={(e) => { e.stopPropagation(); onOpenBooking?.(ev.id) }}
            className="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate hover:opacity-80 transition-opacity"
            style={{ backgroundColor: c.bg, color: c.text, borderLeft: `3px solid ${c.accent}` }}
          >
            {ev.start_time} {ev.event_name}
          </button>
          <EventTooltip ev={ev} openBelow={tooltipBelow} />
        </div>
      )
    }
    return (
      <div className="relative group/card w-full h-full">
        <button
          onClick={() => onOpenBooking?.(ev.id)}
          className="text-left rounded-md overflow-hidden hover:shadow-md transition-shadow cursor-pointer w-full h-full flex flex-col"
          style={{ backgroundColor: c.bg, borderLeft: `4px solid ${c.accent}` }}
        >
          <div className="px-2 py-1 flex-1 min-h-0 overflow-hidden">
            <p className="text-[11px] font-bold truncate leading-tight" style={{ color: c.text }}>
              {ev.start_time} {ev.event_name}
            </p>
            <p className="text-[10px] truncate opacity-70 mt-0.5" style={{ color: c.text }}>
              {ev.company_name}
            </p>
            {!vertical && (
              <p className="text-[10px] truncate opacity-60" style={{ color: c.text }}>{ev.space_name}</p>
            )}
          </div>
        </button>
        <EventTooltip ev={ev} openBelow={tooltipBelow} />
      </div>
    )
  }

  /* ─── VIEW: DIA ─── */
  function renderDayView() {
    const dateKey = fmt(currentDate)
    const dayEvents = filteredEvents.filter((e) => e.date === dateKey)
    const blocked = systemSettings.block_sundays && currentDate.getDay() === 0

    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex-1 overflow-x-auto">
        {blocked && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800">
            Domingos estao bloqueados — nenhuma locacao permitida neste dia.
          </div>
        )}
        <div className="min-w-[800px]">
          {/* Header */}
          <div className="flex border-b border-slate-200 bg-slate-50/80 sticky top-0 z-10">
            <div className="w-44 shrink-0 border-r border-slate-200 p-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Espacos</div>
            <div className="flex-1 flex">
              {hourSlots.map((h) => (
                <div key={h} className="flex-1 border-r border-slate-100 px-1 py-2 text-[11px] font-medium text-slate-400 text-center">
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>
          </div>

          {agendaRooms.map((room) => {
            const roomEvents = dayEvents.filter((e) => e.space_id === room.id)
            const c = getColor(room.id)
            return (
              <div key={room.id} className="flex border-b border-slate-100 group hover:bg-slate-50/30 transition-colors">
                <div className="w-44 shrink-0 border-r border-slate-200 p-3 flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: c.accent }} />
                  <div>
                    <span className="font-semibold text-sm text-slate-800 leading-tight block">{room.name}</span>
                    {room.capacity && <span className="text-[10px] text-slate-400">{room.capacity} pessoas</span>}
                  </div>
                </div>
                <div className="flex-1 relative overflow-visible" style={{ height: "68px" }}>
                  <div className="absolute inset-0 flex pointer-events-none">
                    {hourSlots.map((h) => <div key={h} className="flex-1 border-r border-slate-50" />)}
                  </div>
                  {roomEvents.map((ev) => {
                    const startMin = timeToMin(ev.start_time) - firstHour * 60
                    const endMin = timeToMin(ev.end_time) - firstHour * 60
                    const left = Math.max(0, (startMin / totalMinutes) * 100)
                    const width = Math.max(3, ((endMin - startMin) / totalMinutes) * 100)
                    return (
                      <div key={ev.id} className="absolute top-1.5 bottom-1.5 z-10" style={{ left: `${left}%`, width: `${width}%` }}>
                        <EventCard ev={ev} tooltipBelow />
                      </div>
                    )
                  })}
                  {roomEvents.length === 0 && !blocked && (
                    <div className="absolute inset-0 flex items-center justify-center"><span className="text-[11px] text-slate-300 italic">Disponivel</span></div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  /* ─── VIEW: SEMANA ─── */
  function renderWeekView() {
    const weekStart = startOfWeek(currentDate)
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex-1 overflow-auto max-h-[calc(100vh-200px)]">
        <div className="min-w-[800px] flex flex-col">
          {/* Header dias */}
          <div className="flex border-b border-slate-200 sticky top-0 z-20 bg-white">
            <div className="w-14 shrink-0 border-r border-slate-100" />
            {days.map((d, i) => {
              const isT = isSameDay(d, today)
              const isSun = d.getDay() === 0
              const isSat = d.getDay() === 6
              const blocked = systemSettings.block_sundays && isSun
              return (
                <div key={i} className={`flex-1 border-r border-slate-100 py-3 text-center ${blocked ? "bg-red-50/40" : ""}`}>
                  <p className={`text-[11px] font-medium uppercase tracking-wide ${isSun || isSat ? "text-red-400" : "text-slate-400"}`}>
                    {WEEKDAY_LABELS[i]}
                  </p>
                  <button
                    onClick={() => { setCurrentDate(d); setViewMode("day") }}
                    className={`text-xl font-bold mt-1 w-10 h-10 rounded-full inline-flex items-center justify-center transition-all ${
                      isT ? "bg-[#184689] text-white shadow-md shadow-blue-200" : blocked ? "text-red-300" : "text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    {d.getDate()}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Grid horas x dias */}
          <div className="flex flex-1 relative">
            {/* Horas */}
            <div className="w-14 shrink-0 border-r border-slate-100">
              {hourSlots.map((h) => (
                <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b border-slate-100 flex items-start justify-end pr-2 -mt-[6px]">
                  <span className="text-[10px] font-medium text-slate-400">{String(h).padStart(2, "0")}:00</span>
                </div>
              ))}
            </div>

            {/* Dias */}
            {days.map((d, dayIdx) => {
              const dateKey = fmt(d)
              const dayEvents = filteredEvents.filter((e) => e.date === dateKey)
              const isSun = d.getDay() === 0
              const blocked = systemSettings.block_sundays && isSun
              const isT = isSameDay(d, today)

              // Agrupar por sala para side-by-side
              const roomIds = [...new Set(dayEvents.map((e) => e.space_id))]

              return (
                <div key={dayIdx} className={`flex-1 border-r border-slate-100 relative ${blocked ? "bg-red-50/20" : isT ? "bg-blue-50/20" : ""}`}>
                  {hourSlots.map((h) => (
                    <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b border-slate-100" />
                  ))}

                  {/* Linha do horário atual */}
                  {isT && (() => {
                    const now = new Date()
                    const nowMin = now.getHours() * 60 + now.getMinutes() - firstHour * 60
                    if (nowMin < 0 || nowMin > totalMinutes) return null
                    const top = (nowMin / totalMinutes) * 100
                    return (
                      <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: `${top}%` }}>
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                          <div className="flex-1 h-[2px] bg-red-500" />
                        </div>
                      </div>
                    )
                  })()}

                  {/* Eventos */}
                  <div className="absolute inset-0 overflow-visible">
                    {dayEvents.map((ev) => {
                      const startMin = timeToMin(ev.start_time) - firstHour * 60
                      const endMin = timeToMin(ev.end_time) - firstHour * 60
                      const top = Math.max(0, (startMin / totalMinutes) * 100)
                      const height = Math.max(3, ((endMin - startMin) / totalMinutes) * 100)
                      const laneIdx = roomIds.indexOf(ev.space_id)
                      const totalLanes = Math.min(roomIds.length, 3)
                      const laneW = 100 / totalLanes
                      const left = (laneIdx < 3 ? laneIdx : 0) * laneW

                      return (
                        <div
                          key={ev.id}
                          className="absolute z-10 px-0.5"
                          style={{ top: `${top}%`, height: `${height}%`, left: `${left + 1}%`, width: `${laneW - 2}%` }}
                        >
                          <EventCard ev={ev} vertical tooltipBelow={top < 30} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  /* ─── VIEW: MES ─── */
  function renderMonthView() {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const calStart = startOfWeek(firstDay)

    const weeks: Date[][] = []
    let cursor = new Date(calStart)
    for (let w = 0; w < 6; w++) {
      const week: Date[] = []
      for (let d = 0; d < 7; d++) { week.push(new Date(cursor)); cursor = addDays(cursor, 1) }
      weeks.push(week)
      if (cursor.getMonth() !== month && w >= 3) break
    }

    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex-1 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80">
          {WEEKDAY_LABELS.map((label, i) => (
            <div key={i} className={`p-2.5 text-center text-[11px] font-semibold uppercase tracking-wide ${i >= 5 ? "text-red-400" : "text-slate-400"}`}>
              {label}
            </div>
          ))}
        </div>

        <div className="divide-y divide-slate-100">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="grid grid-cols-7 divide-x divide-slate-100" style={{ minHeight: "120px" }}>
              {week.map((d, dIdx) => {
                const dateKey = fmt(d)
                const isMonth = d.getMonth() === month
                const isT = isSameDay(d, today)
                const dayEvents = filteredEvents.filter((e) => e.date === dateKey)
                const isSun = d.getDay() === 0
                const blocked = systemSettings.block_sundays && isSun

                return (
                  <div key={dIdx} className={`p-1.5 flex flex-col ${!isMonth ? "bg-slate-50/60" : blocked ? "bg-red-50/20" : "bg-white"}`}>
                    <button
                      onClick={() => { setCurrentDate(d); setViewMode("day") }}
                      className={`self-end w-7 h-7 rounded-full text-sm font-medium inline-flex items-center justify-center transition-all mb-1 ${
                        isT ? "bg-[#184689] text-white shadow-sm" : !isMonth ? "text-slate-300" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {d.getDate()}
                    </button>

                    <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <EventCard key={ev.id} ev={ev} compact />
                      ))}
                      {dayEvents.length > 3 && (
                        <button
                          onClick={() => { setCurrentDate(d); setViewMode("day") }}
                          className="text-[10px] text-[#184689] font-semibold hover:underline text-left px-1 mt-0.5"
                        >
                          +{dayEvents.length - 3} mais
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  /* ─── RENDER ─── */
  if (isSettingsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="size-8 border-2 border-[#184689] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Carregando...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-4 h-full animate-in fade-in duration-500">
      {/* Sidebar */}
      <div className="w-56 shrink-0 flex flex-col gap-4">
        {/* Mini Calendar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
          <MiniCalendar />
        </div>

        {/* Filtro */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filtrar eventos..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#184689] focus:ring-1 focus:ring-[#184689]/20 transition-all"
            />
          </div>
        </div>

        {/* Legenda de salas */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Espacos</p>
          <div className="flex flex-col gap-1.5">
            {agendaRooms.map((room) => {
              const c = getColor(room.id)
              const count = filteredEvents.filter(e => e.space_id === room.id).length
              return (
                <div key={room.id} className="flex items-center gap-2 group">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: c.accent }} />
                  <span className="text-xs text-slate-700 font-medium flex-1 truncate">{room.name}</span>
                  {count > 0 && <span className="text-[10px] text-slate-400 font-medium">{count}</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={goToday}
              className="px-4 py-2 text-sm font-semibold text-[#184689] bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
              Hoje
            </button>
            <div className="flex items-center">
              <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <h2 className="text-xl font-bold text-slate-800 capitalize">{periodLabel}</h2>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          </div>

          {/* View tabs */}
          <div className="flex bg-slate-100 p-1 rounded-lg shadow-inner">
            {(["day", "week", "month"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-1.5 text-sm font-medium rounded transition-all ${
                  viewMode === mode
                    ? "bg-white shadow-sm text-slate-800"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {mode === "day" ? "Dia" : mode === "week" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar content */}
        {viewMode === "day" && renderDayView()}
        {viewMode === "week" && renderWeekView()}
        {viewMode === "month" && renderMonthView()}
      </div>
    </div>
  )
}

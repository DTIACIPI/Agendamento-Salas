"use client"

import { TrendingUp, AlertCircle, DoorOpen, FileSignature, Download } from "lucide-react"

const stats = [
  { title: "Receita do Mes", value: "R$ 68.430,00", change: "+12%", icon: TrendingUp, color: "text-emerald-600" },
  { title: "Reservas Pendentes", value: "14", change: "-2", icon: AlertCircle, color: "text-amber-600" },
  { title: "Taxa de Ocupacao", value: "74%", change: "+5%", icon: DoorOpen, color: "text-blue-600" },
  { title: "Contratos Pendentes", value: "6", change: "Atencao", icon: FileSignature, color: "text-purple-600" },
]

const weeklyRevenue = [40, 60, 30, 80, 50, 90, 70]

const roomOccupancy = [
  { name: "Auditorio Principal", value: 85 },
  { name: "Foyer", value: 45 },
  { name: "Sala Reuniao 1", value: 60 },
]

export function DashboardView() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard Geral</h1>
          <p className="text-slate-500 text-sm mt-1">Resumo operacional de Abril de 2026</p>
        </div>
        <button className="hidden sm:flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 font-medium">
          <Download className="w-4 h-4" /> Relatorio
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-slate-500 text-sm font-medium">{s.title}</span>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800">{s.value}</span>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{s.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Revenue */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">Receita Semanal (R$)</h3>
          <div className="h-48 flex items-end gap-4">
            {weeklyRevenue.map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-[#184689]/10 rounded-t-sm hover:bg-[#184689] transition-colors group relative"
                style={{ height: `${h}%` }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-800 text-white text-xs py-1 px-2 rounded pointer-events-none transition-opacity">
                  R$ {h}k
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-400 border-t border-slate-100 pt-2">
            {["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6", "Sem 7"].map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
        </div>

        {/* Room Occupancy */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">Ocupacao por Sala</h3>
          <div className="space-y-4">
            {roomOccupancy.map((r, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-600">{r.name}</span>
                  <span className="text-slate-500">{r.value}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${r.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

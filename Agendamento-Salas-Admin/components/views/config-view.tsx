"use client"

import { useEffect, useState, memo } from "react"
import { Clock, Ticket, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { SystemSettings } from "@/lib/types"
import { cn, API_BASE_URL } from "@/lib/utils"
import { authFetch } from "@/lib/auth/auth-fetch"

interface ConfigViewProps {
  systemSettings: SystemSettings
  isSettingsLoading: boolean
  onSettingsChange?: (settings: SystemSettings) => void
}

export const ConfigView = memo(function ConfigView({ systemSettings, isSettingsLoading, onSettingsChange }: ConfigViewProps) {
  const canEdit = typeof onSettingsChange === "function"
  const [draft, setDraft] = useState<SystemSettings>(systemSettings)
  const [isSaving, setIsSaving] = useState(false)

  // Sincroniza o rascunho sempre que a fonte de verdade mudar (ex: fetch concluiu)
  useEffect(() => {
    setDraft(systemSettings)
  }, [systemSettings])

  const updateField = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await authFetch(`${API_BASE_URL}/webhook/api/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(draft),
      })
      if (!res.ok) throw new Error("Falha ao salvar configuracoes")
      onSettingsChange?.(draft)
      toast.success("Configuracoes salvas com sucesso!")
    } catch (error) {
      console.error("Erro ao salvar configuracoes:", error)
      toast.error("Erro ao salvar configuracoes. Tente novamente.")
    } finally {
      setIsSaving(false)
    }
  }

  if (isSettingsLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Configuracoes e Regras</h1>
          <p className="text-slate-500 text-sm">Defina os parametros globais do motor de reservas.</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="h-6 w-60 bg-slate-200 rounded animate-pulse" />
          <div className="grid grid-cols-2 gap-6">
            <div className="h-10 bg-slate-100 rounded animate-pulse" />
            <div className="h-10 bg-slate-100 rounded animate-pulse" />
            <div className="h-10 bg-slate-100 rounded animate-pulse" />
            <div className="h-16 col-span-2 bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="h-6 w-72 bg-slate-200 rounded animate-pulse" />
          <div className="h-32 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Configuracoes e Regras</h1>
        <p className="text-slate-500 text-sm">Defina os parametros globais do motor de reservas.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-8">
        {/* Operacao */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#184689]" /> Operacao e Agendamento
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Horario de Abertura</label>
              <input
                type="time"
                disabled={!canEdit}
                value={draft.open_time}
                onChange={(e) => updateField("open_time", e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Horario de Fechamento</label>
              <input
                type="time"
                disabled={!canEdit}
                value={draft.close_time}
                onChange={(e) => updateField("close_time", e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>
            <div className="flex items-center justify-between col-span-2 border p-4 rounded-lg bg-slate-50 mt-2">
              <div>
                <p className="font-bold text-slate-800 text-sm">Bloquear Domingos</p>
                <p className="text-xs text-slate-500">Impede qualquer locacao aos domingos.</p>
              </div>
              <button
                type="button"
                onClick={() => canEdit && updateField("block_sundays", !draft.block_sundays)}
                disabled={!canEdit}
                aria-pressed={draft.block_sundays}
                className={cn(
                  "w-10 h-6 rounded-full relative transition-colors",
                  draft.block_sundays ? "bg-emerald-500" : "bg-slate-300",
                  canEdit ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 bg-white rounded-full absolute top-1 transition-all",
                    draft.block_sundays ? "right-1" : "left-1"
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Tabela de Descontos */}
        <div className="border-t border-slate-200 pt-8">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-[#184689]" /> Tabela de Descontos (Associacao)
          </h3>
          <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left">Meses Associado (Min)</th>
                <th className="p-3 text-left">Meses (Max)</th>
                <th className="p-3 text-left">% Desconto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="p-3">0</td>
                <td className="p-3">12</td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      disabled={!canEdit}
                      value={draft.discount_tier1_pct}
                      onChange={(e) => updateField("discount_tier1_pct", Number(e.target.value) || 0)}
                      className="border p-1 w-20 rounded disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                    />
                    <span className="text-slate-500">%</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="p-3">13</td>
                <td className="p-3">24</td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      disabled={!canEdit}
                      value={draft.discount_tier2_pct}
                      onChange={(e) => updateField("discount_tier2_pct", Number(e.target.value) || 0)}
                      className="border p-1 w-20 rounded disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                    />
                    <span className="text-slate-500">%</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="p-3">25</td>
                <td className="p-3">Ilimitado</td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      disabled={!canEdit}
                      value={draft.discount_tier3_pct}
                      onChange={(e) => updateField("discount_tier3_pct", Number(e.target.value) || 0)}
                      className="border p-1 w-20 rounded disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                    />
                    <span className="text-slate-500">%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {canEdit && (
          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#184689] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#123566] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSaving ? "Salvando..." : "Salvar Configuracoes"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
})

"use client"

import { useMemo, useState, memo } from "react"
import { Plus, Edit, Ticket, Trash2, Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import { authFetch } from "@/lib/auth/auth-fetch"
import { API_BASE_URL } from "@/lib/utils"
import type { Coupon } from "@/lib/types"

type StatusFilter = "all" | "active" | "inactive"

interface CuponsViewProps {
  coupons: Coupon[]
  isLoading: boolean
  onOpenCouponModal?: (coupon: Coupon | null) => void
  onDeleteCoupon?: (id: string) => Promise<void>
  canToggle?: boolean
  onRefresh: () => void
}

export const CuponsView = memo(function CuponsView({ coupons, isLoading, onOpenCouponModal, onDeleteCoupon, canToggle = false, onRefresh }: CuponsViewProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active")
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const counts = useMemo(() => ({
    all: coupons.length,
    active: coupons.filter((c) => c.is_active).length,
    inactive: coupons.filter((c) => !c.is_active).length,
  }), [coupons])

  const filtered = useMemo(() => {
    let list = coupons

    if (statusFilter === "active") list = list.filter((c) => c.is_active)
    else if (statusFilter === "inactive") list = list.filter((c) => !c.is_active)

    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((c) =>
        c.code.toLowerCase().includes(q) ||
        c.discount_type.toLowerCase().includes(q),
      )
    }

    return list
  }, [coupons, search, statusFilter])

  const handleToggle = async (coupon: Coupon) => {
    setTogglingId(coupon.id)
    try {
      const res = await authFetch(`${API_BASE_URL}/webhook/4506df66-209d-443d-bc88-1e3aac67ea49/api/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ is_active: !coupon.is_active }),
      })
      if (!res.ok) throw new Error("Falha ao alterar status")
      toast.success(coupon.is_active ? "Cupom desativado" : "Cupom ativado")
      onRefresh()
    } catch {
      toast.error("Erro ao alterar status do cupom")
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await onDeleteCoupon?.(id)
      toast.success("Cupom excluido com sucesso!")
    } catch {
      toast.error("Erro ao excluir cupom")
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cupons de Desconto</h1>
          <p className="text-slate-500 text-sm mt-1">Crie e edite campanhas promocionais ativas.</p>
        </div>
        {onOpenCouponModal && (
          <button
            onClick={() => onOpenCouponModal(null)}
            className="flex items-center gap-2 bg-[#184689] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#113262] shadow-sm"
          >
            <Plus className="w-4 h-4" /> Novo Cupom
          </button>
        )}
      </div>

      {/* Filtros + Busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {([
            { key: "active", label: "Ativos", count: counts.active },
            { key: "inactive", label: "Inativos", count: counts.inactive },
            { key: "all", label: "Todos", count: counts.all },
          ] as { key: StatusFilter; label: string; count: number }[]).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === key
                  ? "bg-[#184689] text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label} <span className={`ml-1 ${statusFilter === key ? "text-white/70" : "text-slate-400"}`}>({count})</span>
            </button>
          ))}
        </div>

        <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm px-4 py-2 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por codigo do cupom..."
            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-slate-200">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-6 animate-pulse">
                <div className="h-7 w-32 bg-slate-200 rounded" />
                <div className="h-4 w-28 bg-slate-100 rounded" />
                <div className="h-4 w-20 bg-slate-100 rounded" />
                <div className="h-4 w-24 bg-slate-100 rounded" />
                <div className="ml-auto h-6 w-11 bg-slate-200 rounded-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            {coupons.length === 0 ? "Nenhum cupom cadastrado." : "Nenhum cupom encontrado com os filtros atuais."}
          </div>
        ) : (
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-xs">
                <th className="px-6 py-4">Codigo do Cupom</th>
                <th className="px-6 py-4">Regra de Desconto</th>
                <th className="px-6 py-4">Usos (Atual / Max)</th>
                <th className="px-6 py-4">Validade</th>
                <th className="px-6 py-4 text-right">Acoes / Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((coupon) => (
                <tr key={coupon.id} className={`hover:bg-slate-50 transition-colors ${!coupon.is_active ? "opacity-60" : ""}`}>
                  <td className="px-6 py-4">
                    <div className="inline-flex items-center gap-2 font-mono font-bold text-sm bg-slate-100 text-slate-800 px-2 py-1 rounded border border-slate-200">
                      <Ticket className="w-4 h-4 text-slate-400" /> {coupon.code}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-700 font-medium">
                    {coupon.discount_type === "percentage"
                      ? `${coupon.discount_value}% de desconto`
                      : `R$ ${Number(coupon.discount_value).toFixed(2)} fixo`}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <span className="font-semibold">{coupon.current_uses}</span> / {coupon.max_uses ?? "∞"}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {coupon.valid_until
                      ? new Date(coupon.valid_until.replace(" ", "T")).toLocaleDateString("pt-BR")
                      : "Ilimitado"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {onOpenCouponModal && (
                        <button
                          onClick={() => onOpenCouponModal(coupon)}
                          className="p-1.5 text-slate-400 hover:text-[#184689] hover:bg-[#184689]/10 rounded transition-colors"
                          title="Editar Cupom"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}

                      {onDeleteCoupon && (confirmDeleteId === coupon.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(coupon.id)}
                            disabled={deletingId === coupon.id}
                            className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            {deletingId === coupon.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              "Sim"
                            )}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded hover:bg-slate-200 transition-colors"
                          >
                            Nao
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(coupon.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Excluir Cupom"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ))}

                      <button
                        onClick={() => canToggle && handleToggle(coupon)}
                        disabled={!canToggle || togglingId === coupon.id}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:cursor-not-allowed ${
                          coupon.is_active ? "bg-emerald-500" : "bg-slate-300"
                        } ${!canToggle ? "opacity-60" : "disabled:opacity-50"}`}
                        title={coupon.is_active ? "Ativo" : "Inativo"}
                      >
                        {togglingId === coupon.id ? (
                          <Loader2 className="w-3 h-3 animate-spin text-white mx-auto" />
                        ) : (
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              coupon.is_active ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
})

"use client"

import { useState, useEffect } from "react"
import { X, Save, Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/utils"
import { authFetch } from "@/lib/auth/auth-fetch"
import type { Coupon, CouponPayload } from "@/lib/types"

interface CouponModalProps {
  open: boolean
  editingCoupon: Coupon | null
  onClose: () => void
  onSaved: () => void
}

export function CouponModal({ open, editingCoupon, onClose, onSaved }: CouponModalProps) {
  const [code, setCode] = useState("")
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage")
  const [discountValue, setDiscountValue] = useState("")
  const [maxUses, setMaxUses] = useState("")
  const [validUntil, setValidUntil] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editingCoupon) {
      setCode(editingCoupon.code)
      setDiscountType(editingCoupon.discount_type)
      setDiscountValue(String(editingCoupon.discount_value))
      setMaxUses(editingCoupon.max_uses !== null ? String(editingCoupon.max_uses) : "")
      setValidUntil(editingCoupon.valid_until?.split(" ")[0] ?? "")
      setIsActive(editingCoupon.is_active)
    } else {
      setCode("")
      setDiscountType("percentage")
      setDiscountValue("")
      setMaxUses("")
      setValidUntil("")
      setIsActive(true)
    }
  }, [open, editingCoupon])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const payload: CouponPayload = {
        code: code.toUpperCase().trim(),
        discount_type: discountType,
        discount_value: Number(discountValue),
        max_uses: maxUses.trim() === "" ? null : Number(maxUses),
        valid_until: validUntil.trim() === "" ? null : validUntil,
        is_active: isActive,
        description: "",
      }

      const url = editingCoupon
        ? `${API_BASE_URL}/webhook/4506df66-209d-443d-bc88-1e3aac67ea49/api/coupons/${editingCoupon.id}`
        : `${API_BASE_URL}/webhook/api/coupons`
      const method = editingCoupon ? "PATCH" : "POST"

      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => "")
        throw new Error(body || "Falha ao salvar cupom")
      }

      toast.success(editingCoupon ? "Cupom atualizado com sucesso!" : "Cupom criado com sucesso!")
      onSaved()
      onClose()
    } catch (error) {
      console.error("Erro ao salvar cupom:", error)
      toast.error("Erro ao salvar cupom. Tente novamente.")
    } finally {
      setIsSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl relative z-50 overflow-hidden animate-in zoom-in-95 duration-200">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800">
              {editingCoupon ? "Editar Cupom" : "Criar Novo Cupom"}
            </h3>
            <button type="button" onClick={onClose}>
              <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                Codigo (Sem espacos)
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono uppercase outline-none focus:border-[#184689]"
                placeholder="Ex: ACIPI2026"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Tipo</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed")}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#184689]"
                >
                  <option value="percentage">Porcentagem (%)</option>
                  <option value="fixed">Valor Fixo (R$)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                  Valor do Desconto
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#184689]"
                  placeholder="Ex: 15"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Validade (Fim)</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#184689]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                  Limite Global de Usos
                </label>
                <input
                  type="number"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#184689]"
                  placeholder="Ilimitado"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  isActive ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isActive ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-sm text-slate-600">
                {isActive ? "Cupom ativo" : "Cupom inativo"}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#184689] text-white hover:bg-[#113262] rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                </>
              ) : editingCoupon ? (
                <>
                  <Save className="w-4 h-4" /> Salvar Edicao
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Criar Cupom
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

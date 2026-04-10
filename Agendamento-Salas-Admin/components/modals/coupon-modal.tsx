"use client"

import { X, Save, Plus } from "lucide-react"
import type { Coupon } from "@/lib/types"

interface CouponModalProps {
  open: boolean
  editingCoupon: Coupon | null
  onClose: () => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}

export function CouponModal({ open, editingCoupon, onClose, onSubmit }: CouponModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl relative z-50 overflow-hidden animate-in zoom-in-95 duration-200">
        <form onSubmit={onSubmit}>
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
                defaultValue={editingCoupon?.code || ""}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono uppercase outline-none focus:border-[#184689]"
                placeholder="Ex: ACIPI2026"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Tipo</label>
                <select
                  defaultValue={editingCoupon?.type || "percentage"}
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
                  defaultValue={editingCoupon?.value || ""}
                  required
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
                  defaultValue={editingCoupon?.validUntil || ""}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#184689]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                  Limite Global de Usos
                </label>
                <input
                  type="number"
                  defaultValue={editingCoupon?.maxUses || ""}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#184689]"
                  placeholder="Ilimitado"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#184689] text-white hover:bg-[#113262] rounded-lg transition-colors shadow-sm"
            >
              {editingCoupon ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editingCoupon ? "Salvar Edicao" : "Criar Cupom"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

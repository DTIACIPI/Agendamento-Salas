"use client"

import { Plus, Edit, Ticket } from "lucide-react"
import type { Coupon } from "@/lib/types"

interface CuponsViewProps {
  coupons: Coupon[]
  onToggleCoupon: (id: number) => void
  onOpenCouponModal: (coupon: Coupon | null) => void
}

export function CuponsView({ coupons, onToggleCoupon, onOpenCouponModal }: CuponsViewProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cupons de Desconto</h1>
          <p className="text-slate-500 text-sm mt-1">Crie e edite campanhas promocionais ativas.</p>
        </div>
        <button
          onClick={() => onOpenCouponModal(null)}
          className="flex items-center gap-2 bg-[#184689] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#113262] shadow-sm"
        >
          <Plus className="w-4 h-4" /> Novo Cupom
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="inline-flex items-center gap-2 font-mono font-bold text-sm bg-slate-100 text-slate-800 px-2 py-1 rounded border border-slate-200">
                    <Ticket className="w-4 h-4 text-slate-400" /> {coupon.code}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-700 font-medium">
                  {coupon.type === "percentage" ? `${coupon.value}% de desconto` : `R$ ${coupon.value},00 fixo`}
                </td>
                <td className="px-6 py-4 text-slate-600">
                  <span className="font-semibold">{coupon.currentUses}</span> / {coupon.maxUses || "\u221E"}
                </td>
                <td className="px-6 py-4 text-slate-600">{coupon.validUntil || "Ilimitado"}</td>
                <td className="px-6 py-4 flex items-center justify-end gap-3">
                  <button
                    onClick={() => onOpenCouponModal(coupon)}
                    className="p-1.5 text-slate-400 hover:text-[#184689] hover:bg-[#184689]/10 rounded transition-colors"
                    title="Editar Cupom"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onToggleCoupon(coupon.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      coupon.active ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                    title={coupon.active ? "Desativar Cupom" : "Ativar Cupom"}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        coupon.active ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

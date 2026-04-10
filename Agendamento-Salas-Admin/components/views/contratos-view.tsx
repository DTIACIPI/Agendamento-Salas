"use client"

import { FileText } from "lucide-react"
import { StatusBadge } from "@/components/shared/status-badge"
import type { Contract } from "@/lib/types"

interface ContratosViewProps {
  contracts: Contract[]
}

export function ContratosView({ contracts }: ContratosViewProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Contratos e Assinaturas</h1>
          <p className="text-slate-500 text-sm">Monitore os documentos gerados a partir de reservas aprovadas.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-xs">
              <th className="px-6 py-4">Contrato / Reserva</th>
              <th className="px-6 py-4">Empresa</th>
              <th className="px-6 py-4">Gerado em</th>
              <th className="px-6 py-4">Status de Assinatura</th>
              <th className="px-6 py-4 text-right">Documento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {contracts.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-800">
                  {c.id}
                  <span className="block text-xs text-slate-500 font-normal">{c.bookingId}</span>
                </td>
                <td className="px-6 py-4 text-slate-600">{c.company}</td>
                <td className="px-6 py-4 text-slate-600">{c.date}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-blue-600 hover:text-blue-800 font-medium flex items-center justify-end gap-1 ml-auto">
                    <FileText className="w-4 h-4" /> Ver PDF
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

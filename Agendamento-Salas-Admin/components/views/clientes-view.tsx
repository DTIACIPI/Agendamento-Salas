"use client"

import { ShieldCheck } from "lucide-react"
import type { Client } from "@/lib/types"

interface ClientesViewProps {
  clients: Client[]
}

export function ClientesView({ clients }: ClientesViewProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Diretorio de Clientes</h1>
          <p className="text-slate-500 text-sm">Historico e status de associacao das empresas locatarias.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-xs">
              <th className="px-6 py-4">Empresa</th>
              <th className="px-6 py-4">Contato</th>
              <th className="px-6 py-4">Associacao (Supera) / Lucro</th>
              <th className="px-6 py-4 text-right">LTV (Gasto Total)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {clients.map((c, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800 text-base">{c.name}</div>
                  <div className="text-slate-500 text-xs font-mono">{c.cnpj}</div>
                </td>
                <td className="px-6 py-4 text-slate-600">
                  <div>{c.email}</div>
                  <div className="text-xs">{c.phone}</div>
                </td>
                <td className="px-6 py-4">
                  {c.associado ? (
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs font-bold w-max">
                        <ShieldCheck className="w-3 h-3" /> Associado ({c.meses} meses)
                      </span>
                      {c.plano !== "N/A" && (
                        <span className="text-xs font-medium text-slate-500">
                          Plano: <span className="font-bold text-slate-700">{c.plano}</span> | Lucro:{" "}
                          <span className="text-emerald-600 font-bold">{c.lucro}</span>
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-xs font-bold w-max">
                      Nao Associado
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="font-bold text-slate-800 text-base">{c.totalSpent}</div>
                  <div className="text-slate-500 text-xs">{c.totalBookings} locacoes</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

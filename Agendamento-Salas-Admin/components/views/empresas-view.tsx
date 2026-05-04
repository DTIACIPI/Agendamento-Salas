"use client"

import { memo } from "react"
import { Building2, ChevronLeft, ChevronRight, Eye } from "lucide-react"
import type { Company } from "@/lib/types"

interface EmpresasViewProps {
  companies: Company[]
  isLoading: boolean
  page: number
  totalPages: number
  totalRecords: number
  onPageChange: (page: number) => void
  onOpenDetail: (companyId: string) => void
}

function formatCnpj(raw: string): string {
  const d = raw.replace(/\D/g, "")
  if (d.length !== 14) return raw
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
}

export const EmpresasView = memo(function EmpresasView({
  companies,
  isLoading,
  page,
  totalPages,
  totalRecords,
  onPageChange,
  onOpenDetail,
}: EmpresasViewProps) {
  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Empresas</h1>
          <p className="text-slate-500 text-sm mt-1">
            Cadastro e historico de locacoes das empresas.
            {totalRecords > 0 && (
              <span className="ml-2 text-slate-400">({totalRecords} empresas)</span>
            )}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-xs">
              <th className="px-6 py-4">Razao Social</th>
              <th className="px-6 py-4">CNPJ</th>
              <th className="px-6 py-4">Endereco</th>
              <th className="px-6 py-4 text-right">Acao</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4"><div className="h-4 w-48 bg-slate-100 rounded animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-40 bg-slate-100 rounded animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-56 bg-slate-100 rounded animate-pulse" /></td>
                  <td className="px-6 py-4 text-right"><div className="h-7 w-28 bg-slate-100 rounded animate-pulse ml-auto" /></td>
                </tr>
              ))
            ) : companies.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                  <Building2 className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  Nenhuma empresa encontrada.
                </td>
              </tr>
            ) : (
              companies.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-800">{c.razao_social}</span>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-600">{formatCnpj(c.cnpj)}</td>
                  <td className="px-6 py-4 text-slate-600 truncate max-w-xs">{c.endereco || "\u2014"}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => onOpenDetail(c.id)}
                      className="inline-flex items-center gap-1.5 text-[#184689] font-medium bg-blue-50 px-3 py-1 rounded-md hover:underline"
                    >
                      <Eye className="w-4 h-4" /> Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Paginacao */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50">
            <p className="text-sm text-slate-500">
              Pagina {page} de {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("ellipsis")
                  acc.push(p)
                  return acc
                }, [])
                .map((item, idx) =>
                  item === "ellipsis" ? (
                    <span key={`e${idx}`} className="px-1 text-slate-400">...</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => onPageChange(item)}
                      className={`w-8 h-8 text-sm rounded-lg border transition-colors ${
                        item === page
                          ? "bg-[#184689] text-white border-[#184689]"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {item}
                    </button>
                  ),
                )}
              <button
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

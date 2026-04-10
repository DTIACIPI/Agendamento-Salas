"use client"

import { Clock, Ticket } from "lucide-react"

export function ConfigView() {
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
              <input type="time" defaultValue="08:00" className="w-full p-2 border border-slate-300 rounded-md bg-slate-50" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Horario de Fechamento</label>
              <input type="time" defaultValue="22:00" className="w-full p-2 border border-slate-300 rounded-md bg-slate-50" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Buffer de Limpeza (minutos)</label>
              <input type="number" defaultValue="30" className="w-full p-2 border border-slate-300 rounded-md bg-slate-50" />
            </div>
            <div className="flex items-center justify-between col-span-2 border p-4 rounded-lg bg-slate-50 mt-2">
              <div>
                <p className="font-bold text-slate-800 text-sm">Bloquear Domingos</p>
                <p className="text-xs text-slate-500">Impede qualquer locacao aos domingos.</p>
              </div>
              <div className="w-10 h-6 bg-emerald-500 rounded-full relative cursor-pointer">
                <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1" />
              </div>
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
                  <input type="text" defaultValue="10%" className="border p-1 w-20 rounded" />
                </td>
              </tr>
              <tr>
                <td className="p-3">13</td>
                <td className="p-3">24</td>
                <td className="p-3">
                  <input type="text" defaultValue="20%" className="border p-1 w-20 rounded" />
                </td>
              </tr>
              <tr>
                <td className="p-3">25</td>
                <td className="p-3">Ilimitado</td>
                <td className="p-3">
                  <input type="text" defaultValue="30%" className="border p-1 w-20 rounded" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-4">
          <button className="bg-[#184689] text-white px-6 py-2 rounded-lg font-medium">Salvar Configuracoes</button>
        </div>
      </div>
    </div>
  )
}

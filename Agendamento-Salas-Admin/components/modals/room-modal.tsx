"use client"

import { X, Save, Plus, AlignLeft, CreditCard, Tag } from "lucide-react"
import { ALL_AMENITIES } from "@/lib/mock-data"
import type { Room } from "@/lib/types"

interface RoomModalProps {
  open: boolean
  editingRoom: Room | null
  onClose: () => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}

export function RoomModal({ open, editingRoom, onClose, onSubmit }: RoomModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl relative z-50 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <form onSubmit={onSubmit} className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
            <h3 className="text-lg font-bold text-slate-800">
              {editingRoom ? `Editando: ${editingRoom.name}` : "Cadastrar Nova Sala"}
            </h3>
            <button type="button" onClick={onClose}>
              <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50/50">
            {/* Info Basica */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="font-bold text-slate-700 mb-2 border-b pb-2 flex items-center gap-2">
                <AlignLeft className="w-4 h-4" /> Informacoes Basicas
              </h4>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                  Nome do Espaco
                </label>
                <input
                  type="text"
                  required
                  defaultValue={editingRoom?.name || ""}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#184689]"
                  placeholder="Ex: Sala de Reunioes 2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                    Capacidade Maxima (Pessoas)
                  </label>
                  <input
                    type="number"
                    required
                    defaultValue={editingRoom?.capacity || ""}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#184689]"
                    placeholder="Ex: 20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                    Status Inicial
                  </label>
                  <select
                    defaultValue={editingRoom?.status || "Disponivel"}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#184689]"
                  >
                    <option value="Disponivel">Disponivel</option>
                    <option value="Manutencao">Indisponivel / Manutencao</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Precificacao */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="font-bold text-slate-700 mb-2 border-b pb-2 flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Precificacao
              </h4>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <p className="text-sm font-bold text-slate-800">Dias de Semana (Seg-Sex)</p>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                      Preco por Hora (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      defaultValue={editingRoom?.priceDay || ""}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#184689]"
                      placeholder="Ex: 150.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                      Minimo de Horas
                    </label>
                    <input
                      type="number"
                      required
                      defaultValue={editingRoom?.minHours || 2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#184689]"
                    />
                  </div>
                </div>
                <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <p className="text-sm font-bold text-slate-800">Finais de Semana (Sab)</p>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                      Preco por Hora (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      defaultValue={editingRoom?.priceWeekend || ""}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#184689]"
                      placeholder="Ex: 200.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                      Minimo de Horas
                    </label>
                    <input
                      type="number"
                      required
                      defaultValue={editingRoom?.minHoursWeekend || 4}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#184689]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Amenidades */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="font-bold text-slate-700 mb-2 border-b pb-2 flex items-center gap-2">
                <Tag className="w-4 h-4" /> Infraestrutura e Fotos
              </h4>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
                  Amenidades (Selecione)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_AMENITIES.map((item) => (
                    <label
                      key={item}
                      className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 px-3 py-2 rounded cursor-pointer hover:bg-slate-100"
                    >
                      <input
                        type="checkbox"
                        defaultChecked={editingRoom?.amenities?.includes(item)}
                        className="rounded text-[#184689] focus:ring-[#184689]"
                      />{" "}
                      {item}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium bg-[#184689] text-white hover:bg-[#113262] rounded-lg transition-colors shadow-sm"
            >
              {editingRoom ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editingRoom ? "Salvar Regras" : "Criar Sala"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

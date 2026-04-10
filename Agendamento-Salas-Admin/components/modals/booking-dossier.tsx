"use client"

import { useState, useEffect } from "react"
import {
  X, Edit, Save, Building2, Users, Calendar as CalIcon,
} from "lucide-react"
import { StatusBadge } from "@/components/shared/status-badge"
import type { Booking } from "@/lib/types"

interface BookingDossierProps {
  booking: Booking | null
  onClose: () => void
  onSave: (updated: Booking) => void
}

type Section = "companyData" | "responsavelData" | "eventoData"

export function BookingDossier({ booking, onClose, onSave }: BookingDossierProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState<Booking | null>(null)

  useEffect(() => {
    if (!booking) {
      setIsEditing(false)
      setEditedData(null)
    }
  }, [booking])

  if (!booking) return null

  const handleEditStart = () => {
    setEditedData(JSON.parse(JSON.stringify(booking)))
    setIsEditing(true)
  }

  const handleEditCancel = () => {
    setIsEditing(false)
    setEditedData(null)
  }

  const handleSave = () => {
    if (editedData) {
      onSave(editedData)
      setIsEditing(false)
    }
  }

  const handleClose = () => {
    setIsEditing(false)
    setEditedData(null)
    onClose()
  }

  const updateField = <S extends Section, K extends keyof Booking[S]>(
    section: S,
    field: K,
    value: Booking[S][K],
  ) => {
    setEditedData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      }
    })
  }

  const current = isEditing && editedData ? editedData : booking
  const editingClass = isEditing ? "border-[#184689]/30 ring-1 ring-[#184689]/10" : "border-slate-200"

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl relative z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between bg-slate-50 items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Dossie de Reserva</h2>
            <p className="text-sm text-slate-500">ID: {booking.id}</p>
          </div>
          <div className="flex items-center gap-3">
            {!isEditing && (
              <button
                onClick={handleEditStart}
                className="flex items-center gap-1.5 text-sm font-medium text-[#184689] bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Edit className="w-4 h-4" /> Editar Campos
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200"
            >
              <X />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          {/* Status + Valor */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">Status da Reserva</p>
              <StatusBadge status={booking.status} />
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">Valor Final</p>
              <p className="text-2xl font-black text-[#184689] leading-none">{booking.value}</p>
            </div>
          </div>

          {/* Dados da Empresa */}
          <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${editingClass}`}>
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-500" />
              <h3 className="font-bold text-slate-800">Dados da Empresa</h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div className="col-span-2 sm:col-span-1">
                <span className="block text-xs font-medium text-slate-400 uppercase mb-1">Razao Social</span>
                {isEditing ? (
                  <input
                    className="w-full border border-slate-300 rounded px-2 py-1 outline-none focus:border-[#184689]"
                    value={current.companyData.razaoSocial}
                    onChange={(e) => updateField("companyData", "razaoSocial", e.target.value)}
                  />
                ) : (
                  <span className="font-semibold text-slate-800">{current.companyData.razaoSocial}</span>
                )}
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="block text-xs font-medium text-slate-400 uppercase mb-1">Nome Fantasia</span>
                {isEditing ? (
                  <input
                    className="w-full border border-slate-300 rounded px-2 py-1 outline-none focus:border-[#184689]"
                    value={current.companyData.nomeFantasia}
                    onChange={(e) => updateField("companyData", "nomeFantasia", e.target.value)}
                  />
                ) : (
                  <span className="font-semibold text-slate-800">{current.companyData.nomeFantasia || "-"}</span>
                )}
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-400 uppercase mb-1">CNPJ</span>
                {isEditing ? (
                  <input
                    className="w-full border border-slate-300 rounded px-2 py-1 outline-none bg-slate-100 text-slate-500 cursor-not-allowed"
                    readOnly
                    value={current.companyData.cnpj}
                  />
                ) : (
                  <span className="font-mono text-slate-700">{current.companyData.cnpj}</span>
                )}
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-400 uppercase mb-1">Inscricao Estadual</span>
                {isEditing ? (
                  <input
                    className="w-full border border-slate-300 rounded px-2 py-1 outline-none focus:border-[#184689]"
                    value={current.companyData.ie}
                    onChange={(e) => updateField("companyData", "ie", e.target.value)}
                  />
                ) : (
                  <span className="text-slate-700">{current.companyData.ie || "Isento"}</span>
                )}
              </div>
              <div className="col-span-2 bg-slate-50 p-3 rounded border border-slate-100">
                <span className="block text-xs font-medium text-slate-400 uppercase mb-2">Endereco Completo</span>
                {isEditing ? (
                  <div className="grid grid-cols-4 gap-2">
                    <input
                      className="col-span-1 border border-slate-300 rounded px-2 py-1 text-sm outline-none"
                      placeholder="CEP"
                      value={current.companyData.cep}
                      onChange={(e) => updateField("companyData", "cep", e.target.value)}
                    />
                    <input
                      className="col-span-3 border border-slate-300 rounded px-2 py-1 text-sm outline-none"
                      placeholder="Endereco"
                      value={current.companyData.endereco}
                      onChange={(e) => updateField("companyData", "endereco", e.target.value)}
                    />
                    <input
                      className="col-span-1 border border-slate-300 rounded px-2 py-1 text-sm outline-none"
                      placeholder="Nº"
                      value={current.companyData.numero}
                      onChange={(e) => updateField("companyData", "numero", e.target.value)}
                    />
                    <input
                      className="col-span-1 border border-slate-300 rounded px-2 py-1 text-sm outline-none"
                      placeholder="Comp."
                      value={current.companyData.complemento}
                      onChange={(e) => updateField("companyData", "complemento", e.target.value)}
                    />
                    <input
                      className="col-span-2 border border-slate-300 rounded px-2 py-1 text-sm outline-none"
                      placeholder="Bairro"
                      value={current.companyData.bairro}
                      onChange={(e) => updateField("companyData", "bairro", e.target.value)}
                    />
                    <input
                      className="col-span-3 border border-slate-300 rounded px-2 py-1 text-sm outline-none"
                      placeholder="Cidade"
                      value={current.companyData.cidade}
                      onChange={(e) => updateField("companyData", "cidade", e.target.value)}
                    />
                    <input
                      className="col-span-1 border border-slate-300 rounded px-2 py-1 text-sm outline-none bg-slate-100"
                      readOnly
                      value={current.companyData.estado}
                    />
                  </div>
                ) : (
                  <>
                    <p className="text-slate-700">
                      {current.companyData.endereco}, {current.companyData.numero}
                      {current.companyData.complemento && ` - ${current.companyData.complemento}`}
                    </p>
                    <p className="text-slate-700">
                      {current.companyData.bairro} • {current.companyData.cidade} - {current.companyData.estado} •
                      CEP: {current.companyData.cep}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Responsavel */}
          <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${editingClass}`}>
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-500" />
              <h3 className="font-bold text-slate-800">Dados do Responsavel</h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div className="col-span-2">
                <span className="block text-xs font-medium text-slate-400 uppercase mb-1">Nome Completo</span>
                {isEditing ? (
                  <input
                    className="w-full border border-slate-300 rounded px-2 py-1 outline-none focus:border-[#184689]"
                    value={current.responsavelData.nome}
                    onChange={(e) => updateField("responsavelData", "nome", e.target.value)}
                  />
                ) : (
                  <span className="font-semibold text-slate-800">{current.responsavelData.nome}</span>
                )}
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-400 uppercase mb-1">Cargo</span>
                {isEditing ? (
                  <input
                    className="w-full border border-slate-300 rounded px-2 py-1 outline-none focus:border-[#184689]"
                    value={current.responsavelData.cargo}
                    onChange={(e) => updateField("responsavelData", "cargo", e.target.value)}
                  />
                ) : (
                  <span className="text-slate-700">{current.responsavelData.cargo}</span>
                )}
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-400 uppercase mb-1">Telefone</span>
                {isEditing ? (
                  <input
                    className="w-full border border-slate-300 rounded px-2 py-1 outline-none focus:border-[#184689]"
                    value={current.responsavelData.telefone}
                    onChange={(e) => updateField("responsavelData", "telefone", e.target.value)}
                  />
                ) : (
                  <span className="text-slate-700">{current.responsavelData.telefone}</span>
                )}
              </div>
              <div className="col-span-2">
                <span className="block text-xs font-medium text-slate-400 uppercase mb-1">E-mail</span>
                {isEditing ? (
                  <input
                    type="email"
                    className="w-full border border-slate-300 rounded px-2 py-1 outline-none focus:border-[#184689]"
                    value={current.responsavelData.email}
                    onChange={(e) => updateField("responsavelData", "email", e.target.value)}
                  />
                ) : (
                  <span className="text-slate-700">{current.responsavelData.email}</span>
                )}
              </div>
            </div>
          </div>

          {/* Evento */}
          <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${editingClass}`}>
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
              <CalIcon className="w-5 h-5 text-slate-500" />
              <h3 className="font-bold text-slate-800">Dados do Evento & Agendamento</h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div className="col-span-2">
                <span className="block text-xs font-medium text-slate-400 uppercase mb-1">Sala Reservada</span>
                <span className="font-semibold text-[#184689] text-base">{booking.room}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-400 uppercase mb-1">Data</span>
                <span className="font-semibold text-slate-800">{booking.date}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-400 uppercase mb-1">Horario</span>
                <span className="font-semibold text-slate-800">{booking.time}</span>
              </div>
              <div className="col-span-2">
                <span className="block text-xs font-medium text-slate-400 uppercase mb-1">Nome do Evento</span>
                {isEditing ? (
                  <input
                    className="w-full border border-slate-300 rounded px-2 py-1 outline-none focus:border-[#184689]"
                    value={current.eventoData.nome}
                    onChange={(e) => updateField("eventoData", "nome", e.target.value)}
                  />
                ) : (
                  <span className="font-semibold text-slate-800">{current.eventoData.nome}</span>
                )}
              </div>
              <div className="col-span-2">
                <span className="block text-xs font-medium text-slate-400 uppercase mb-1">Finalidade</span>
                {isEditing ? (
                  <input
                    className="w-full border border-slate-300 rounded px-2 py-1 outline-none focus:border-[#184689]"
                    value={current.eventoData.finalidade}
                    onChange={(e) => updateField("eventoData", "finalidade", e.target.value)}
                  />
                ) : (
                  <span className="text-slate-700">{current.eventoData.finalidade}</span>
                )}
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-400 uppercase mb-1">Nº Participantes</span>
                {isEditing ? (
                  <input
                    type="number"
                    className="w-full border border-slate-300 rounded px-2 py-1 outline-none focus:border-[#184689]"
                    value={current.eventoData.participantes}
                    onChange={(e) => updateField("eventoData", "participantes", Number(e.target.value))}
                  />
                ) : (
                  <span className="text-slate-700">{current.eventoData.participantes} pessoas</span>
                )}
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-400 uppercase mb-1">Opcao de Pagamento</span>
                {isEditing ? (
                  <select
                    className="w-full border border-slate-300 rounded px-2 py-1 outline-none focus:border-[#184689]"
                    value={current.eventoData.pagamento}
                    onChange={(e) => updateField("eventoData", "pagamento", e.target.value)}
                  >
                    <option>Boleto</option>
                    <option>Cartao de Credito</option>
                    <option>PIX</option>
                    <option>Dinheiro</option>
                  </select>
                ) : (
                  <span className="text-slate-700">{current.eventoData.pagamento}</span>
                )}
              </div>
              <div className="col-span-2 bg-amber-50 p-3 rounded border border-amber-100 mt-2">
                <span className="block text-xs font-bold text-amber-600 uppercase mb-2">Responsavel no dia do evento</span>
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="border border-amber-200 rounded px-2 py-1 text-sm outline-none"
                      placeholder="Nome"
                      value={current.eventoData.responsavelDia}
                      onChange={(e) => updateField("eventoData", "responsavelDia", e.target.value)}
                    />
                    <input
                      className="border border-amber-200 rounded px-2 py-1 text-sm outline-none"
                      placeholder="Telefone"
                      value={current.eventoData.contatoDia}
                      onChange={(e) => updateField("eventoData", "contatoDia", e.target.value)}
                    />
                  </div>
                ) : (
                  <p className="text-amber-900 font-medium">
                    {current.eventoData.responsavelDia} — {current.eventoData.contatoDia}
                  </p>
                )}
              </div>
              <div className="col-span-2">
                <span className="block text-xs font-medium text-slate-400 uppercase mb-1">Informacoes Adicionais</span>
                {isEditing ? (
                  <textarea
                    rows={2}
                    className="w-full border border-slate-300 rounded px-2 py-1 outline-none focus:border-[#184689]"
                    value={current.eventoData.infoAdicional}
                    onChange={(e) => updateField("eventoData", "infoAdicional", e.target.value)}
                  />
                ) : current.eventoData.infoAdicional ? (
                  <p className="text-slate-700 italic bg-slate-50 p-3 rounded border border-slate-100">
                    &quot;{current.eventoData.infoAdicional}&quot;
                  </p>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white shrink-0">
          {isEditing ? (
            <div className="flex gap-3">
              <button
                onClick={handleEditCancel}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg font-medium text-sm hover:bg-slate-200 transition-colors"
              >
                Cancelar Edicao
              </button>
              <button
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#184689] text-white rounded-lg font-bold text-sm hover:bg-[#113262] transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" /> Salvar Alteracoes
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {booking.status === "Pendente" ? (
                <>
                  <button className="w-full py-2.5 bg-white border border-red-200 text-red-600 rounded-lg font-medium text-sm hover:bg-red-50 transition-colors">
                    Rejeitar
                  </button>
                  <button className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 transition-colors shadow-sm">
                    Aprovar Reserva
                  </button>
                </>
              ) : (
                <button
                  className="col-span-2 w-full py-2.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg font-medium text-sm hover:bg-slate-200 transition-colors"
                  onClick={handleClose}
                >
                  Fechar Dossie
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

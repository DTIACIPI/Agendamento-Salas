"use client"

import { useMemo, useState, memo } from "react"
import { Plus, Edit, Ban, CheckCircle2, Loader2, ShieldCheck, Shield, Search, Mail } from "lucide-react"
import { toast } from "sonner"
import type { User } from "@/lib/types"

type StatusFilter = "all" | "active" | "inactive"

interface UsersViewProps {
  users: User[]
  isLoading: boolean
  currentUserEmail?: string
  onOpenUserModal: (user: User | null) => void
  onToggleUserStatus: (id: string, activate: boolean) => Promise<void>
}

export const UsersView = memo(function UsersView({
  users,
  isLoading,
  currentUserEmail,
  onOpenUserModal,
  onToggleUserStatus,
}: UsersViewProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active")
  const [confirmToggleId, setConfirmToggleId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = users

    // Filtro de status
    if (statusFilter === "active") list = list.filter((u) => u.is_active)
    else if (statusFilter === "inactive") list = list.filter((u) => !u.is_active)

    // Busca texto
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q),
      )
    }

    return list
  }, [users, search, statusFilter])

  const counts = useMemo(() => ({
    all: users.length,
    active: users.filter((u) => u.is_active).length,
    inactive: users.filter((u) => !u.is_active).length,
  }), [users])

  const handleToggleStatus = async (user: User) => {
    const activate = !user.is_active
    setTogglingId(user.id)
    try {
      await onToggleUserStatus(user.id, activate)
      toast.success(activate ? "Usuario ativado!" : "Usuario desativado!")
    } catch {
      toast.error(activate ? "Erro ao ativar usuario" : "Erro ao desativar usuario")
    } finally {
      setTogglingId(null)
      setConfirmToggleId(null)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestao de Usuarios</h1>
          <p className="text-slate-500 text-sm mt-1">
            Controle quem tem acesso ao painel e seu nivel de permissao.
          </p>
        </div>
        <button
          onClick={() => onOpenUserModal(null)}
          className="flex items-center gap-2 bg-[#184689] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#113262] shadow-sm"
        >
          <Plus className="w-4 h-4" /> Novo Usuario
        </button>
      </div>

      {/* Filtros + Busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Filtro de status */}
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

        {/* Busca */}
        <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm px-4 py-2 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou perfil..."
            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-6 animate-pulse">
                <div className="h-9 w-9 bg-slate-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-slate-200 rounded" />
                  <div className="h-3 w-56 bg-slate-100 rounded" />
                </div>
                <div className="h-6 w-24 bg-slate-100 rounded-full" />
                <div className="h-6 w-20 bg-slate-100 rounded-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            {users.length === 0
              ? "Nenhum usuario cadastrado."
              : "Nenhum usuario encontrado para o filtro aplicado."}
          </div>
        ) : (
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-xs">
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Perfil</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((user) => {
                const isSelf = currentUserEmail?.toLowerCase() === user.email.toLowerCase()
                return (
                  <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${!user.is_active ? "opacity-60" : ""}`}>
                    {/* Usuario */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 ${
                          user.is_active
                            ? "bg-[#184689]/10 border-[#184689]/20 text-[#184689]"
                            : "bg-slate-100 border-slate-200 text-slate-400"
                        }`}>
                          {getInitials(user.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-800 truncate">{user.name}</p>
                            {isSelf && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-50 text-[#184689] border border-blue-100 rounded uppercase">
                                Voce
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                            <Mail className="w-3 h-3 shrink-0" /> {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Perfil */}
                    <td className="px-6 py-4">
                      <RoleBadge role={user.role} />
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <StatusBadge active={user.is_active} />
                    </td>

                    {/* Acoes */}
                    <td className="px-6 py-4">
                      {isSelf ? null : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onOpenUserModal(user)}
                            className="p-1.5 text-slate-400 hover:text-[#184689] hover:bg-[#184689]/10 rounded transition-colors"
                            title="Editar usuario"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {confirmToggleId === user.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleToggleStatus(user)}
                                disabled={togglingId === user.id}
                                className={`px-2 py-1 text-white text-xs font-medium rounded transition-colors disabled:opacity-50 ${
                                  user.is_active
                                    ? "bg-red-500 hover:bg-red-600"
                                    : "bg-emerald-500 hover:bg-emerald-600"
                                }`}
                              >
                                {togglingId === user.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  "Sim"
                                )}
                              </button>
                              <button
                                onClick={() => setConfirmToggleId(null)}
                                className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded hover:bg-slate-200 transition-colors"
                              >
                                Nao
                              </button>
                            </div>
                          ) : user.is_active ? (
                            <button
                              onClick={() => setConfirmToggleId(user.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              title="Desativar usuario"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmToggleId(user.id)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="Ativar usuario"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
})

/* ── Helpers ── */

function getInitials(name: string): string {
  if (!name) return "?"
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function RoleBadge({ role }: { role: "Super Admin" | "Admin" }) {
  const isSuper = role === "Super Admin"
  const Icon = isSuper ? ShieldCheck : Shield
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${
        isSuper
          ? "bg-purple-50 text-purple-700 border-purple-100"
          : "bg-blue-50 text-[#184689] border-blue-100"
      }`}
    >
      <Icon className="w-3 h-3" />
      {role}
    </span>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${
        active
          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
          : "bg-slate-100 text-slate-600 border-slate-200"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`}
      />
      {active ? "Ativo" : "Inativo"}
    </span>
  )
}

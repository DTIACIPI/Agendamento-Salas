"use client"

import { useState, useEffect } from "react"
import { X, Save, Plus, Loader2, Mail, User as UserIcon, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/utils"
import { authFetch } from "@/lib/auth/auth-fetch"
import type { User, UserCreatePayload, UserUpdatePayload } from "@/lib/types"

const USERS_BASE = `${API_BASE_URL}/webhook/api/users`
const USER_UPDATE = (id: string) => `${API_BASE_URL}/webhook/4a72b69f-b638-4681-9823-28f5d855af58/api/users/${id}`

interface UserModalProps {
  open: boolean
  editingUser: User | null
  onClose: () => void
  onSaved: () => void
}

export function UserModal({ open, editingUser, onClose, onSaved }: UserModalProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"Super Admin" | "Admin">("Admin")
  const [isActive, setIsActive] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editingUser) {
      setName(editingUser.name)
      setEmail(editingUser.email)
      setRole(editingUser.role)
      setIsActive(editingUser.is_active)
    } else {
      setName("")
      setEmail("")
      setRole("Admin")
      setIsActive(true)
    }
  }, [open, editingUser])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const url = editingUser ? USER_UPDATE(editingUser.id) : USERS_BASE
      const method = editingUser ? "PATCH" : "POST"

      const role_id = role === "Super Admin" ? 1 : 2

      const payload = editingUser
        ? { name: name.trim(), role_id, is_active: isActive ? 1 : 0 }
        : { name: name.trim(), email: email.trim().toLowerCase(), role_id, is_active: isActive ? 1 : 0 }

      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => "")
        throw new Error(body || "Falha ao salvar usuario")
      }

      toast.success(editingUser ? "Usuario atualizado!" : "Usuario criado com sucesso!")
      onSaved()
      onClose()
    } catch (error) {
      console.error("Erro ao salvar usuario:", error)
      toast.error("Erro ao salvar usuario. Tente novamente.")
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
              {editingUser ? "Editar Usuario" : "Novo Usuario"}
            </h3>
            <button type="button" onClick={onClose}>
              <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5" /> Nome Completo
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#184689]"
                placeholder="Ex: Maria Silva"
              />
            </div>

            {/* E-mail */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> E-mail Corporativo
              </label>
              <input
                type="email"
                required
                disabled={!!editingUser}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#184689] disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                placeholder="usuario@acipi.com.br"
              />
              {editingUser && (
                <p className="text-[11px] text-slate-400 mt-1">O e-mail nao pode ser alterado.</p>
              )}
            </div>

            {/* Perfil */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Perfil de Acesso
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "Super Admin" | "Admin")}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#184689] bg-white"
              >
                <option value="Admin">Admin (Operacional)</option>
                <option value="Super Admin">Super Admin (Acesso Total)</option>
              </select>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg px-4 py-3 mt-2">
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {isActive ? "Conta Ativa" : "Conta Inativa"}
                </p>
                <p className="text-xs text-slate-500">
                  {isActive
                    ? "O usuario pode fazer login no painel."
                    : "Acesso bloqueado ate reativacao."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                aria-pressed={isActive}
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
              ) : editingUser ? (
                <>
                  <Save className="w-4 h-4" /> Salvar Edicao
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Criar Usuario
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

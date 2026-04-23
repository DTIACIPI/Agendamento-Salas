"use client"

import { useState } from "react"
import { X, User, Mail, Shield, Pencil, Save, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth/auth-context"
import { authFetch } from "@/lib/auth/auth-fetch"
import { API_BASE_URL } from "@/lib/utils"

interface ProfileModalProps {
  open: boolean
  onClose: () => void
}

const USER_UPDATE = (id: string | number) =>
  `${API_BASE_URL}/webhook/4a72b69f-b638-4681-9823-28f5d855af58/api/users/${id}`

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { user, updateUserName } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [draftName, setDraftName] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  if (!open || !user) return null

  const initials = user.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?"

  const canEdit = !!user.id

  const startEditing = () => {
    setDraftName(user.name)
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setDraftName("")
  }

  const handleSave = async () => {
    if (!user.id || !draftName.trim()) return
    setIsSaving(true)
    try {
      const res = await authFetch(USER_UPDATE(user.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          name: draftName.trim(),
          role_id: user.role === "Super Admin" ? 1 : 2,
          is_active: 1,
        }),
      })
      if (!res.ok) throw new Error("Falha ao salvar")
      updateUserName(draftName.trim())
      toast.success("Nome atualizado!")
      setIsEditing(false)
    } catch {
      toast.error("Erro ao atualizar nome. Tente novamente.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#184689] px-6 py-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Meus Dados</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Avatar + nome */}
        <div className="flex flex-col items-center px-6 py-6 border-b border-slate-100">
          <div className="w-20 h-20 rounded-full bg-[#184689]/10 border-2 border-[#184689]/20 flex items-center justify-center text-[#184689] font-bold text-2xl mb-3">
            {initials}
          </div>
          <p className="text-lg font-bold text-slate-800">{user.name || "Sem nome"}</p>
          <span className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">
            <Shield className="w-3 h-3" />
            {user.role}
          </span>
        </div>

        {/* Detalhes */}
        <div className="px-6 py-5 space-y-4">
          {/* Nome */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Nome completo</p>
              {isEditing ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-sm border border-blue-200 bg-blue-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 font-medium text-slate-800"
                    autoFocus
                  />
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !draftName.trim()}
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Salvar"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={cancelEditing}
                    disabled={isSaving}
                    className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                    title="Cancelar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-sm font-medium text-slate-800 break-words">{user.name || "—"}</p>
                  {canEdit && (
                    <button
                      onClick={startEditing}
                      className="p-1 text-slate-400 hover:text-[#184689] hover:bg-blue-50 rounded transition-colors"
                      title="Editar nome"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* E-mail */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">E-mail corporativo</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5 break-all">{user.email || "—"}</p>
            </div>
          </div>

          {/* Perfil */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Perfil de acesso</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">{user.role}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors shadow-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth/auth-context"
import { Loader2, AlertCircle, X } from "lucide-react"

export function LoginPage() {
  const { login, authError, clearAuthError } = useAuth()
  const [isRedirecting, setIsRedirecting] = useState(false)

  const handleLogin = async () => {
    setIsRedirecting(true)
    try {
      await login()
    } catch {
      setIsRedirecting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 p-4">
      <div className="w-full max-w-md">
        {/* Banner de erro */}
        {authError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-800">Acesso negado</p>
                <p className="text-sm text-red-700 mt-1 leading-relaxed break-words">{authError}</p>
              </div>
              <button
                onClick={clearAuthError}
                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 rounded transition-colors shrink-0"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header azul */}
          <div className="bg-[#184689] px-8 py-10 text-center">
            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-[#184689] font-black text-3xl leading-none">A</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Admin ACIPI
            </h1>
            <p className="text-blue-200 text-sm mt-1.5">
              Painel de Agendamento de Salas
            </p>
          </div>

          {/* Corpo */}
          <div className="px-8 py-8 space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-slate-800">
                Acesso Restrito
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Utilize sua conta corporativa Microsoft 365 para acessar o painel administrativo.
              </p>
            </div>

            <button
              onClick={handleLogin}
              disabled={isRedirecting}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-[#2F2F2F] hover:bg-[#1a1a1a] disabled:bg-slate-300 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-md disabled:cursor-not-allowed"
            >
              {isRedirecting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Redirecionando...
                </>
              ) : (
                <>
                  {/* Microsoft logo */}
                  <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                    <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                    <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                    <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                  </svg>
                  {authError ? "Tentar com outra conta" : "Entrar com conta corporativa"}
                </>
              )}
            </button>

            <p className="text-xs text-center text-slate-400 leading-relaxed">
              Somente colaboradores autorizados podem acessar este sistema.
              <br />
              Em caso de problemas, contacte o suporte de TI.
            </p>
          </div>
        </div>

        {/* Rodape */}
        <p className="text-center text-xs text-slate-400 mt-6">
          &copy; {new Date().getFullYear()} ACIPI — Todos os direitos reservados
        </p>
      </div>
    </div>
  )
}

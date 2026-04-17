"use client"

import { useEffect } from "react"
import { useAuth } from "@/lib/auth/auth-context"
import { configureAuthFetch } from "@/lib/auth/auth-fetch"
import { LoginPage } from "./login-page"

/**
 * Protege o conteudo do painel:
 * - Mostra loading enquanto verifica autenticacao
 * - Redireciona para login se nao autenticado
 * - Configura o interceptor de fetch autenticado
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, getAccessToken, logout } = useAuth()

  // Configurar o interceptor de fetch com token + handler de 401
  useEffect(() => {
    configureAuthFetch(getAccessToken, () => {
      logout()
    })
  }, [getAccessToken, logout])

  // Tela de carregamento enquanto verifica sessao
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-[#184689] rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-black text-2xl">A</span>
          </div>
          <div className="size-6 border-2 border-[#184689] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // Nao autenticado => tela de login
  if (!isAuthenticated) {
    return <LoginPage />
  }

  // Autenticado => renderiza painel
  return <>{children}</>
}

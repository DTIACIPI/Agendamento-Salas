"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  PublicClientApplication,
  EventType,
  type AuthenticationResult,
} from "@azure/msal-browser"
import { msalConfig, loginRequest } from "./msal-config"
import { API_BASE_URL } from "@/lib/utils"
import type { AuthUser, UserRole } from "./types"

/* ─── Context shape ─── */

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  isSuperAdmin: boolean
  authError: string | null
  login: () => Promise<void>
  logout: () => Promise<void>
  clearAuthError: () => void
  getAccessToken: () => Promise<string | null>
  updateUserName: (name: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/* ─── Provider ─── */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const pcaRef = useRef<PublicClientApplication | null>(null)
  const [msalReady, setMsalReady] = useState(false)

  /* Limpa estado MSAL local SEM redirecionar para Microsoft.
     Usado quando o backend rejeita: mantemos o usuario na nossa
     tela de login mostrando o erro, em vez de mandar para a Microsoft. */
  const clearLocalMsalSession = useCallback(async (pca: PublicClientApplication) => {
    try {
      const accounts = pca.getAllAccounts()
      for (const acc of accounts) {
        await pca.clearCache({ account: acc })
      }
      pca.setActiveAccount(null)
    } catch (error) {
      console.error("[Auth] Erro ao limpar sessao local:", error)
    }
  }, [])

  // Inicializar MSAL apenas no browser
  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        // Cria instancia apenas no client-side
        const pca = new PublicClientApplication(msalConfig)
        pcaRef.current = pca

        await pca.initialize()

        // Tratar redirect callback (quando volta do login Microsoft)
        const response = await pca.handleRedirectPromise()
        if (response?.account) {
          pca.setActiveAccount(response.account)
        }

        // Registrar evento de login
        pca.addEventCallback((event) => {
          if (
            event.eventType === EventType.LOGIN_SUCCESS &&
            (event.payload as AuthenticationResult)?.account
          ) {
            pca.setActiveAccount((event.payload as AuthenticationResult).account)
          }
        })

        if (!cancelled) setMsalReady(true)
      } catch (error) {
        console.error("[Auth] Erro ao inicializar MSAL:", error)
        if (!cancelled) {
          setMsalReady(true)
          setIsLoading(false)
        }
      }
    }

    init()
    return () => { cancelled = true }
  }, [])

  // Buscar /api/auth/me quando MSAL estiver pronto e houver conta ativa
  useEffect(() => {
    if (!msalReady) return
    const pca = pcaRef.current
    if (!pca) { setIsLoading(false); return }

    let cancelled = false

    const fetchMe = async () => {
      const account = pca.getActiveAccount() ?? pca.getAllAccounts()[0]
      if (!account) {
        setIsLoading(false)
        return
      }

      pca.setActiveAccount(account)

      const rejectAccess = async (message: string) => {
        await clearLocalMsalSession(pca)
        if (!cancelled) {
          setUser(null)
          setAuthError(message)
          setIsLoading(false)
        }
      }

      try {
        const tokenResponse = await pca.acquireTokenSilent({
          ...loginRequest,
          account,
        })

        const res = await fetch(`${API_BASE_URL}/webhook/api/auth/me`, {
          headers: { Authorization: `Bearer ${tokenResponse.accessToken}` },
          cache: "no-store",
        })

        // 401 / 403 = nao autorizado pelo backend
        if (res.status === 401 || res.status === 403) {
          await rejectAccess(
            `A conta ${account.username ?? ""} nao esta autorizada a acessar este sistema. Contacte o administrador.`
          )
          return
        }

        if (!res.ok) {
          await rejectAccess("Nao foi possivel validar sua identidade. Tente novamente em instantes.")
          return
        }

        // Body vazio = nao autorizado
        const text = await res.text()

        if (!text || text.trim() === "") {
          await rejectAccess(
            `A conta ${account.username ?? ""} nao esta cadastrada no sistema. Contacte o administrador.`
          )
          return
        }

        const raw = JSON.parse(text)

        // Normaliza: pode vir como array, objeto direto, {data:...}, {user:...} ou wrapped
        // Formato real do backend: { authorized, http_code, user: { email, name, role } }
        const wrapper = Array.isArray(raw) ? raw[0] : raw

        // Backend pode rejeitar com http 200 + authorized:false
        if (wrapper?.authorized === false) {
          await rejectAccess(
            `A conta ${account.username ?? ""} nao esta autorizada a acessar este sistema. Contacte o administrador.`
          )
          return
        }

        const data = wrapper?.user ?? wrapper?.data ?? wrapper

        // Se nao retornou nenhum dado utilizavel, rejeita
        if (!data || (typeof data !== "object")) {
          await rejectAccess(
            `A conta ${account.username ?? ""} nao esta cadastrada no sistema. Contacte o administrador.`
          )
          return
        }

        // Aceita se tem qualquer identificador (email/name/role) — backend ja validou
        const hasIdentifier = data.email || data.name || data.nome || data.role || data.perfil
        if (!hasIdentifier) {
          await rejectAccess(
            `A conta ${account.username ?? ""} nao esta cadastrada no sistema. Contacte o administrador.`
          )
          return
        }

        if (!cancelled) {
          const resolvedRole = (data.role ?? data.perfil ?? "Admin") as UserRole
          setUser({
            id: data.id ?? undefined,
            name: data.name ?? data.nome ?? account.name ?? "",
            email: data.email ?? account.username ?? "",
            role: resolvedRole,
          })
          setAuthError(null)
          setIsLoading(false)
        }
      } catch (error) {
        console.error("[Auth] Erro ao buscar /api/auth/me:", error)
        await rejectAccess("Erro de comunicacao com o servidor. Tente novamente.")
      }
    }

    fetchMe()
    return () => { cancelled = true }
  }, [msalReady])

  // Login: redireciona para Microsoft (sempre mostra account picker
  // para que o usuario possa escolher outra conta apos uma rejeicao)
  const login = useCallback(async () => {
    const pca = pcaRef.current
    if (!pca) return
    try {
      setAuthError(null)
      await pca.loginRedirect({
        ...loginRequest,
        prompt: "select_account",
      })
    } catch (error) {
      console.error("[Auth] Erro no login:", error)
    }
  }, [])

  const clearAuthError = useCallback(() => setAuthError(null), [])

  const updateUserName = useCallback((name: string) => {
    setUser((prev) => prev ? { ...prev, name } : prev)
  }, [])

  // Logout: limpa sessao local + encerra sessao Microsoft
  const logout = useCallback(async () => {
    const pca = pcaRef.current
    if (!pca) return
    const account = pca.getActiveAccount()
    setUser(null)
    sessionStorage.clear()

    try {
      await pca.logoutRedirect({
        account: account ?? undefined,
        postLogoutRedirectUri: msalConfig.auth.postLogoutRedirectUri,
      })
    } catch (error) {
      console.error("[Auth] Erro no logout:", error)
      window.location.href = "/"
    }
  }, [])

  // Obter token para chamadas API
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const pca = pcaRef.current
    if (!pca) return null
    const account = pca.getActiveAccount() ?? pca.getAllAccounts()[0]
    if (!account) return null

    try {
      const response = await pca.acquireTokenSilent({
        ...loginRequest,
        account,
      })
      return response.accessToken
    } catch {
      // Token expirou e nao pode ser renovado silenciosamente
      setUser(null)
      sessionStorage.clear()
      return null
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      isSuperAdmin: user?.role === "Super Admin",
      authError,
      login,
      logout,
      clearAuthError,
      getAccessToken,
      updateUserName,
    }),
    [user, isLoading, authError, login, logout, clearAuthError, getAccessToken, updateUserName],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/* ─── Hook ─── */

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>")
  return ctx
}

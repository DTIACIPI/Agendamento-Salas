import { API_BASE_URL } from "@/lib/utils"

type GetTokenFn = () => Promise<string | null>
type OnUnauthorizedFn = () => void

let _getToken: GetTokenFn = async () => null
let _onUnauthorized: OnUnauthorizedFn = () => {}

/**
 * Configura o interceptor de autenticação.
 * Chamado uma vez pelo AuthProvider quando monta.
 */
export function configureAuthFetch(
  getToken: GetTokenFn,
  onUnauthorized: OnUnauthorizedFn,
) {
  _getToken = getToken
  _onUnauthorized = onUnauthorized
}

/**
 * Fetch autenticado — injeta Bearer token e trata 401.
 * Substitui `fetch` nas chamadas para a API.
 */
export async function authFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url

  // Só injeta token em chamadas para a nossa API
  const isApiCall = url.startsWith(API_BASE_URL)

  const headers = new Headers(init?.headers)

  if (isApiCall) {
    const token = await _getToken()
    if (token) {
      headers.set("Authorization", `Bearer ${token}`)
    }
    if (!headers.has("Content-Type") && init?.body) {
      headers.set("Content-Type", "application/json; charset=utf-8")
    }
  }

  const response = await fetch(input, { ...init, headers })

  // Se 401, forçar logout
  if (response.status === 401 && isApiCall) {
    _onUnauthorized()
  }

  return response
}

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { configureAuthFetch, authFetch } from '@/lib/auth/auth-fetch'
import { API_BASE_URL } from '@/lib/utils'

describe('authFetch', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  function mockResponse(status = 200, body = '{}') {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(body, { status }),
    )
  }

  function getLastCallInit() {
    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls
    return calls[calls.length - 1]
  }

  it('injeta Bearer token em chamadas para a API', async () => {
    configureAuthFetch(async () => 'test-token-123', () => {})
    mockResponse()

    await authFetch(`${API_BASE_URL}/webhook/api/bookings`)

    const [, init] = getLastCallInit()
    const headers = init.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer test-token-123')
  })

  it('nao injeta token em chamadas para URLs externas', async () => {
    configureAuthFetch(async () => 'test-token-123', () => {})
    mockResponse()

    await authFetch('https://outra-api.com/data')

    const [, init] = getLastCallInit()
    const headers = init.headers as Headers
    expect(headers.get('Authorization')).toBeNull()
  })

  it('chama onUnauthorized quando recebe 401 da API', async () => {
    const onUnauth = vi.fn()
    configureAuthFetch(async () => 'token', onUnauth)
    mockResponse(401)

    await authFetch(`${API_BASE_URL}/webhook/api/bookings`)

    expect(onUnauth).toHaveBeenCalledOnce()
  })

  it('nao chama onUnauthorized para 401 de URL externa', async () => {
    const onUnauth = vi.fn()
    configureAuthFetch(async () => 'token', onUnauth)
    mockResponse(401)

    await authFetch('https://outra-api.com/data')

    expect(onUnauth).not.toHaveBeenCalled()
  })

  it('nao chama onUnauthorized para outros codigos de erro', async () => {
    const onUnauth = vi.fn()
    configureAuthFetch(async () => 'token', onUnauth)
    mockResponse(403)

    await authFetch(`${API_BASE_URL}/webhook/api/bookings`)

    expect(onUnauth).not.toHaveBeenCalled()
  })

  it('retorna a Response original do fetch', async () => {
    configureAuthFetch(async () => 'token', () => {})
    const body = JSON.stringify({ data: [1, 2, 3] })
    mockResponse(200, body)

    const res = await authFetch(`${API_BASE_URL}/webhook/api/bookings`)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toEqual([1, 2, 3])
  })

  it('propaga headers customizados junto com Authorization', async () => {
    configureAuthFetch(async () => 'test-token-123', () => {})
    mockResponse()

    await authFetch(`${API_BASE_URL}/webhook/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    const [, init] = getLastCallInit()
    const headers = init.headers as Headers
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(headers.get('Authorization')).toBe('Bearer test-token-123')
  })

  it('funciona quando token eh null (nao autenticado)', async () => {
    configureAuthFetch(async () => null, () => {})
    mockResponse()

    await authFetch(`${API_BASE_URL}/webhook/api/bookings`)

    const [, init] = getLastCallInit()
    const headers = init.headers as Headers
    expect(headers.get('Authorization')).toBeNull()
  })

  it('propaga method e body corretamente', async () => {
    configureAuthFetch(async () => 'test-token-123', () => {})
    mockResponse()
    const body = JSON.stringify({ status: 'Confirmada' })

    await authFetch(`${API_BASE_URL}/webhook/api/bookings/123/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body,
    })

    const [url, init] = getLastCallInit()
    expect(url).toBe(`${API_BASE_URL}/webhook/api/bookings/123/status`)
    expect(init.method).toBe('PATCH')
    expect(init.body).toBe(body)
  })
})

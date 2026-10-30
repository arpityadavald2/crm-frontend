const TOKEN_KEY = 'crm_token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // storage unavailable: user will need to log in again after reload
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore
  }
}

export type FieldError = { field: string; message: string }

/** Matches the backend error shape: { error: { code, message, requestId, details } } */
export class ApiError extends Error {
  status: number
  code: string
  requestId?: string
  details?: FieldError[]

  constructor(
    status: number,
    code: string,
    message: string,
    requestId?: string,
    details?: FieldError[],
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.requestId = requestId
    this.details = details
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server')
  }

  if (res.status === 204) return undefined as T

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    // non-JSON body
  }

  if (!res.ok) {
    const err = (data as { error?: Record<string, unknown> } | null)?.error
    throw new ApiError(
      res.status,
      typeof err?.code === 'string' ? err.code : 'UNKNOWN_ERROR',
      typeof err?.message === 'string' ? err.message : `Request failed (${res.status})`,
      typeof err?.requestId === 'string' ? err.requestId : undefined,
      Array.isArray(err?.details) ? (err.details as FieldError[]) : undefined,
    )
  }
  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}

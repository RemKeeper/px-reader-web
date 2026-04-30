import { ApiError } from '@/types'
import type {
  LoginResponse,
  MessageResponse,
  RecommendedNovelsResponse,
  FollowNovelsResponse,
  UserNovelsResponse,
  NovelTextResponse,
} from '@/types'

const BASE_URL = import.meta.env.DEV
  ? '/api'
  : (import.meta.env.VITE_API_BASE_URL || '')

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!res.ok) {
    let message = `HTTP ${res.status}`
    // 只读一次响应体：先取文本，再尝试 JSON 解析。
    // 后端 http.Error() 会返回 text/plain，重复读流会触发
    // "Failed to execute 'text' on 'Response': body stream already read"
    // 并把真正的服务端错误信息吞掉。
    const text = await res.text().catch(() => '')
    if (text) {
      try {
        const body = JSON.parse(text)
        message = body.error || body.message || text
      } catch {
        message = text
      }
    }
    throw new ApiError(message, res.status)
  }

  return res.json() as Promise<T>
}

// ── Auth ──────────────────────────────────────────────

export function getLoginUrl(): Promise<LoginResponse> {
  return request('/login')
}

export function handleCallback(code: string, codeVerifier: string): Promise<MessageResponse> {
  const qs = new URLSearchParams()
  qs.set('code', code)
  qs.set('code_verifier', codeVerifier)
  return request(`/callback?${qs.toString()}`)
}

export function refreshToken(): Promise<MessageResponse> {
  return request('/refresh')
}

// ── Novel ─────────────────────────────────────────────

export function getRecommendedNovels(params?: {
  filter?: string
  include_ranking_novels?: string
  offset?: string
}): Promise<RecommendedNovelsResponse> {
  const qs = new URLSearchParams()
  if (params?.filter) qs.set('filter', params.filter)
  if (params?.include_ranking_novels) qs.set('include_ranking_novels', params.include_ranking_novels)
  if (params?.offset) qs.set('offset', params.offset)
  const query = qs.toString()
  return request(`/novel/recommended${query ? `?${query}` : ''}`)
}

export function getFollowNovels(params?: {
  restrict?: string
  offset?: string
}): Promise<FollowNovelsResponse> {
  const qs = new URLSearchParams()
  if (params?.restrict) qs.set('restrict', params.restrict)
  if (params?.offset) qs.set('offset', params.offset)
  const query = qs.toString()
  return request(`/novel/follow${query ? `?${query}` : ''}`)
}

export function getNovelText(id: string | number): Promise<NovelTextResponse> {
  return request(`/novel/text?id=${encodeURIComponent(id)}`)
}

export function getUserNovels(params: {
  user_id: string | number
  offset?: string
}): Promise<UserNovelsResponse> {
  const qs = new URLSearchParams()
  qs.set('user_id', String(params.user_id))
  if (params.offset) qs.set('offset', params.offset)
  return request(`/novel/user?${qs.toString()}`)
}

// ── Image Proxy ───────────────────────────────────────

export function getProxiedImageUrl(imageUrl: string): string {
  return `${BASE_URL}/novel/proxy?url=${encodeURIComponent(imageUrl)}`
}

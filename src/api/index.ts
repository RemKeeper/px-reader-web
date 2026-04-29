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
    try {
      const body = await res.json()
      message = body.error || message
    } catch {
      message = (await res.text()) || message
    }
    throw new ApiError(message, res.status)
  }

  return res.json() as Promise<T>
}

// ── Auth ──────────────────────────────────────────────

export function getLoginUrl(): Promise<LoginResponse> {
  return request('/login')
}

export function handleCallback(code: string): Promise<MessageResponse> {
  return request(`/callback?code=${encodeURIComponent(code)}`)
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

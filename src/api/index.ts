/**
 * Pixiv API 客户端（纯前端 + 极简代理架构）
 *
 * 架构：
 *   浏览器  →  Cloudflare Worker（透明代理：注入 UA / X-Client-Hash / CORS）
 *           →  oauth.secure.pixiv.net  /  app-api.pixiv.net  /  i.pximg.net
 *
 * 代理路径约定（worker.js 中实现）：
 *   POST  ${BASE}/oauth/auth/token        → https://oauth.secure.pixiv.net/auth/token
 *   *     ${BASE}/app/<path>              → https://app-api.pixiv.net/<path>
 *   GET   ${BASE}/image?url=<encoded>     → 图片（自动加 Referer）
 */

import { ApiError } from '@/types'
import type {
  RecommendedNovelsResponse,
  FollowNovelsResponse,
  UserNovelsResponse,
  NovelTextResponse,
} from '@/types'
import {
  generateCodeVerifier,
  deriveCodeChallenge,
  buildLoginUrl,
  PIXIV_OAUTH,
} from '@/utils/pkce'
import {
  loadTokens,
  saveTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  isAccessTokenExpired,
} from '@/utils/token'

const BASE_URL = import.meta.env.DEV
  ? '/api'
  : (import.meta.env.VITE_API_BASE_URL || '')

// ── Token 交换 / 刷新 ─────────────────────────────────

interface PixivTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
  user?: unknown
}

async function postTokenForm(form: URLSearchParams): Promise<PixivTokenResponse> {
  const res = await fetch(`${BASE_URL}/oauth/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  })
  const text = await res.text()
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const j = JSON.parse(text)
      msg = j.error_description || j.message || j.error || msg
    } catch {
      if (text) msg = text.slice(0, 300)
    }
    throw new ApiError(msg, res.status)
  }
  try {
    return JSON.parse(text) as PixivTokenResponse
  } catch {
    throw new ApiError('token response is not JSON: ' + text.slice(0, 200), 502)
  }
}

function persistTokens(resp: PixivTokenResponse) {
  saveTokens({
    accessToken: resp.access_token,
    refreshToken: resp.refresh_token,
    expiresAt: Date.now() + (resp.expires_in || 3600) * 1000,
  })
}

// ── 认证（前端实现 PKCE 全流程） ──────────────────────

/**
 * 生成 Pixiv 登录 URL 与 PKCE code_verifier。
 * code_verifier 暂存到 localStorage，等回调时取出来交换 token。
 */
export async function getLoginUrl(): Promise<{ login_url: string; code_verifier: string }> {
  const verifier = generateCodeVerifier()
  const challenge = await deriveCodeChallenge(verifier)
  const loginUrl = buildLoginUrl(challenge)
  return { login_url: loginUrl, code_verifier: verifier }
}

/** 用授权码换 access/refresh token */
export async function handleCallback(code: string, codeVerifier: string): Promise<void> {
  const form = new URLSearchParams({
    client_id: PIXIV_OAUTH.clientId,
    client_secret: PIXIV_OAUTH.clientSecret,
    code,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
    include_policy: 'true',
    redirect_uri: PIXIV_OAUTH.redirectUri,
  })
  const resp = await postTokenForm(form)
  if (!resp.access_token) throw new ApiError('no access_token in response', 502)
  persistTokens(resp)
}

/** 用 refresh_token 刷新 access_token */
export async function refreshToken(): Promise<void> {
  const rt = getRefreshToken()
  if (!rt) throw new ApiError('no refresh_token, please login first', 401)
  const form = new URLSearchParams({
    client_id: PIXIV_OAUTH.clientId,
    client_secret: PIXIV_OAUTH.clientSecret,
    grant_type: 'refresh_token',
    include_policy: 'true',
    refresh_token: rt,
  })
  const resp = await postTokenForm(form)
  if (!resp.access_token) throw new ApiError('no access_token in refresh response', 502)
  persistTokens(resp)
}

export function logout(): void {
  clearTokens()
}

export function hasTokens(): boolean {
  return !!loadTokens()
}

// ── 通用请求（带 Bearer + 401 自动刷新一次） ──────────

interface ApiRequestOptions {
  method?: 'GET' | 'POST'
  query?: Record<string, string | undefined>
  /** 期望响应格式：默认 json */
  responseType?: 'json' | 'text'
  /** 内部用：避免无限重试 */
  _retry?: boolean
}

async function apiRequest<T>(path: string, opts: ApiRequestOptions = {}): Promise<T> {
  // 主动续期：access_token 过期前 60s 提前刷新
  if (isAccessTokenExpired() && getRefreshToken() && !opts._retry) {
    try {
      await refreshToken()
    } catch {
      /* 让下面的 401 处理来兜底 */
    }
  }

  const access = getAccessToken()
  if (!access) throw new ApiError('not logged in', 401)

  const qs = new URLSearchParams()
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v)
    }
  }
  const q = qs.toString()
  const url = `${BASE_URL}/app${path}${q ? `?${q}` : ''}`

  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers: { Authorization: `Bearer ${access}` },
  })

  if (res.status === 401 && !opts._retry && getRefreshToken()) {
    try {
      await refreshToken()
      return apiRequest<T>(path, { ...opts, _retry: true })
    } catch (e) {
      clearTokens()
      throw e instanceof ApiError ? e : new ApiError('refresh failed', 401)
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let msg = `HTTP ${res.status}`
    if (text) {
      try {
        const j = JSON.parse(text)
        msg = j.error?.user_message || j.error?.message || j.message || j.error || text.slice(0, 300)
      } catch {
        msg = text.slice(0, 300)
      }
    }
    throw new ApiError(msg, res.status)
  }

  if (opts.responseType === 'text') {
    return (await res.text()) as unknown as T
  }
  return (await res.json()) as T
}

// ── Novel 业务接口 ────────────────────────────────────

export function getRecommendedNovels(params?: {
  filter?: string
  include_ranking_novels?: string
  offset?: string
}): Promise<RecommendedNovelsResponse> {
  return apiRequest<RecommendedNovelsResponse>('/v1/novel/recommended', {
    query: {
      filter: params?.filter || 'for_ios',
      include_ranking_novels: params?.include_ranking_novels,
      offset: params?.offset,
    },
  })
}

export function getFollowNovels(params?: {
  restrict?: string
  offset?: string
}): Promise<FollowNovelsResponse> {
  return apiRequest<FollowNovelsResponse>('/v1/novel/follow', {
    query: {
      restrict: params?.restrict || 'public',
      offset: params?.offset,
    },
  })
}

export function getUserNovels(params: {
  user_id: string | number
  offset?: string
}): Promise<UserNovelsResponse> {
  return apiRequest<UserNovelsResponse>('/v1/user/novels', {
    query: {
      user_id: String(params.user_id),
      offset: params.offset,
    },
  })
}

/** 搜索小说 */
export function searchNovels(params: {
  word: string
  search_target?: string
  sort?: string
  offset?: string
}): Promise<FollowNovelsResponse> {
  return apiRequest<FollowNovelsResponse>('/v1/search/novel', {
    query: {
      word: params.word,
      search_target: params.search_target || 'partial_match_for_tags',
      sort: params.sort || 'date_desc',
      offset: params.offset,
    },
  })
}

/**
 * 获取小说正文。
 *
 * Pixiv 已下线 `/v1/novel/text` 接口（参考 pixivpy #337），
 * 现统一使用 `/webview/v2/novel?id=X&viewer_version=20221031_ai`，
 * 该接口返回 HTML，正文 JSON 内嵌在 `novel: { ... }, isOwnWork` 片段中。
 */
export async function getNovelText(id: string | number): Promise<NovelTextResponse> {
  const html = await apiRequest<string>('/webview/v2/novel', {
    query: { id: String(id), viewer_version: '20221031_ai' },
    responseType: 'text',
  })

  // 极少数情况下后端可能直接返回 JSON
  if (html.trimStart().startsWith('{')) {
    try {
      const j = JSON.parse(html)
      if (j && typeof j.novel_text === 'string') return j as NovelTextResponse
      if (j && typeof j.text === 'string') return webviewNovelToResponse(j)
    } catch { /* 继续按 HTML 处理 */ }
  }

  const data = extractNovelFromHtml(html)
  if (!data) throw new ApiError('failed to parse novel response', 502)
  return data
}

interface WebviewNovelJson {
  text: string
  marker?: unknown
  seriesPrev?: unknown
  seriesNext?: unknown
  series_prev?: unknown
  series_next?: unknown
  novel_text?: string
  illusts?: unknown
  images?: unknown
}

function webviewNovelToResponse(obj: WebviewNovelJson): NovelTextResponse {
  return {
    novel_marker: (obj.marker as Record<string, unknown>) || {},
    novel_text: obj.novel_text || obj.text,
    series_prev: (obj.seriesPrev || obj.series_prev || {}) as Record<string, unknown>,
    series_next: (obj.seriesNext || obj.series_next || {}) as Record<string, unknown>,
    illusts: obj.illusts as NovelTextResponse['illusts'],
    images: obj.images as NovelTextResponse['images'],
  }
}

function extractNovelFromHtml(html: string): NovelTextResponse | null {
  // pixivpy 使用的提取方式：novel: {...}, isOwnWork
  // 这里用平衡花括号扫描以处理任意嵌套深度。
  const marker = 'novel:'
  const idx = html.indexOf(marker)
  if (idx >= 0) {
    // 跳过空白找到 '{'
    let i = idx + marker.length
    while (i < html.length && /\s/.test(html[i]!)) i++
    if (html[i] === '{') {
      const start = i
      let depth = 0
      let inStr = false
      let escape = false
      for (; i < html.length; i++) {
        const ch = html[i]!
        if (escape) { escape = false; continue }
        if (ch === '\\') { escape = true; continue }
        if (ch === '"') { inStr = !inStr; continue }
        if (inStr) continue
        if (ch === '{') depth++
        else if (ch === '}') {
          depth--
          if (depth === 0) {
            const jsonStr = html.slice(start, i + 1)
            try {
              const obj = JSON.parse(jsonStr) as WebviewNovelJson
              if (obj && typeof obj.text === 'string') return webviewNovelToResponse(obj)
            } catch { /* fallthrough */ }
            break
          }
        }
      }
    }
  }
  // 兜底：旧式正则
  const fallbacks: RegExp[] = [
    /window\.novel\s*=\s*(\{[\s\S]*?\});/,
    /id="novel-data"[^>]*>([\s\S]*?)<\//,
  ]
  for (const re of fallbacks) {
    const m = html.match(re)
    if (m && m[1]) {
      try {
        const obj = JSON.parse(m[1]) as WebviewNovelJson
        if (obj && typeof obj.text === 'string') return webviewNovelToResponse(obj)
        if (obj && typeof obj.novel_text === 'string') return obj as unknown as NovelTextResponse
      } catch { /* try next */ }
    }
  }
  return null
}

// ── 图片代理 ──────────────────────────────────────────

export function getProxiedImageUrl(imageUrl: string): string {
  return `${BASE_URL}/image?url=${encodeURIComponent(imageUrl)}`
}

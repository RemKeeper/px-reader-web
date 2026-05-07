/**
 * Pixiv access/refresh token 持久化（localStorage）。
 *
 * 注意：纯前端架构下 refresh_token 存放在 localStorage，理论上可被 XSS 偷取。
 * 这是 SPA 直连 Pixiv API 的固有取舍；如果你的部署面向公开多用户，请改回
 * 后端 HttpOnly Cookie 方案。
 */

const ACCESS_KEY = 'pixiv_access_token'
const REFRESH_KEY = 'pixiv_refresh_token'
const EXPIRES_AT_KEY = 'pixiv_access_expires_at' // 毫秒时间戳

export interface PixivTokens {
  accessToken: string
  refreshToken: string
  /** 绝对过期时间（ms） */
  expiresAt: number
}

export function loadTokens(): PixivTokens | null {
  const access = localStorage.getItem(ACCESS_KEY)
  const refresh = localStorage.getItem(REFRESH_KEY)
  const expiresAt = Number(localStorage.getItem(EXPIRES_AT_KEY) || 0)
  if (!access || !refresh) return null
  return { accessToken: access, refreshToken: refresh, expiresAt }
}

export function saveTokens(t: PixivTokens): void {
  localStorage.setItem(ACCESS_KEY, t.accessToken)
  localStorage.setItem(REFRESH_KEY, t.refreshToken)
  localStorage.setItem(EXPIRES_AT_KEY, String(t.expiresAt))
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(EXPIRES_AT_KEY)
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

/** access_token 是否已过期（提前 60s 视为过期） */
export function isAccessTokenExpired(): boolean {
  const expiresAt = Number(localStorage.getItem(EXPIRES_AT_KEY) || 0)
  if (!expiresAt) return true
  return Date.now() > expiresAt - 60_000
}

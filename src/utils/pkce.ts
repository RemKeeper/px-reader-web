/**
 * Pixiv OAuth2 PKCE 工具（纯前端实现）
 *
 * Pixiv 移动客户端使用的 OAuth 参数（社区已公开多年）：
 *   client_id     = MOBrBDS8blbauoSck0ZfDbtuzpyT
 *   client_secret = lsACyCD94FhDUtGTXi3QzcFE2uU1hqtDaKeqrdwj
 *   redirect_uri  = https://app-api.pixiv.net/web/v1/users/auth/pixiv/callback
 *   login_url     = https://app-api.pixiv.net/web/v1/login
 */
import { sha256 as sha256Fallback } from './sha256-fallback'

/** URL-safe base64（无填充） */
function base64UrlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** 生成 32 字节随机 code_verifier */
export function generateCodeVerifier(): string {
  const arr = new Uint8Array(32)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(arr)
  } else {
    // 极端兼容：理论上现代浏览器都有 crypto.getRandomValues
    console.warn('[pkce] crypto.getRandomValues unavailable, falling back to Math.random')
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256)
  }
  return base64UrlEncode(arr.buffer)
}

/** 由 code_verifier 派生 code_challenge (S256)；优先 WebCrypto，不可用时回退纯 JS */
export async function deriveCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  // 部分 Android WebView（如旧版系统 WebView 、某些 ROM）不实现 crypto.subtle，
  // 或仅在 secure context 下可用。这里头部检查后优先调用，失败时回退。
  const subtle = (typeof crypto !== 'undefined' && (crypto as Crypto & { subtle?: SubtleCrypto }).subtle) || null
  if (subtle && typeof subtle.digest === 'function') {
    try {
      const digest = await subtle.digest('SHA-256', data)
      return base64UrlEncode(digest)
    } catch (e) {
      console.warn('[pkce] crypto.subtle.digest failed, falling back to JS sha256:', e)
    }
  } else {
    console.warn('[pkce] crypto.subtle unavailable (insecure context or WebView), using JS sha256')
  }
  return base64UrlEncode(sha256Fallback(data))
}

export const PIXIV_OAUTH = {
  clientId: 'MOBrBDS8blbauoSck0ZfDbtuzpyT',
  clientSecret: 'lsACyCD94FhDUtGTXi3QzcFE2uU1hqtDaKeqrdwj',
  redirectUri: 'https://app-api.pixiv.net/web/v1/users/auth/pixiv/callback',
  loginUrl: 'https://app-api.pixiv.net/web/v1/login',
} as const

/** 构建 Pixiv 登录 URL（PKCE） */
export function buildLoginUrl(codeChallenge: string): string {
  const p = new URLSearchParams({
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    client: 'pixiv-android',
  })
  return `${PIXIV_OAUTH.loginUrl}?${p.toString()}`
}

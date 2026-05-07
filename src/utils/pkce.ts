/**
 * Pixiv OAuth2 PKCE 工具（纯前端实现）
 *
 * Pixiv 移动客户端使用的 OAuth 参数（社区已公开多年）：
 *   client_id     = MOBrBDS8blbauoSck0ZfDbtuzpyT
 *   client_secret = lsACyCD94FhDUtGTXi3QzcFE2uU1hqtDaKeqrdwj
 *   redirect_uri  = https://app-api.pixiv.net/web/v1/users/auth/pixiv/callback
 *   login_url     = https://app-api.pixiv.net/web/v1/login
 */

/** URL-safe base64（无填充） */
function base64UrlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** 生成 32 字节随机 code_verifier */
export function generateCodeVerifier(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return base64UrlEncode(arr.buffer)
}

/** 由 code_verifier 派生 code_challenge (S256) */
export async function deriveCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(digest)
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

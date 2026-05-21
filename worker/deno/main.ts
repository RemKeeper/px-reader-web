/**
 * Pixiv 极简透明代理 — Deno Deploy 版
 *
 * 与 Cloudflare Workers 版完全等价的逻辑，区别：
 *   - 入口用 Deno.serve 启动
 *   - 移除了 Cloudflare 专属的 fetch options（cf.cacheEverything 等）
 *   - Deno Deploy 出口 IP 走 Google 边缘，目前 Pixiv 未封
 *
 * 路由：
 *   POST  /oauth/auth/token        → https://oauth.secure.pixiv.net/auth/token
 *   *     /app/<path>              → https://app-api.pixiv.net/<path>
 *   GET   /image?url=<encoded>     → 透传 i.pximg.net 图片（注入 Referer）
 *   *     /                        → 健康检查
 *
 * 服务端备用 Token（免登录分享）：
 *   当请求 /app/webview/v2/novel 且不携带 Authorization 时，
 *   Worker 会依次尝试：
 *     1. 环境变量 PIXIV_ACCESS_TOKEN（直接使用）
 *     2. Deno KV 中的缓存 access_token（含过期检查）
 *     3. 环境变量 PIXIV_REFRESH_TOKEN → 刷新并写入 KV
 *   均失败则照常透传（上游会返回 401）。
 *
 * 部署：
 *   1) 安装 deployctl:  deno install -Arf jsr:@deno/deployctl
 *   2) deployctl deploy --project=px-reader-proxy --entrypoint=main.ts
 *   或者推到 GitHub 后在 https://dash.deno.com 一键 link 仓库自动部署。
 */

const PIXIV_UA = 'PixivAndroidApp/5.0.234 (Android 11; Pixel 5)'
const HASH_SECRET = '28c1fdd170a5204386cb1313c7077b34f83e4aaf4aa829ce78c231e05b0bae2c'
const PIXIV_CLIENT_ID = 'MOBrBDS8blbauoSck0ZfDbtuzpyT'
const PIXIV_CLIENT_SECRET = 'lsACyCD94FhDUtGTXi3QzcFE2uU1hqtDaKeqrdwj'

// CORS 白名单：默认反射 Origin。如要锁死域名，把 ALLOWED_ORIGINS 设成具体列表。
const ALLOWED_ORIGINS: Set<string> | null = null
// 例：const ALLOWED_ORIGINS = new Set(['https://reader.rem.asia'])

// Deno KV — 懒加载，首次使用时初始化
// deno-lint-ignore no-explicit-any
let _kv: any | null = null
// deno-lint-ignore no-explicit-any
async function getKv(): Promise<any | null> {
  if (_kv) return _kv
  try {
    // deno-lint-ignore no-explicit-any
    _kv = await (globalThis as any).Deno?.openKv?.()
    return _kv
  } catch {
    return null
  }
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '*'
  const allow = ALLOWED_ORIGINS
    ? (ALLOWED_ORIGINS.has(origin) ? origin : 'null')
    : origin
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

function withCors(req: Request, resp: Response): Response {
  const headers = new Headers(resp.headers)
  for (const [k, v] of Object.entries(corsHeaders(req))) headers.set(k, v)
  return new Response(resp.body, { status: resp.status, headers })
}

/** 用 Web Crypto SubtleCrypto 计算 MD5 是不行的（不在 SHA 系列内），所以自己实现。 */
function md5Hex(input: string): string {
  function toBytes(s: string): number[] {
    const out: number[] = []
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i)
      if (c < 0x80) out.push(c)
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f))
      else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f))
    }
    return out
  }
  const bytes = toBytes(input)
  const len = bytes.length
  const nBlocks = ((len + 8) >> 6) + 1
  const total = nBlocks * 16
  const x: number[] = new Array(total).fill(0)
  for (let i = 0; i < len; i++) x[i >> 2] |= bytes[i] << ((i % 4) * 8)
  x[len >> 2] |= 0x80 << ((len % 4) * 8)
  x[total - 2] = len * 8

  const add = (a: number, b: number) => (a + b) | 0
  const rol = (n: number, c: number) => (n << c) | (n >>> (32 - c))
  const cmn = (q: number, a: number, b: number, x: number, s: number, t: number) =>
    add(rol(add(add(a, q), add(x, t)), s), b)
  const ff = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) =>
    cmn((b & c) | (~b & d), a, b, x, s, t)
  const gg = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) =>
    cmn((b & d) | (c & ~d), a, b, x, s, t)
  const hh = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) =>
    cmn(b ^ c ^ d, a, b, x, s, t)
  const ii = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) =>
    cmn(c ^ (b | ~d), a, b, x, s, t)

  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878
  for (let i = 0; i < total; i += 16) {
    const oa = a, ob = b, oc = c, od = d
    a = ff(a, b, c, d, x[i + 0], 7, -680876936)
    d = ff(d, a, b, c, x[i + 1], 12, -389564586)
    c = ff(c, d, a, b, x[i + 2], 17, 606105819)
    b = ff(b, c, d, a, x[i + 3], 22, -1044525330)
    a = ff(a, b, c, d, x[i + 4], 7, -176418897)
    d = ff(d, a, b, c, x[i + 5], 12, 1200080426)
    c = ff(c, d, a, b, x[i + 6], 17, -1473231341)
    b = ff(b, c, d, a, x[i + 7], 22, -45705983)
    a = ff(a, b, c, d, x[i + 8], 7, 1770035416)
    d = ff(d, a, b, c, x[i + 9], 12, -1958414417)
    c = ff(c, d, a, b, x[i + 10], 17, -42063)
    b = ff(b, c, d, a, x[i + 11], 22, -1990404162)
    a = ff(a, b, c, d, x[i + 12], 7, 1804603682)
    d = ff(d, a, b, c, x[i + 13], 12, -40341101)
    c = ff(c, d, a, b, x[i + 14], 17, -1502002290)
    b = ff(b, c, d, a, x[i + 15], 22, 1236535329)

    a = gg(a, b, c, d, x[i + 1], 5, -165796510)
    d = gg(d, a, b, c, x[i + 6], 9, -1069501632)
    c = gg(c, d, a, b, x[i + 11], 14, 643717713)
    b = gg(b, c, d, a, x[i + 0], 20, -373897302)
    a = gg(a, b, c, d, x[i + 5], 5, -701558691)
    d = gg(d, a, b, c, x[i + 10], 9, 38016083)
    c = gg(c, d, a, b, x[i + 15], 14, -660478335)
    b = gg(b, c, d, a, x[i + 4], 20, -405537848)
    a = gg(a, b, c, d, x[i + 9], 5, 568446438)
    d = gg(d, a, b, c, x[i + 14], 9, -1019803690)
    c = gg(c, d, a, b, x[i + 3], 14, -187363961)
    b = gg(b, c, d, a, x[i + 8], 20, 1163531501)
    a = gg(a, b, c, d, x[i + 13], 5, -1444681467)
    d = gg(d, a, b, c, x[i + 2], 9, -51403784)
    c = gg(c, d, a, b, x[i + 7], 14, 1735328473)
    b = gg(b, c, d, a, x[i + 12], 20, -1926607734)

    a = hh(a, b, c, d, x[i + 5], 4, -378558)
    d = hh(d, a, b, c, x[i + 8], 11, -2022574463)
    c = hh(c, d, a, b, x[i + 11], 16, 1839030562)
    b = hh(b, c, d, a, x[i + 14], 23, -35309556)
    a = hh(a, b, c, d, x[i + 1], 4, -1530992060)
    d = hh(d, a, b, c, x[i + 4], 11, 1272893353)
    c = hh(c, d, a, b, x[i + 7], 16, -155497632)
    b = hh(b, c, d, a, x[i + 10], 23, -1094730640)
    a = hh(a, b, c, d, x[i + 13], 4, 681279174)
    d = hh(d, a, b, c, x[i + 0], 11, -358537222)
    c = hh(c, d, a, b, x[i + 3], 16, -722521979)
    b = hh(b, c, d, a, x[i + 6], 23, 76029189)
    a = hh(a, b, c, d, x[i + 9], 4, -640364487)
    d = hh(d, a, b, c, x[i + 12], 11, -421815835)
    c = hh(c, d, a, b, x[i + 15], 16, 530742520)
    b = hh(b, c, d, a, x[i + 2], 23, -995338651)

    a = ii(a, b, c, d, x[i + 0], 6, -198630844)
    d = ii(d, a, b, c, x[i + 7], 10, 1126891415)
    c = ii(c, d, a, b, x[i + 14], 15, -1416354905)
    b = ii(b, c, d, a, x[i + 5], 21, -57434055)
    a = ii(a, b, c, d, x[i + 12], 6, 1700485571)
    d = ii(d, a, b, c, x[i + 3], 10, -1894986606)
    c = ii(c, d, a, b, x[i + 10], 15, -1051523)
    b = ii(b, c, d, a, x[i + 1], 21, -2054922799)
    a = ii(a, b, c, d, x[i + 8], 6, 1873313359)
    d = ii(d, a, b, c, x[i + 15], 10, -30611744)
    c = ii(c, d, a, b, x[i + 6], 15, -1560198380)
    b = ii(b, c, d, a, x[i + 13], 21, 1309151649)
    a = ii(a, b, c, d, x[i + 4], 6, -145523070)
    d = ii(d, a, b, c, x[i + 11], 10, -1120210379)
    c = ii(c, d, a, b, x[i + 2], 15, 718787259)
    b = ii(b, c, d, a, x[i + 9], 21, -343485551)

    a = add(a, oa); b = add(b, ob); c = add(c, oc); d = add(d, od)
  }
  const toHex = (n: number) => {
    let s = ''
    for (let j = 0; j < 4; j++) {
      const byte = (n >>> (j * 8)) & 0xff
      s += byte.toString(16).padStart(2, '0')
    }
    return s
  }
  return toHex(a) + toHex(b) + toHex(c) + toHex(d)
}

function pixivClientTime(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate())
    + 'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds())
    + '+00:00'
}

function pixivHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const t = pixivClientTime()
  const h = md5Hex(t + HASH_SECRET)
  return {
    'User-Agent': PIXIV_UA,
    'Accept-Language': 'en-US',
    'App-OS': 'android',
    'App-OS-Version': '11',
    'App-Version': '5.0.234',
    'X-Client-Time': t,
    'X-Client-Hash': h,
    ...extra,
  }
}

// ── 服务端备用 Token ──────────────────────────────────────
// 用于免登录访问 /app/webview/v2/novel（分享链接）。
// 优先级：env PIXIV_ACCESS_TOKEN > KV 缓存 > 用 PIXIV_REFRESH_TOKEN 刷新

interface CachedToken {
  token: string
  expiresAt: number
}

/**
 * 获取服务端备用 access_token。
 * 返回 null 表示未配置 / 刷新失败，此时请求将无 Authorization 头。
 */
async function getServerAccessToken(): Promise<string | null> {
  // deno-lint-ignore no-explicit-any
  const denoEnv = (globalThis as any).Deno?.env

  // 1. 环境变量直接配置了 access_token（最高优先级，但有效期约 1h）
  const envToken: string | undefined = denoEnv?.get('PIXIV_ACCESS_TOKEN')
  if (envToken) return envToken

  // 2. Deno KV 中的缓存
  const kv = await getKv()
  if (kv) {
    const entry = await kv.get(['pixiv', 'access_token'])
    const cached = entry?.value as CachedToken | undefined
    // 保留 60s 余量防止临界过期
    if (cached && cached.expiresAt > Date.now() + 60_000) {
      return cached.token
    }
  }

  // 3. 用 refresh_token 刷新
  const refreshTokenValue: string | undefined = denoEnv?.get('PIXIV_REFRESH_TOKEN')
  if (!refreshTokenValue) return null

  try {
    const form = new URLSearchParams({
      client_id: PIXIV_CLIENT_ID,
      client_secret: PIXIV_CLIENT_SECRET,
      grant_type: 'refresh_token',
      include_policy: 'true',
      refresh_token: refreshTokenValue,
    })
    const resp = await fetch('https://oauth.secure.pixiv.net/auth/token', {
      method: 'POST',
      headers: pixivHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
      body: form.toString(),
    })
    if (!resp.ok) return null
    const data = await resp.json() as { access_token?: string; expires_in?: number }
    if (!data.access_token) return null

    // 写入 KV（带 TTL）
    const expiresIn = (data.expires_in || 3600)
    const expiresAt = Date.now() + expiresIn * 1000
    if (kv) {
      await kv.set(
        ['pixiv', 'access_token'],
        { token: data.access_token, expiresAt } satisfies CachedToken,
        { expireIn: expiresIn * 1000 },
      )
    }
    return data.access_token
  } catch {
    return null
  }
}

// ── 路由 ─────────────────────────────────────────────

async function handleOAuthToken(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })
  const body = await req.text()
  const upstream = await fetch('https://oauth.secure.pixiv.net/auth/token', {
    method: 'POST',
    headers: pixivHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
    body,
  })
  const respHeaders = new Headers()
  respHeaders.set('Content-Type', upstream.headers.get('Content-Type') || 'application/json')
  return new Response(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: respHeaders,
  })
}

async function handleAppApi(req: Request, url: URL, fallbackToken?: string | null): Promise<Response> {
  const target = 'https://app-api.pixiv.net' + url.pathname.replace(/^\/app/, '') + url.search
  const headers = pixivHeaders()
  const auth = req.headers.get('Authorization') || (fallbackToken ? `Bearer ${fallbackToken}` : null)
  if (auth) headers['Authorization'] = auth
  const ct = req.headers.get('Content-Type')
  if (ct) headers['Content-Type'] = ct

  const init: RequestInit = { method: req.method, headers }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer()
  }

  const upstream = await fetch(target, init)
  const respHeaders = new Headers()
  // 只透传必要响应头，避免 hop-by-hop 头污染
  // 注意：Deno fetch 已自动解压 body，故必须丢弃 Content-Encoding，否则浏览器会二次解压。
  const passthrough = ['Content-Type', 'Cache-Control', 'ETag']
  for (const k of passthrough) {
    const v = upstream.headers.get(k)
    if (v) respHeaders.set(k, v)
  }
  return new Response(upstream.body, { status: upstream.status, headers: respHeaders })
}

async function handleImage(url: URL): Promise<Response> {
  const imageUrl = url.searchParams.get('url')
  if (!imageUrl) return new Response('missing url', { status: 400 })
  let parsed: URL
  try { parsed = new URL(imageUrl) } catch { return new Response('invalid url', { status: 400 }) }
  if (!/(?:^|\.)pximg\.net$/i.test(parsed.hostname)) {
    return new Response('not a pixiv image', { status: 400 })
  }
  const upstream = await fetch(imageUrl, {
    headers: {
      'User-Agent': PIXIV_UA,
      'Referer': 'https://www.pixiv.net/',
    },
  })
  const respHeaders = new Headers()
  const ct = upstream.headers.get('Content-Type')
  if (ct) respHeaders.set('Content-Type', ct)
  // Deno Deploy 边缘自带缓存层，会读取 Cache-Control
  respHeaders.set('Cache-Control', 'public, max-age=86400')
  return new Response(upstream.body, { status: upstream.status, headers: respHeaders })
}

async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }
  const url = new URL(req.url)

  try {
    let resp: Response
    if (url.pathname === '/oauth/auth/token') {
      resp = await handleOAuthToken(req)
    } else if (url.pathname.startsWith('/app/')) {
      // 免登录分享：/app/webview/v2/novel 无 Authorization 时注入服务端备用 token
      if (url.pathname === '/app/webview/v2/novel' && !req.headers.get('Authorization')) {
        const serverToken = await getServerAccessToken()
        resp = await handleAppApi(req, url, serverToken)
      } else {
        resp = await handleAppApi(req, url)
      }
    } else if (url.pathname === '/image') {
      resp = await handleImage(url)
    } else if (url.pathname === '/' || url.pathname === '') {
      resp = new Response('px-reader proxy ok (deno)', { status: 200 })
    } else {
      resp = new Response('not found', { status: 404 })
    }
    return withCors(req, resp)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return withCors(req, new Response('proxy error: ' + msg, { status: 502 }))
  }
}

// Deno Deploy / 本地运行入口
// deno-lint-ignore no-explicit-any
;(globalThis as any).Deno?.serve?.(handle)

// 同时导出 default，兼容 deployctl 的 entrypoint 自动检测
export default { fetch: handle }

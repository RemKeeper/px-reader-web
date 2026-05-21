/**
 * Pixiv 极简透明代理 Worker（Cloudflare Workers）
 *
 * 目的：
 *   浏览器无法直连 pixiv（CORS + 无法设置 User-Agent），所以保留一个
 *   "只做请求改写"的 Worker，业务逻辑全部在前端。
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
 *     2. PIXIV_KV 中的缓存 access_token（含过期检查）
 *     3. 环境变量 PIXIV_REFRESH_TOKEN → 刷新并写入 KV
 *   均失败则照常透传（上游会返回 401）。
 *
 * 部署（需在 wrangler.toml 中配置绑定）：
 *   [vars]
 *   PIXIV_REFRESH_TOKEN = "your_refresh_token"
 *
 *   [[kv_namespaces]]
 *   binding = "PIXIV_KV"
 *   id = "your_kv_namespace_id"
 *
 *   1) npm i -g wrangler
 *   2) wrangler deploy worker.js --name px-reader-proxy
 *   或者在 dashboard 直接粘贴此文件到 Workers 编辑器。
 */

const PIXIV_UA = 'PixivAndroidApp/5.0.234 (Android 11; Pixel 5)'
const HASH_SECRET = '28c1fdd170a5204386cb1313c7077b34f83e4aaf4aa829ce78c231e05b0bae2c'
const PIXIV_CLIENT_ID = 'MOBrBDS8blbauoSck0ZfDbtuzpyT'
const PIXIV_CLIENT_SECRET = 'lsACyCD94FhDUtGTXi3QzcFE2uU1hqtDaKeqrdwj'

// CORS 白名单：默认反射 Origin。如要锁死域名，把 ALLOWED_ORIGINS 设成具体列表。
const ALLOWED_ORIGINS = null // 例：new Set(['https://reader.rem.asia'])

function corsHeaders(req) {
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

function withCors(req, resp) {
  const headers = new Headers(resp.headers)
  for (const [k, v] of Object.entries(corsHeaders(req))) headers.set(k, v)
  return new Response(resp.body, { status: resp.status, headers })
}

async function md5Hex(input) {
  // Workers 不内置 MD5，自己实现一个轻量版（仅供 X-Client-Hash 使用）。
  // 来源：常见公共域 MD5 实现移植版本，兼容 ASCII。
  function toBytes(s) {
    const out = []
    for (let i = 0; i < s.length; i++) {
      let c = s.charCodeAt(i)
      if (c < 0x80) out.push(c)
      else if (c < 0x800) {
        out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f))
      } else {
        out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f))
      }
    }
    return out
  }
  const bytes = toBytes(input)
  const len = bytes.length
  const nBlocks = ((len + 8) >> 6) + 1
  const total = nBlocks * 16
  const x = new Array(total).fill(0)
  for (let i = 0; i < len; i++) x[i >> 2] |= bytes[i] << ((i % 4) * 8)
  x[len >> 2] |= 0x80 << ((len % 4) * 8)
  x[total - 2] = len * 8

  function add(a, b) { return (a + b) | 0 }
  function rol(n, c) { return (n << c) | (n >>> (32 - c)) }
  function cmn(q, a, b, x, s, t) { return add(rol(add(add(a, q), add(x, t)), s), b) }
  function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t) }
  function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t) }
  function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t) }
  function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t) }

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
  function toHex(n) {
    let s = ''
    for (let j = 0; j < 4; j++) {
      const byte = (n >>> (j * 8)) & 0xff
      s += byte.toString(16).padStart(2, '0')
    }
    return s
  }
  return toHex(a) + toHex(b) + toHex(c) + toHex(d)
}

function pixivClientTime() {
  // 形如 2024-01-01T12:34:56+00:00
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate())
    + 'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds())
    + '+00:00'
}

async function pixivHeaders(extra = {}) {
  const t = pixivClientTime()
  const h = await md5Hex(t + HASH_SECRET)
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
// 需要在 wrangler.toml 中绑定：
//   [vars]  PIXIV_REFRESH_TOKEN = "..."
//   [[kv_namespaces]]  binding = "PIXIV_KV"  id = "..."

/**
 * 获取服务端备用 access_token（CF Workers 版）。
 * @param {object} env - Workers env bindings
 */
async function getServerAccessToken(env) {
  if (!env) return null

  // 1. 环境变量直接配置了 access_token
  if (env.PIXIV_ACCESS_TOKEN) return env.PIXIV_ACCESS_TOKEN

  // 2. KV 中的缓存
  const kv = env.PIXIV_KV
  if (kv) {
    const cached = await kv.get('pixiv_access_token', 'json')
    if (cached && cached.expiresAt > Date.now() + 60_000) {
      return cached.token
    }
  }

  // 3. 用 refresh_token 刷新
  if (!env.PIXIV_REFRESH_TOKEN) return null

  try {
    const form = new URLSearchParams({
      client_id: PIXIV_CLIENT_ID,
      client_secret: PIXIV_CLIENT_SECRET,
      grant_type: 'refresh_token',
      include_policy: 'true',
      refresh_token: env.PIXIV_REFRESH_TOKEN,
    })
    const resp = await fetch('https://oauth.secure.pixiv.net/auth/token', {
      method: 'POST',
      headers: await pixivHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
      body: form.toString(),
    })
    if (!resp.ok) return null
    const data = await resp.json()
    if (!data.access_token) return null

    // 写入 KV（带 TTL）
    const expiresIn = data.expires_in || 3600
    const expiresAt = Date.now() + expiresIn * 1000
    if (kv) {
      await kv.put(
        'pixiv_access_token',
        JSON.stringify({ token: data.access_token, expiresAt }),
        { expirationTtl: expiresIn },
      )
    }
    return data.access_token
  } catch {
    return null
  }
}

// ── 路由 ─────────────────────────────────────────────

async function handleOAuthToken(req) {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })
  const body = await req.text()
  const upstream = await fetch('https://oauth.secure.pixiv.net/auth/token', {
    method: 'POST',
    headers: await pixivHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    }),
    body,
  })
  const respHeaders = new Headers()
  respHeaders.set('Content-Type', upstream.headers.get('Content-Type') || 'application/json')
  return new Response(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: respHeaders,
  })
}

async function handleAppApi(req, url, fallbackToken) {
  const target = 'https://app-api.pixiv.net' + url.pathname.replace(/^\/app/, '') + url.search
  const headers = await pixivHeaders()
  const auth = req.headers.get('Authorization') || (fallbackToken ? `Bearer ${fallbackToken}` : null)
  if (auth) headers['Authorization'] = auth
  const ct = req.headers.get('Content-Type')
  if (ct) headers['Content-Type'] = ct

  const init = {
    method: req.method,
    headers,
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer()
  }

  const upstream = await fetch(target, init)
  const respHeaders = new Headers()
  // 只透传必要响应头，避免 hop-by-hop 头污染
  const passthrough = ['Content-Type', 'Content-Encoding', 'Cache-Control', 'ETag']
  for (const k of passthrough) {
    const v = upstream.headers.get(k)
    if (v) respHeaders.set(k, v)
  }
  return new Response(upstream.body, { status: upstream.status, headers: respHeaders })
}

async function handleImage(url) {
  const imageUrl = url.searchParams.get('url')
  if (!imageUrl) return new Response('missing url', { status: 400 })
  let parsed
  try { parsed = new URL(imageUrl) } catch { return new Response('invalid url', { status: 400 }) }
  if (!/(?:^|\.)pximg\.net$/i.test(parsed.hostname)) {
    return new Response('not a pixiv image', { status: 400 })
  }
  const upstream = await fetch(imageUrl, {
    headers: {
      'User-Agent': PIXIV_UA,
      'Referer': 'https://www.pixiv.net/',
    },
    cf: { cacheEverything: true, cacheTtl: 86400 },
  })
  const respHeaders = new Headers()
  const ct = upstream.headers.get('Content-Type')
  if (ct) respHeaders.set('Content-Type', ct)
  respHeaders.set('Cache-Control', 'public, max-age=86400')
  return new Response(upstream.body, { status: upstream.status, headers: respHeaders })
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(req) })
    }
    const url = new URL(req.url)

    try {
      let resp
      if (url.pathname === '/oauth/auth/token') {
        resp = await handleOAuthToken(req)
      } else if (url.pathname.startsWith('/app/')) {
        // 免登录分享：/app/webview/v2/novel 无 Authorization 时注入服务端备用 token
        if (url.pathname === '/app/webview/v2/novel' && !req.headers.get('Authorization')) {
          const serverToken = await getServerAccessToken(env)
          resp = await handleAppApi(req, url, serverToken)
        } else {
          resp = await handleAppApi(req, url)
        }
      } else if (url.pathname === '/image') {
        resp = await handleImage(url)
      } else if (url.pathname === '/' || url.pathname === '') {
        resp = new Response('px-reader proxy ok', { status: 200 })
      } else {
        resp = new Response('not found', { status: 404 })
      }
      return withCors(req, resp)
    } catch (e) {
      return withCors(req, new Response('proxy error: ' + (e && e.message || e), { status: 502 }))
    }
  },
}

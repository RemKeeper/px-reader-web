# PX-Reader API

> **架构变更（v2）**：项目已改造为"纯前端 + 极简代理"架构。
>
> - Pixiv OAuth (PKCE) / token 刷新 / 业务接口调用 / HTML 解析 → **全部在浏览器中完成**
> - Cloudflare Worker 仅作为透明代理，注入 `User-Agent` / `X-Client-Hash` / 图片 `Referer`，并提供 CORS
> - access/refresh token 存储在前端 `localStorage`（不再使用 HttpOnly Cookie）

## 代理路由（worker/worker.js）

Base URL：部署后的 Worker 域名（如 `https://px-reader-proxy.xxx.workers.dev`）

| 方法 | 路径 | 上游 |
|---|---|---|
| POST | `/oauth/auth/token` | `https://oauth.secure.pixiv.net/auth/token` |
| ANY | `/app/<path>` | `https://app-api.pixiv.net/<path>`（`Authorization: Bearer ...` 由前端透传） |
| GET | `/image?url=<encoded>` | `*.pximg.net` 图片（强制 Referer） |
| GET | `/` | 健康检查 |

代理无状态：不读 cookie、不存任何用户数据，所有上游请求都按调用时的 Bearer token / form 内容透传。

## 前端使用

### 登录

```ts
import { getLoginUrl, handleCallback } from '@/api'

// 1) 生成 code_verifier + Pixiv 登录 URL
const { login_url, code_verifier } = await getLoginUrl()
localStorage.setItem('pixiv_cv', code_verifier)
location.href = login_url

// 2) 回调页（/callback?code=xxx）
const cv = localStorage.getItem('pixiv_cv')!
await handleCallback(code, cv)   // 内部 POST /oauth/auth/token，并把 token 存进 localStorage
localStorage.removeItem('pixiv_cv')
```

### 业务调用

```ts
import { getRecommendedNovels, getNovelText } from '@/api'

const list = await getRecommendedNovels({ include_ranking_novels: 'true' })
const novel = await getNovelText(123456)
```

`apiRequest` 自动：

1. access_token 过期前 60s 主动刷新
2. 收到 401 自动 refresh 重试一次，仍失败则清空本地 token 抛 401
3. 自动注入 `Authorization: Bearer <access_token>`

### 图片

```ts
import { getProxiedImageUrl } from '@/api'
<img :src="getProxiedImageUrl(novel.image_urls.medium)" />
```

## Pixiv 上游接口

本项目用到的：

- `GET /v1/novel/recommended?filter=for_ios&include_ranking_novels=true&offset=`
- `GET /v1/novel/follow?restrict=public&offset=`
- `GET /v1/user/novels?user_id=&offset=`
- `GET /v1/novel/text?novel_id=`（首选）
- `GET /webview/v2/novel?id=...`（HTML 兜底，正文在内联 JSON）

返回结构与前端 `src/types/api.ts` 中的 TS 接口对齐。

## 错误处理

任何前端 API 函数失败都抛出 `ApiError(message, status)`：

```ts
import { ApiError } from '@/types'
try { await getRecommendedNovels() }
catch (e) {
  if (e instanceof ApiError && e.status === 401) { /* 重新登录 */ }
}
```

## 安全提示

- `refresh_token` 存在 `localStorage`，会被 XSS 拿到。请确保不引入第三方 inline script。
- Pixiv 的 `client_id` / `client_secret` / `X-Client-Hash` salt 均为公开常量，不属于机密。
- 强烈建议把 `worker.js` 里的 `ALLOWED_ORIGINS` 锁死到你自己的域名。

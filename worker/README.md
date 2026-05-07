# Pixiv 极简代理 Worker

这个 Worker 是 px-reader-web 改造为"纯前端"架构后保留的最小后端。它只做三件事：

1. 转发 OAuth token 请求（`POST /oauth/auth/token`）—— 注入 `User-Agent` / `X-Client-Time` / `X-Client-Hash` 通过 Pixiv WAF。
2. 转发 App API（`/app/*` → `app-api.pixiv.net/*`）—— 注入同样的客户端伪装头，Bearer token 由前端透传。
3. 图片代理（`/image?url=...`）—— 给 `i.pximg.net` 的图片加上 `Referer` 绕过盗链保护。

所有业务逻辑（PKCE、token 持久化、刷新、401 重试、HTML 抽取）都在前端完成。

## 部署

```bash
npm i -g wrangler
wrangler login
cd worker
wrangler deploy
```

部署成功后会得到形如 `https://px-reader-proxy.<你的子域>.workers.dev` 的地址。

把这个地址填回前端：

```env
# .env.production
VITE_API_BASE_URL=https://px-reader-proxy.<你的子域>.workers.dev
```

然后在前端项目根目录重新构建即可：

```bash
npm run build
```

## 锁定 CORS 来源（推荐）

默认 Worker 反射任意 `Origin`，方便本地调试。生产环境建议锁死：

打开 `worker.js`，把：

```js
const ALLOWED_ORIGINS = null
```

改成：

```js
const ALLOWED_ORIGINS = new Set([
  'https://reader.rem.asia',
  'http://localhost:5173',
])
```

## 路由表

| 方法 | 路径 | 上游 |
|---|---|---|
| POST | `/oauth/auth/token` | `https://oauth.secure.pixiv.net/auth/token` |
| ANY | `/app/<path>` | `https://app-api.pixiv.net/<path>` |
| GET | `/image?url=<encoded>` | 任意 `*.pximg.net` 图片（强制 Referer） |
| GET | `/` | 健康检查 |

## 安全说明

- `client_id`、`client_secret`、`X-Client-Hash` 的 salt 都是社区已公开的 Pixiv 安卓客户端常量，不是机密。
- `refresh_token` 在前端架构下保存在 `localStorage`，存在被 XSS 偷取风险。如果是公开多用户场景，请回滚到 HttpOnly Cookie 方案。
- Worker 不持久化任何用户数据，无状态。

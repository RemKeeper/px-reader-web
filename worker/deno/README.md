# Pixiv 极简代理 — Deno Deploy 版

由于 Cloudflare Workers 的出口 IP 段已被 Pixiv 封禁，本目录提供了一份
**Deno Deploy** 版的等价代理实现。Deno Deploy 出口 IP 走 Google 边缘，
目前 Pixiv 未封。

## 路由

与 CF 版完全一致：

| 方法 | 路径 | 上游 |
|---|---|---|
| POST | `/oauth/auth/token` | `https://oauth.secure.pixiv.net/auth/token` |
| ANY | `/app/<path>` | `https://app-api.pixiv.net/<path>` |
| GET | `/image?url=<encoded>` | `*.pximg.net` |
| GET | `/` | 健康检查（返回 `px-reader proxy ok (deno)`） |

## 本地调试

```bash
# 安装 Deno（Windows PowerShell）
irm https://deno.land/install.ps1 | iex

cd worker/deno
deno task dev
# 默认监听 http://127.0.0.1:8000
```

可以直接用浏览器或 curl 测试：

```bash
curl http://127.0.0.1:8000/
```

把前端 `.env.development` 里的 `VITE_API_BASE_URL` 指向 `http://127.0.0.1:8000`
即可本地联调。

## 部署到 Deno Deploy（推荐：GitHub 自动部署）

1. 把本仓库推到 GitHub
2. 打开 https://dash.deno.com → New Project
3. 选择本仓库，**Entrypoint** 设为 `worker/deno/main.ts`
4. 不需要任何环境变量，点 Deploy
5. 拿到 `https://px-reader-proxy.deno.dev` 之类的地址

之后每次 `git push` 会自动重新部署。

## 部署到 Deno Deploy（CLI 方式）

```bash
deno install -gArf jsr:@deno/deployctl

cd worker/deno
deployctl deploy --project=px-reader-proxy --entrypoint=main.ts --prod
```

首次会在浏览器弹窗让你授权 Deno Deploy 账号。

## 把代理 URL 写回前端

```env
# .env.production
VITE_API_BASE_URL=https://px-reader-proxy.deno.dev
```

然后正常 `npm run build` 部署 `dist/` 即可。

## 锁定 CORS 来源（推荐）

打开 `main.ts`，把：

```ts
const ALLOWED_ORIGINS: Set<string> | null = null
```

改成：

```ts
const ALLOWED_ORIGINS: Set<string> | null = new Set([
  'https://reader.rem.asia',
  'http://localhost:5173',
])
```

## 与 Cloudflare 版的差异

| 项目 | Cloudflare Workers | Deno Deploy |
|---|---|---|
| 出口 IP | CF 自有段（**已被 Pixiv 封**） | Google 边缘段（OK） |
| 入口 | `export default { fetch }` | `Deno.serve(handler)` |
| 图片 CDN 缓存 | `cf: { cacheEverything, cacheTtl }` | 边缘自动按 `Cache-Control` 缓存 |
| 免费额度 | 10 万请求/天 | 100 万请求/天，10 万 KB-小时 |
| 响应大小限制 | 100 MB | 无明显上限（流式 OK） |
| 单次执行上限 | 10ms CPU + 30s wall | 1s CPU + 60s wall |

## 免费额度

Deno Deploy 免费层（截至 2025）：

- 100 万次请求 / 月
- 10 万 KB-小时
- 100 GB 出站流量 / 月

个人使用绰绰有余。

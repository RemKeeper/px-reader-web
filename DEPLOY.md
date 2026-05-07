# 部署指南

本项目分两部分部署：

1. **前端 SPA**（Cloudflare Pages 或任意静态托管）
2. **极简代理 Worker**（Cloudflare Workers，源码在 `worker/`）

## 一、部署代理

代理是浏览器访问 Pixiv 的必需中转（处理 CORS + 注入 `User-Agent`/`X-Client-Hash` + 图片 `Referer`）。

> ⚠️ **Cloudflare Workers 的出口 IP 段已被 Pixiv 封禁**，请优先使用 **Deno Deploy 版**（`worker/deno/`）。
> Cloudflare 版（`worker/worker.js`）保留作为参考，未来 IP 段解封时可切回。

### 推荐：Deno Deploy

```bash
deno install -gArf jsr:@deno/deployctl   # 仅首次
cd worker/deno
deployctl deploy --project=px-reader-proxy --entrypoint=main.ts --prod
```

或者把仓库推到 GitHub，在 https://dash.deno.com 一键 link，
**Entrypoint** 填 `worker/deno/main.ts` 即可，之后每次 push 自动部署。

部署后会得到例如 `https://px-reader-proxy.deno.dev` 的 URL。

健康检查：

```bash
curl https://px-reader-proxy.deno.dev/
# px-reader proxy ok (deno)
```

详见 `worker/deno/README.md`，包括如何锁定 CORS 白名单。

### 备用：Cloudflare Workers（当前不可用）

```bash
cd worker
npm i -g wrangler
wrangler login
wrangler deploy
```

详见 `worker/README.md`。

## 二、配置前端环境变量

编辑根目录 `.env.production`：

```env
VITE_API_BASE_URL=https://px-reader-proxy.<your-subdomain>.workers.dev
```

## 三、部署前端

### 方式 A：Cloudflare Pages（Git 集成，推荐）

1. 推送代码到 GitHub
2. Cloudflare Dashboard → Pages → Create a project → Connect to Git
3. 构建配置：
   - **Framework preset**: `Vue`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Environment variables**:
     - `NODE_VERSION=20`
     - `VITE_API_BASE_URL=https://px-reader-proxy.<your-subdomain>.workers.dev`

### 方式 B：Wrangler 静态资产

```bash
npm run build
npx wrangler deploy   # 使用根目录 wrangler.toml 推 dist/
```

## 四、部署后检查清单

- [ ] 访问首页 → 点击"登录 Pixiv"能跳到 Pixiv 登录页
- [ ] 登录后回到 `/callback?code=...` 不报错，落到首页且推荐列表加载成功
- [ ] DevTools → Application → Local Storage 中存在 `pixiv_access_token` / `pixiv_refresh_token`
- [ ] 关闭浏览器再打开，仍处于登录态（refresh token 自动续期）
- [ ] 直接访问 `/novel/123` 不会 404（SPA 回退生效）
- [ ] 关闭 Cloudflare **Rocket Loader**（会破坏 Vue 运行时）
- [ ] 开启 **Brotli**、**HTTP/3**、**Early Hints**

## 注意事项

- **CORS**：默认 Worker 反射任意 Origin，方便调试。生产请在 `worker/worker.js` 顶部把 `ALLOWED_ORIGINS` 改成你的前端域名集合。
- **Refresh token 安全**：纯前端架构下 token 存于 `localStorage`，存在 XSS 风险。请确保不引入未审计的第三方脚本。如需多用户公开服务，建议回滚到 HttpOnly Cookie 后端方案。
- **PWA**：`vite-plugin-pwa` 已配置 `pximg.net` 缓存策略。Service Worker 要求 HTTPS（Pages 默认满足）。
- **IndexedDB**：iOS Safari 约 1GB 配额，应用已自动请求持久化存储。

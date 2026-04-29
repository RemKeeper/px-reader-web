# Cloudflare Pages 部署指南

## 快速部署

### 方式 A: Git 集成 (推荐)

1. 推送代码到 GitHub
2. Cloudflare Dashboard → Pages → Create a project → Connect to Git
3. 构建配置:
   - **Framework preset**: `Vue`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Environment variables**: 添加 `NODE_VERSION=20`

### 方式 B: Wrangler CLI

```bash
npm i -D wrangler
npm run build
npx wrangler pages deploy dist --project-name=px-reader
```

## 环境变量

在 Cloudflare Dashboard → Pages → Settings → Environment variables 中设置:

| 变量名 | 说明 | 示例值 |
|---|---|---|
| `NODE_VERSION` | Node.js 版本 | `20` |
| `VITE_API_BASE_URL` | Workers 后端地址 | `https://px-reader-api.workers.dev` |

## 部署后检查清单

- [ ] 直接访问 `/novel/123` 不会 404 (SPA 回退生效)
- [ ] Service Worker 正常注册 (DevTools → Application → Service Workers)
- [ ] 断网后 PWA 仍可打开已缓存的页面
- [ ] Cloudflare Dashboard 关闭 **Rocket Loader** (会破坏 Vue 应用)
- [ ] 开启 **Brotli 压缩**、**HTTP/3**、**Early Hints**

## 注意事项

- **Rocket Loader**: 必须关闭，否则会破坏 Vue 的运行时
- **IndexedDB**: iOS Safari 约 1GB 配额，应用已自动请求持久化存储
- **Web Worker**: 已使用 `new URL(..., import.meta.url)` 语法，Vite 构建后自动处理
- **PWA**: Pages 默认 HTTPS，满足 Service Worker 要求

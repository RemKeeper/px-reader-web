# px-reader-web

> 一个简洁高效的 Pixiv 小说在线阅读器

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vue 3](https://img.shields.io/badge/Vue-3.5-green.svg)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.1-blueviolet.svg)](https://vitejs.dev/)

## 📖 项目介绍

**px-reader-web** 是一个基于 Vue 3 + Vite 的纯前端 Pixiv 小说阅读器，为用户提供优雅的阅读体验。项目采用现代化的前后端分离架构，通过 Deno Deploy 代理解决跨域和 WAF 绕过问题，所有业务逻辑都在浏览器端完成。

### ✨ 核心特性

- 📱 **响应式设计** - 完美适配桌面、平板和手机屏幕
- 🎨 **优雅 UI** - 基于 Vant 组件库的精美界面
- 💾 **离线缓存** - 使用 Dexie 实现本地数据库缓存，支持离线阅读
- ⚡ **PWA 应用** - 支持安装为桌面应用，提升用户体验
- 🔄 **自动同步** - Pinia + localStorage 状态持久化
- 🎯 **虚拟滚动** - 采用 TanStack Vue Virtual 优化大列表性能
- 🔤 **字符集自动检测** - 使用 jschardet + iconv-lite 自动处理文本编码
- 🛡️ **CORS 透明代理** - 通过 Deno Deploy 绕过 Pixiv WAF

## 🚀 快速开始

### 前置条件

- Node.js 16+
- npm 或 pnpm

### 本地开发

```bash
# 克隆项目
git clone https://github.com/RemKeeper/px-reader-web.git
cd px-reader-web

# 安装依赖
npm install

# 启动开发服务器
npm run dev
# 访问 http://localhost:5173

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 🏗️ 项目架构

### 前端（px-reader-web）

```
┌─────────────────────────────────────┐
│    Pixiv 小说阅读器（前端）         │
│  Vue 3 + TypeScript + Vite PWA      │
└────────────────┬────────────────────┘
                 │ HTTP/HTTPS
┌────────────────▼────────────────────┐
│   代理层（Deno Deploy）              │
│  - OAuth Token 中继                 │
│  - App API 转发                     │
│  - 图片 CDN 代理 + 防盗链            │
└────────────────┬────────────────────┘
                 │
         ┌───────┴────────┐
         │                │
    ┌────▼─────┐  ┌──────▼─────┐
    │ Pixiv    │  │ Pixiv 图片  │
    │OAuth/API │  │ CDN         │
    └──────────┘  └─────────────┘
```

### 代理后端

项目配有两个版本的代理实现：

#### Cloudflare Workers 版（`worker/worker.js`）

**优点：**
- 冷启动快
- 集成 Cloudflare 边缘缓存

**缺点：**
- 出口 IP 已被 Pixiv 封禁

#### Deno Deploy 版（`worker/deno/main.ts`）- 推荐 ⭐

**优点：**
- 出口 IP 走 Google 边缘网络，目前可用
- 免费额度更大：100 万请求/月
- 部署简单：支持 GitHub 自动部署

**免费限额：**
- 100 万次请求 / 月
- 10 万 KB-小时
- 100 GB 出站流量 / 月

## 📦 技术栈

### 核心框架

| 技术 | 版本 | 说明 |
|------|------|------|
| Vue | 3.5.13 | 渐进式 JavaScript 框架 |
| TypeScript | 5.7.3 | JavaScript 超集 |
| Vite | 6.1.0 | 下一代前端构建工具 |

### 核心库

| 库 | 版本 | 用途 |
|----|------|------|
| Vant | 4.9.14 | 移动端 UI 组件库 |
| Vue Router | 4.5.0 | 路由管理 |
| Pinia | 2.3.0 | 状态管理 |
| Dexie | 4.0.11 | 本地 IndexedDB 数据库 |
| TanStack Vue Virtual | 3.11.2 | 虚拟滚动优化 |

### 构建和工具

| 工具 | 版本 | 用途 |
|------|------|------|
| UnoCSS | 65.4.3 | 原子化 CSS |
| Vite PWA | 0.21.1 | PWA 支持 |
| vue-tsc | 2.2.0 | TypeScript 类型检查 |

## 🔧 配置指南

### 环境变量配置

#### 本地开发（`.env.development` 或 `.env`）

```env
# API 基础地址（本地调试用 Deno Deploy）
VITE_API_BASE_URL=http://127.0.0.1:8000
```

#### 生产部署（`.env.production`）

```env
# API 基础地址（你的 Deno Deploy 后端地址）
VITE_API_BASE_URL=https://px-reader-proxy.deno.dev
```

### 代理后端部署

#### 方案 A: Deno Deploy（推荐）

**GitHub 自动部署（推荐）：**

1. 项目已推至 GitHub
2. 访问 https://dash.deno.com → New Project
3. 选择本仓库
4. **Entrypoint** 设为 `worker/deno/main.ts`
5. 点击 Deploy
6. 获得类似 `https://px-reader-proxy.deno.dev` 的地址

之后每次 `git push` 会自动重新部署。

**CLI 部署：**

```bash
# 安装 deployctl
deno install -gArf jsr:@deno/deployctl

# 部署
cd worker/deno
deployctl deploy --project=px-reader-proxy --entrypoint=main.ts --prod
```

首次会弹窗授权 Deno Deploy 账号。

#### 方案 B: Cloudflare Workers

```bash
# 安装 wrangler
npm i -g wrangler
wrangler login

cd worker
wrangler deploy
```

部署成功后会得到 `https://px-reader-proxy.<你的子域>.workers.dev`

### CORS 域名白名单配置（生产环境推荐）

编辑 `worker/deno/main.ts`（第 25 行）：

```typescript
// 改前（允许任意源）
const ALLOWED_ORIGINS: Set<string> | null = null

// 改后（仅允许特定域名）
const ALLOWED_ORIGINS: Set<string> | null = new Set([
  'https://reader.rem.asia',
  'http://localhost:5173',
])
```

## 📂 项目结构

```
px-reader-web/
├── src/
│   ├── components/        # Vue 组件
│   ├── stores/           # Pinia 状态管理
│   ├── views/            # 页面视图
│   ├── utils/            # 工具函数
│   ├── api/              # API 调用层
│   ├── App.vue           # 根组件
│   └── main.ts           # 应用入口
├── worker/
│   ├── worker.js         # Cloudflare Workers 代理
│   ├── README.md         # Workers 部署说明
│   └── deno/
│       ├── main.ts       # Deno Deploy 代理（推荐）
│       └── README.md     # Deno Deploy 部署说明
├── public/               # 静态资源
├── package.json          # 项目配置
├── vite.config.ts        # Vite 配置
├── tsconfig.json         # TypeScript 配置
└── README.md             # 项目文档（本文件）
```

## 🔐 安全说明

### 架构设计

- **纯前端架构** - 所有业务逻辑在浏览器端完成，代理只负责请求中继
- **无状态后端** - 代理不保存任何用户数据
- **PKCE OAuth2** - 使用授权码流程 + PKCE 增强安全性

### 已知限制

⚠️ **localStorage Token 风险** - `refresh_token` 保存在 `localStorage` 中，存在被 XSS 攻击盗取的风险。

**建议：**
- 不在浏览器插件中安装此应用
- 定期清理浏览器缓存
- 如需多用户生产环境部署，建议改用 HttpOnly Cookie 方案

### Pixiv 相关常量

代码中的 `X-Client-Hash`、`User-Agent` 等都是社区已公开的 Pixiv 安卓客户端常量，非机密信息。

## 📱 使用指南

### 基本流程

1. **OAuth 授权**
   - 点击「登录」按钮
   - 浏览器跳转至 Pixiv 授权页面
   - 输入账号密码，授权应用
   - 自动跳转回应用，保存 token

2. **查看小说**
   - Token 保存后自动可用
   - 搜索或浏览 Pixiv 小说
   - 点击进入阅读

3. **离线阅读**
   - 已读小说自动缓存到本地
   - 网络断开后仍可查看历史记录

### PWA 安装（可选）

- Chrome/Edge：地址栏右端 → 「安装应用」
- 或菜单 → 「安装 px-reader-web」

## 🛠️ 开发指南

### 本地调试代理

```bash
cd worker/deno
deno task dev
# 默认监听 http://127.0.0.1:8000
```

修改前端 `.env.development`：

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

```bash
npm run dev
# 访问 http://localhost:5173
```

### 构建

```bash
# 完整构建流程（包括 TypeScript 类型检查）
npm run build

# 输出在 dist/ 目录
```

### 部署到 Cloudflare Pages

```bash
# 1. 本地构建
npm run build

# 2. 连接 GitHub 仓库到 Cloudflare Pages
# 访问 https://pages.cloudflare.com
# 连接 GitHub 账号 → 选择本仓库

# 3. 配置构建设置
# Framework: 无（无框架）或自定义
# Build command: npm run build
# Build output directory: dist

# 4. 部署后访问 Cloudflare Pages 域名
```

或者本地手动部署：

```bash
npm i -g wrangler
wrangler pages deploy dist/
```

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 提交 PR 前

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

### 代码风格

- 使用 TypeScript
- 遵循 Vue 3 Composition API 规范
- 添加必要的注释

## 📄 许可证

MIT License © 2025 RemKeeper

## 🙏 致谢

- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [Vant](https://vant-ui.github.io/) - 移动端 UI 组件库
- [Deno Deploy](https://deno.com/deploy) - 边缘计算平台
- [Pixiv API](https://www.pixiv.net/) - Pixiv 官方 API

## 📞 联系方式

- GitHub Issues: [提交 Issue](https://github.com/RemKeeper/px-reader-web/issues)
- GitHub Discussions: [讨论区](https://github.com/RemKeeper/px-reader-web/discussions)

## ⚠️ 免责声明

本项目仅供学习和研究使用，用户需自行承担使用本项目所产生的法律责任。Pixiv 是 Pixiv Inc. 的商标，本项目与 Pixiv 官方无关。

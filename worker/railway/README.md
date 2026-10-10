# Pixiv 极简代理 — Railway 版 (Deno 容器)

适用于部署在 **Railway** 平台的代理方案。
Railway 的出口 IP 走 GCP，目前未被 Pixiv 封禁，适合作为 Cloudflare Workers / Deno Deploy 的长期稳定替代。

---

## 路由

与 Cloudflare Workers / Deno Deploy 版本完全一致：

| 方法 | 路径 | 上游 |
|---|---|---|
| POST | `/oauth/auth/token` | `https://oauth.secure.pixiv.net/auth/token` |
| ANY | `/app/<path>` | `https://app-api.pixiv.net/<path>` |
| GET | `/image?url=<encoded>` | `*.pximg.net` |
| POST | `/translate/deeplx` | 自定义 DeepLX 兼容接口 |
| GET | `/` | 健康检查（返回 `px-reader proxy ok (railway)`） |

---

## 本地测试

```bash
cd worker/railway
deno task dev
# 默认监听 http://127.0.0.1:8000
```

测试健康检查：
```bash
curl http://127.0.0.1:8000/
```

---

## 部署到 Railway 步骤

### 1. 提交代码至 GitHub
确保 `worker/railway/` 已经包含并推送到你的 GitHub 仓库。

### 2. 在 Railway 创建项目
1. 访问 [railway.com](https://railway.com/) 并登录。
2. 点击 **New Project** -> **Deploy from GitHub repo**。
3. 选择你的 `px-reader-web` 仓库。

### 3. 配置 Root Directory（非常重要！）
因为本项目是一个单仓多服务的结构，代理端位于子目录：
1. 在项目概览中点击刚创建的服务卡片。
2. 切换到 **Settings** 标签页。
3. 找到 **Root Directory**。
4. 填写为：`/worker/railway`
5. 保存，Railway 将自动识别该目录下的 `Dockerfile` 并重新构建部署。

### 4. 生成公开域名 (Public Domain)
1. 在服务的 **Settings** 标签页中。
2. 向下滚动到 **Networking** -> **Public Networking**。
3. 点击 **Generate Domain**。
4. 你会获得一个形如 `https://px-reader-web-production-xxxx.up.railway.app` 的链接。

### 5. 配置环境变量（可选）
如果需要服务端备用 Token（用于免登录小说分享）：
1. 切换到 **Variables** 标签页。
2. 添加变量：`PIXIV_REFRESH_TOKEN`，值为你的 refresh token。

---

## 将代理 URL 配置回前端

在前端仓库根目录的 `.env.production` 中：

```env
VITE_API_BASE_URL=https://px-reader-web-production-xxxx.up.railway.app
```

然后重新执行前端打包构建即可。

# 贡献指南

感谢您对 px-reader-web 的兴趣！我们欢迎所有形式的贡献。

## 贡献方式

### 报告 Bug

1. 确保 bug 未被报告过（检查 [Issues](https://github.com/RemKeeper/px-reader-web/issues)）
2. 提供详细的重现步骤
3. 包括您的环境信息（浏览器、系统、Node 版本等）
4. 附加相关的错误日志或截图

### 建议功能

1. 使用清晰的标题描述功能
2. 详细说明该功能的用例
3. 列出可能的替代方案
4. 附加任何相关的示例代码

### 提交 Pull Request

1. Fork 本项目
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

#### PR 提交检查清单

- [ ] 代码遵循项目风格指南
- [ ] 代码已通过类型检查 (`npm run build`)
- [ ] 添加了必要的注释和文档
- [ ] 更新了 README（如适用）
- [ ] 没有引入新的 warning
- [ ] 分支已基于最新的 main 分支

## 代码风格

### TypeScript

- 始终指定类型
- 避免使用 `any` 类型
- 使用接口而非类型别名（当可能时）

### Vue 3

- 优先使用 `<script setup>` 语法
- 使用 Composition API
- 组件名称使用 PascalCase
- 文件名使用 PascalCase（组件）或 kebab-case（其他）

### CSS

- 使用 UnoCSS 原子化 CSS
- 避免内联样式
- 使用 CSS 变量处理颜色和间距

## 开发流程

1. **本地开发**
   ```bash
   npm install
   npm run dev
   ```

2. **构建和测试**
   ```bash
   npm run build
   npm run preview
   ```

3. **类型检查**
   ```bash
   npm run build  # 包含 vue-tsc 类型检查
   ```

## 项目结构

```
px-reader-web/
├── src/
│   ├── components/        # 可复用组件
│   ├── stores/           # Pinia 状态管理
│   ├── views/            # 页面级组件
│   ├── utils/            # 工具函数
│   ├── api/              # API 接口层
│   ├── App.vue           # 根组件
│   └── main.ts           # 应用入口
├── worker/               # 代理后端
│   ├── worker.js         # Cloudflare Workers
│   └── deno/             # Deno Deploy
├── public/               # 静态资源
└── vite.config.ts        # 构建配置
```

## 命名规范

### 组件

```typescript
// ✅ 好的
<template>
  <div class="user-profile">
    <!-- 组件内容 -->
  </div>
</template>

// ❌ 避免
<template>
  <div class="userProfile">
    <!-- 组件内容 -->
  </div>
</template>
```

### 函数和变量

```typescript
// ✅ 好的
const getUserInfo = async (userId: string) => {
  // ...
}

const isLoading = ref(false)

// ❌ 避免
const get_user_info = async (userId: string) => {
  // ...
}

const loading = ref(false)  // 不够明确
```

## 提交信息格式

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码风格调整（不改变逻辑）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 添加或更新测试
- `chore`: 构建流程、依赖管理等

### 示例

```
feat(reader): add bookmark functionality

Users can now bookmark their favorite novels for quick access.

Closes #123
```

## 获取帮助

- 📖 [README](./README.md) - 项目文档
- 💬 [GitHub Discussions](https://github.com/RemKeeper/px-reader-web/discussions) - 讨论区
- 🐛 [GitHub Issues](https://github.com/RemKeeper/px-reader-web/issues) - Bug 反馈

## 许可证

通过提交贡献，您同意您的贡献将在 MIT 许可证下发布。

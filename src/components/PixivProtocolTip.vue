<template>
  <div class="bg-surface rounded-xl p-4 border border-border">
    <div class="flex items-start gap-2 mb-3">
      <van-icon name="warning-o" class="text-primary mt-0.5" size="16" />
      <p class="text-text text-xs leading-relaxed">
        需要下载 <code class="text-primary">pixiv://</code> 协议回调工具以完成登录
      </p>
    </div>
    <div class="space-y-2">
      <a
        href="https://pixiv-protocol.rem.asia/app-debug.apk"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center justify-between bg-bg rounded-lg px-3 py-2 text-xs text-text hover:bg-primary/10 transition-colors"
      >
        <span class="flex items-center gap-2">
          <van-icon name="phone-o" size="14" />
          安卓端 (APK)
        </span>
        <van-icon name="down" size="12" class="text-text-secondary" />
      </a>
      <a
        href="https://pixiv-protocol.rem.asia/pixiv-protocol.exe"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center justify-between bg-bg rounded-lg px-3 py-2 text-xs text-text hover:bg-primary/10 transition-colors"
      >
        <span class="flex items-center gap-2">
          <van-icon name="desktop-o" size="14" />
          Windows 端 (EXE)
        </span>
        <van-icon name="down" size="12" class="text-text-secondary" />
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
// 静态提示组件，无逻辑
</script>

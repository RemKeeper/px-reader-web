<template>
  <div class="space-y-3">
    <!-- WebView 环境警告 -->
    <div
      v-if="isWebView"
      class="bg-orange-500/10 border border-orange-500/40 rounded-xl p-3 flex items-start gap-2"
    >
      <van-icon name="warning-o" class="text-orange-500 mt-0.5 shrink-0" size="16" />
      <div class="text-xs text-text leading-relaxed">
        <p class="font-medium mb-1">检测到您正在内嵌浏览器中打开</p>
        <p class="text-text-secondary">
          内嵌浏览器（微信/QQ/抖音等 App 内）通常无法完成 Pixiv 登录，建议使用系统浏览器（Chrome / Edge / Safari）打开本站，或点击下方按钮复制链接。
        </p>
        <van-button
          size="mini"
          plain
          type="warning"
          class="mt-2"
          @click="copyCurrentUrl"
        >
          复制本站链接
        </van-button>
      </div>
    </div>

    <!-- 增强登录辅助：兼容 WebView -->
    <div v-if="showLoginHelper" class="bg-surface rounded-xl p-3 border border-border space-y-2">
      <p class="text-xs text-text-secondary leading-relaxed">
        若主登录按钮无反应，可尝试以下方式：
      </p>
      <div class="grid grid-cols-2 gap-2">
        <van-button size="small" plain block @click="openInNewTab">
          新标签页打开
        </van-button>
        <van-button size="small" plain block @click="copyLoginUrl">
          复制登录链接
        </van-button>
      </div>
    </div>

    <!-- 协议回调下载 -->
    <div class="bg-surface rounded-xl p-4 border border-border">
      <div class="flex items-start gap-2 mb-3">
        <van-icon name="warning-o" class="text-primary mt-0.5" size="16" />
        <p class="text-text text-xs leading-relaxed">
          需要下载 <code class="text-primary">pixiv://</code> 协议回调工具以完成登录回跳，否则即使在系统浏览器登录成功，也无法返回本站。
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
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { showToast } from 'vant'
import { useAuthStore } from '@/stores'

const props = defineProps<{
  /** 是否显示「新标签页打开 / 复制登录链接」辅助按钮（默认 true） */
  showLoginHelper?: boolean
  /** 已预取的登录 URL；提供后辅助按钮可同步执行，规避 WebView 拦截 */
  preparedUrl?: string | null
}>()

const showLoginHelper = computed(() => props.showLoginHelper !== false)

const authStore = useAuthStore()

// 简易 WebView 检测：覆盖 Android WebView、各类 App 内嵌浏览器
const isWebView = computed(() => {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return (
    /; wv\)/i.test(ua) ||
    /MicroMessenger/i.test(ua) ||
    /QQ\//i.test(ua) ||
    /MQQBrowser/i.test(ua) ||
    /Weibo/i.test(ua) ||
    /AlipayClient/i.test(ua) ||
    /DingTalk/i.test(ua) ||
    /TikTok|aweme|musical_ly/i.test(ua) ||
    /Bilibili/i.test(ua)
  )
})

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fallback below
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

async function copyCurrentUrl() {
  const ok = await copyToClipboard(window.location.href)
  showToast(ok ? '已复制本站链接' : '复制失败，请手动复制')
}

async function openInNewTab() {
  // 优先使用预取 URL，可在用户手势同步上下文中调用 window.open，
  // 避免 await 后被 WebView 拦截弹窗。
  let url = props.preparedUrl || null
  let w: Window | null = null
  if (url) {
    w = window.open(url, '_blank', 'noopener,noreferrer')
  }
  if (!url) {
    url = await authStore.prepareLogin()
    if (!url) {
      showToast(authStore.error || '获取登录链接失败')
      return
    }
    w = window.open(url, '_blank', 'noopener,noreferrer')
  }
  if (!w) {
    const ok = await copyToClipboard(url)
    showToast(ok ? '弹窗被拦截，已复制登录链接，请粘贴到系统浏览器打开' : '请手动复制链接')
  }
}

async function copyLoginUrl() {
  const url = props.preparedUrl || (await authStore.prepareLogin())
  if (!url) {
    showToast(authStore.error || '获取登录链接失败')
    return
  }
  const ok = await copyToClipboard(url)
  showToast(ok ? '已复制登录链接，请用系统浏览器打开' : '复制失败，请手动复制')
}
</script>

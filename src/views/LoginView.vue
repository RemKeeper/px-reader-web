<template>
  <div class="login-view min-h-screen bg-bg flex-col-center px-8">
    <div class="text-center mb-12">
      <div class="w-20 h-20 rounded-2xl bg-primary/20 flex-center mx-auto mb-4">
        <van-icon name="book-o" size="40" class="text-primary" />
      </div>
      <h1 class="text-text text-2xl font-bold">PX-Reader</h1>
      <p class="text-text-secondary text-sm mt-2">Pixiv 小说阅读器</p>
    </div>

    <van-button
      type="primary"
      round
      block
      size="large"
      :loading="authStore.loading || preparing"
      loading-text="跳转中..."
      @click="handleLogin"
    >
      登录 Pixiv
    </van-button>

    <p v-if="authStore.error" class="text-red-400 text-sm mt-4 text-center">
      {{ authStore.error }}
    </p>

    <p class="text-text-secondary text-xs mt-8 text-center leading-relaxed">
      登录后可获取推荐小说、关注动态等个性化内容
    </p>

    <div class="mt-6 w-full max-w-md mx-auto">
      <PixivProtocolTip :prepared-url="preparedUrl" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { showToast } from 'vant'
import { useAuthStore } from '@/stores'
import PixivProtocolTip from '@/components/PixivProtocolTip.vue'

const authStore = useAuthStore()

// 预取的登录 URL：在页面挂载时就准备好，
// 这样点击按钮时可同步跳转，避免在 Via 等严格 WebView 中
// 因 await 丢失用户手势而拦截导航。
const preparedUrl = ref<string | null>(null)
const preparing = ref(false)

async function prepare() {
  if (preparedUrl.value || preparing.value) return
  preparing.value = true
  try {
    preparedUrl.value = await authStore.prepareLogin()
  } finally {
    preparing.value = false
  }
}

onMounted(prepare)

async function handleLogin(e: MouseEvent) {
  // 已预取：同步跳转（保留用户手势上下文）
  if (preparedUrl.value) {
    try {
      window.location.assign(preparedUrl.value)
    } catch {
      window.location.href = preparedUrl.value
    }
    return
  }
  // 未预取（如刚进入即点击或预取失败）：尝试再取一次
  e.preventDefault()
  const url = await authStore.prepareLogin()
  if (url) {
    preparedUrl.value = url
    window.location.href = url
  } else {
    showToast(authStore.error || '获取登录链接失败，请检查网络后重试')
  }
}
</script>

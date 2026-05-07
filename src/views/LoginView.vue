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
      :loading="authStore.loading"
      loading-text="跳转中..."
      @click="authStore.login()"
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
      <PixivProtocolTip />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores'
import PixivProtocolTip from '@/components/PixivProtocolTip.vue'

const authStore = useAuthStore()
</script>

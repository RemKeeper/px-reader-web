<template>
  <div class="callback-view min-h-screen bg-bg flex-col-center">
    <van-loading type="spinner" color="var(--color-primary)" size="40" vertical>
      正在登录...
    </van-loading>
    <p v-if="error" class="text-red-400 text-sm mt-4">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const error = ref('')

onMounted(async () => {
  const code = route.query.code as string | undefined
  if (!code) {
    error.value = '缺少授权码'
    return
  }

  const ok = await authStore.callback(code)
  if (ok) {
    router.replace('/')
  } else {
    error.value = authStore.error || '登录失败，请重试'
  }
})
</script>

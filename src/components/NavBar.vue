<template>
  <van-nav-bar
    :title="title"
    :left-arrow="showBack"
    :left-text="showBack ? '返回' : ''"
    @click-left="onBack"
    class="safe-top"
    fixed
    placeholder
    :border="false"
    :style="{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }"
  >
    <template #right>
      <button
        class="fullscreen-btn hidden md:inline-flex items-center justify-center w-8 h-8 mr-1 rounded-full opacity-60 hover:opacity-100 hover:bg-black/8 dark:hover:bg-white/10 transition-all duration-200 cursor-pointer border-none bg-transparent"
        @click.stop="toggleFullscreen"
        :title="isFullscreen ? '退出全屏' : '全屏'"
      >
        <van-icon :name="isFullscreen ? 'shrink' : 'expand-o'" size="18" class="text-text" />
      </button>
      <slot name="right" />
    </template>
  </van-nav-bar>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'

withDefaults(
  defineProps<{
    title?: string
    showBack?: boolean
  }>(),
  {
    title: 'PX-Reader',
    showBack: false,
  },
)

const router = useRouter()
const isFullscreen = ref(false)

function onBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
}

async function toggleFullscreen() {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen().catch(() => {
      showToast('全屏失败，请检查浏览器是否支持')
    })
  } else {
    await document.exitFullscreen()
  }
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})
</script>

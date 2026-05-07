<template>
  <div
    id="px-reader"
    :class="`theme-${settingsStore.settings.theme}`"
  >
    <router-view v-slot="{ Component }">
      <transition name="page-fade" mode="out-in">
        <keep-alive :include="keepAlivePages">
          <component :is="Component" />
        </keep-alive>
      </transition>
    </router-view>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useSettingsStore } from '@/stores'

const settingsStore = useSettingsStore()

const keepAlivePages = ['HomeView', 'ShelfView', 'FollowView']

// 把主题 class 同步到 <html>，让 teleport 到 body 的 Vant 弹层也能继承 CSS 变量
watch(
  () => settingsStore.settings.theme,
  (theme) => {
    const root = document.documentElement
    root.classList.remove('theme-dark', 'theme-light', 'theme-sepia')
    root.classList.add(`theme-${theme}`)
  },
  { immediate: true },
)
</script>

<style>
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.2s ease;
}
.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}
</style>

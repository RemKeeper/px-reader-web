<template>
  <div
    id="px-reader"
    :class="[
      `theme-${settingsStore.settings.theme}`,
      { 'hdr-eye-care': settingsStore.settings.hdrEyeCare },
      { 'oled-extreme-black': settingsStore.settings.hdrEyeCare && settingsStore.settings.oledExtremeBlack },
    ]"
    :style="oledCssVars"
  >
    <router-view v-slot="{ Component }">
      <transition name="page-fade" mode="out-in">
        <keep-alive :include="keepAlivePages">
          <component :is="Component" />
        </keep-alive>
      </transition>
    </router-view>

    <!-- HDR 护眼：暖色滤镜层 -->
    <div
      v-if="settingsStore.settings.hdrEyeCare && (settingsStore.settings.hdrWarmFilter ?? 0) > 0"
      class="hdr-warm-filter"
      :style="{ opacity: (settingsStore.settings.hdrWarmFilter ?? 0) / 100 * 0.5 }"
    />
    <!-- HDR 护眼：亮度遮罩层 -->
    <div
      v-if="settingsStore.settings.hdrEyeCare && (settingsStore.settings.hdrBrightness ?? 100) < 100"
      class="hdr-brightness-mask"
      :style="{ opacity: 1 - (settingsStore.settings.hdrBrightness ?? 100) / 100 }"
    />
  </div>
</template>

<script setup lang="ts">
import { watch, computed } from 'vue'
import { useSettingsStore } from '@/stores'

const settingsStore = useSettingsStore()

const keepAlivePages = ['HomeView', 'ShelfView', 'FollowView']

/** OLED 极端黑色模式：将文字/边框亮度作为 CSS 变量注入，由 CSS 消费 */
const oledCssVars = computed(() => {
  const s = settingsStore.settings
  if (!s.hdrEyeCare || !s.oledExtremeBlack) return {}
  const b = s.oledTextBrightness ?? 80
  const bSec = Math.round(b * 0.55)
  const bBorder = Math.round(b * 0.22)
  return {
    '--oled-text-color': `hsl(0, 0%, ${b}%)`,
    '--oled-text-secondary-color': `hsl(0, 0%, ${bSec}%)`,
    '--oled-border-color': `hsl(0, 0%, ${bBorder}%)`,
  }
})

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

// 同步 HDR 护眼 class 到 <html>，让 teleport 弹层也继承 sRGB 限制等
watch(
  () => settingsStore.settings.hdrEyeCare,
  (on) => {
    document.documentElement.classList.toggle('hdr-eye-care', !!on)
  },
  { immediate: true },
)

// 同步 OLED 极端黑色 class + CSS 变量到 <html>，确保 teleport 弹层也生效
watch(
  () => oledCssVars.value,
  (vars) => {
    const html = document.documentElement
    const active = Object.keys(vars).length > 0
    html.classList.toggle('oled-extreme-black', active)
    const keys = ['--oled-text-color', '--oled-text-secondary-color', '--oled-border-color'] as const
    if (active) {
      keys.forEach((k) => html.style.setProperty(k, (vars as Record<string, string>)[k] ?? ''))
    } else {
      keys.forEach((k) => html.style.removeProperty(k))
    }
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

/* ── HDR 屏幕护眼适配（实验性） ── */
/* 暖色滤镜层：模拟夜间模式色温下移，过滤蓝光 */
.hdr-warm-filter {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9998;
  background: rgba(255, 170, 80, 1);
  mix-blend-mode: multiply;
}
/* 亮度遮罩层：在系统亮度已最低时进一步压暗 HDR 屏 */
.hdr-brightness-mask {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  background: #000;
}
</style>

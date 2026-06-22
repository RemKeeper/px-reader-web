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
import { useSEO } from '@/composables'

const settingsStore = useSettingsStore()

// 全局 SEO：根据当前路由自动更新 title / meta
useSEO()

const keepAlivePages = ['HomeView', 'ShelfView', 'FollowView', 'SearchView']

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

// HDR 护眼：将鼠标光标亮度同步到当前文字亮度
const hdrCursorColor = computed(() => {
  const s = settingsStore.settings
  if (!s.hdrEyeCare) return null
  if (s.oledExtremeBlack) {
    const b = s.oledCursorBrightnessEnabled
      ? (s.oledCursorBrightness ?? s.oledTextBrightness ?? 80)
      : (s.oledTextBrightness ?? 80)
    return `hsl(0,0%,${b}%)`
  }
  // 非极端黑模式：匹配 HDR 深色主题文字色 (#d0d0d8 ≈ 82%)
  return 'hsl(0,0%,82%)'
})

function _buildCursorUrl(path: string, w: number, h: number, hx: number, hy: number, fb: string, color: string) {
  const d = 'rgba(0,0,0,0.62)'
  const attrs = `fill="${color}" stroke="${d}" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><path d="${path}" ${attrs}/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hx} ${hy}, ${fb}`
}

function _makeCursorCSS(color: string): string {
  // 箭头光标 (12×20, 热点 1,1)
  const arrowUrl = _buildCursorUrl(
    'M1 1L1 16L4 12.5L6.2 18L7.6 17.3L5.4 11.8L10 11.8Z',
    12, 20, 1, 1, 'default', color,
  )
  // 手型光标：单指+手掌轮廓 (14×20, 热点 7,0)
  const ptrUrl = _buildCursorUrl(
    'M5 2Q5 0 7.5 0Q10 0 10 2L10 12Q13 12 13 15Q13 19 7.5 19Q2 19 2 15L2 12L5 12Z',
    14, 20, 7, 0, 'pointer', color,
  )
  const s = 'html.hdr-eye-care'
  return [
    `${s}, ${s} * { cursor: ${arrowUrl}; }`,
    `${s} a, ${s} button, ${s} [role="button"],`,
    `${s} .van-cell--clickable, ${s} .van-button,`,
    `${s} .van-switch, ${s} .van-slider,`,
    `${s} .van-stepper__minus, ${s} .van-stepper__plus,`,
    `${s} .van-tabbar-item { cursor: ${ptrUrl}; }`,
  ].join('\n')
}

let _hdrCursorEl: HTMLStyleElement | null = null
watch(
  hdrCursorColor,
  (color) => {
    if (!_hdrCursorEl) {
      _hdrCursorEl = document.createElement('style')
      _hdrCursorEl.id = 'hdr-cursor-style'
      document.head.appendChild(_hdrCursorEl)
    }
    _hdrCursorEl.textContent = color ? _makeCursorCSS(color) : ''
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

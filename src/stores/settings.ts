import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ReaderSettings } from '@/types'

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 18,
  lineHeight: 1.8,
  fontFamily: 'serif',
  theme: 'dark',
  pageMode: 'scroll',
  chapterMaxChars: 5000,
  showChapterNav: true,
  autoPageInterval: 0,
  hdrEyeCare: false,
  hdrBrightness: 100,
  hdrWarmFilter: 0,
  oledExtremeBlack: false,
  oledTextBrightness: 80,
  oledCursorBrightnessEnabled: false,
  oledCursorBrightness: 80,
  autoRefreshFeed: true,
  translationApiUrl: '',
  translationSourceLang: 'auto',
  translationTargetLang: 'ZH',
}

export const useSettingsStore = defineStore(
  'settings',
  () => {
    const settings = ref<ReaderSettings>({ ...DEFAULT_SETTINGS })

    const fontFamilyStyle = computed(() => {
      const map: Record<string, string> = {
        sans: "'Noto Sans SC', sans-serif",
        serif: "'Noto Serif SC', serif",
        mono: "'JetBrains Mono', monospace",
      }
      return map[settings.value.fontFamily] || map.serif!
    })

    const cssVars = computed(() => ({
      '--reader-font-size': `${settings.value.fontSize}px`,
      '--reader-line-height': String(settings.value.lineHeight),
      '--reader-font-family': fontFamilyStyle.value,
    }))

    function updateSettings(partial: Partial<ReaderSettings>) {
      settings.value = { ...settings.value, ...partial }
    }

    function resetSettings() {
      settings.value = { ...DEFAULT_SETTINGS }
    }

    return {
      settings,
      fontFamilyStyle,
      cssVars,
      updateSettings,
      resetSettings,
    }
  },
  {
    persist: true,
  },
)

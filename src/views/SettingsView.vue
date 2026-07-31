<template>
  <div class="settings-view h-[100vh] h-[100dvh] bg-bg flex flex-col overflow-hidden">
    <NavBar title="设置" />

    <div ref="settingsScrollRef" class="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 pb-24 safe-bottom">
      <!-- 账号 -->
      <div class="bg-surface rounded-xl overflow-hidden">
        <van-cell-group :border="false">
          <van-cell
            v-if="authStore.isLoggedIn"
            title="Pixiv 账号"
            value="已登录"
            icon="user-o"
          />
          <van-cell
            v-else
            title="登录 Pixiv"
            icon="user-o"
            is-link
            to="/login"
          />
          <van-cell
            title="手动填写 refresh_token"
            icon="edit"
            is-link
            label="登录兜底：用于在 OAuth 跳转不可用时手动输入凭证"
            @click="showManualLogin = true"
          />
          <van-cell
            v-if="authStore.isLoggedIn"
            title="退出登录"
            icon="close"
            is-link
            @click="onLogout"
          />
        </van-cell-group>
      </div>

      <!-- 阅读设置 -->
      <div class="bg-surface rounded-xl overflow-hidden">
        <van-cell-group :border="false" title="阅读设置">
          <van-cell title="字号" :value="`${settings.fontSize}px`" icon="font-o">
            <template #right-icon>
              <div class="flex items-center gap-2 ml-2">
                <van-button size="mini" @click="adjustFontSize(-1)">A-</van-button>
                <van-button size="mini" @click="adjustFontSize(1)">A+</van-button>
              </div>
            </template>
          </van-cell>

          <van-cell title="行高" :value="String(settings.lineHeight)" icon="bars">
            <template #right-icon>
              <div class="flex items-center gap-2 ml-2">
                <van-button size="mini" @click="adjustLineHeight(-0.1)">-</van-button>
                <van-button size="mini" @click="adjustLineHeight(0.1)">+</van-button>
              </div>
            </template>
          </van-cell>

          <van-cell title="字体" is-link @click="showFontPicker = true">
            <template #value>
              <span class="text-text-secondary">{{ fontLabel }}</span>
            </template>
          </van-cell>

          <van-cell title="主题" is-link @click="showThemePicker = true">
            <template #value>
              <span class="text-text-secondary">{{ themeLabel }}</span>
            </template>
          </van-cell>

          <van-cell title="分章字数" :value="`${settings.chapterMaxChars}`" />

          <van-cell title="显示章节导航" center>
            <template #label>
              <span class="text-xs text-text-secondary">
                仅在检测到自然章节标题时显示
              </span>
            </template>
            <template #right-icon>
              <van-switch
                :model-value="settings.showChapterNav"
                size="20"
                @update:model-value="settingsStore.updateSettings({ showChapterNav: $event })"
              />
            </template>
          </van-cell>

          <van-cell title="自动刷新信息流" center>
            <template #label>
              <span class="text-xs text-text-secondary">
                切换 Tab 或重新进入页面时，若缓存超过 5 分钟则自动刷新；从阅读页返回不触发刷新
              </span>
            </template>
            <template #right-icon>
              <van-switch
                :model-value="settings.autoRefreshFeed ?? true"
                size="20"
                @update:model-value="settingsStore.updateSettings({ autoRefreshFeed: $event })"
              />
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <!-- 翻译设置 -->
      <div class="bg-surface rounded-xl overflow-hidden">
        <van-cell-group :border="false" title="翻译设置">
          <van-cell title="DeepLX 接口地址" :label="settings.translationApiUrl ? settings.translationApiUrl : '留空则使用阅读页内手动输入'">
            <template #right-icon>
              <van-button size="mini" @click="showTranslationConfig = true">配置</van-button>
            </template>
          </van-cell>
          <van-cell title="默认源语言" :value="translationSourceLabel" is-link @click="showTranslationSourcePicker = true" />
          <van-cell title="默认目标语言" :value="translationTargetLabel" is-link @click="showTranslationTargetPicker = true" />
          <van-cell
            title="术语管理"
            :value="`${translationGlossary.length} 条`"
            is-link
            @click="openGlossaryManager"
          />
        </van-cell-group>
      </div>

      <!-- HDR 屏幕护眼适配（实验性） -->
      <div class="bg-surface rounded-xl overflow-hidden">
        <van-cell-group :border="false" title="显示与护眼">
          <van-cell title="HDR 屏幕护眼适配" center>
            <template #label>
              <span class="text-xs text-text-secondary">
                实验性：柔化纯白/纯黑、限制 sRGB 色域、略降饱和度，缓解 HDR/OLED 屏疲劳
              </span>
            </template>
            <template #right-icon>
              <van-switch
                :model-value="!!settings.hdrEyeCare"
                size="20"
                @update:model-value="settingsStore.updateSettings({ hdrEyeCare: $event })"
              />
            </template>
          </van-cell>
          <van-cell
            v-if="settings.hdrEyeCare"
            title="屏幕亮度限制"
            :value="`${settings.hdrBrightness ?? 100}%`"
          >
            <template #label>
              <span class="text-xs text-text-secondary">
                叠加黑色蒙版进一步压暗，适合系统已最低亮度仍刺眼时
              </span>
            </template>
            <template #right-icon>
              <div class="w-32 ml-2">
                <van-slider
                  :model-value="settings.hdrBrightness ?? 100"
                  :min="30"
                  :max="100"
                  :step="5"
                  @update:model-value="(v) => settingsStore.updateSettings({ hdrBrightness: Number(v) })"
                />
              </div>
            </template>
          </van-cell>
          <van-cell
            v-if="settings.hdrEyeCare && !settings.oledExtremeBlack"
            title="暖色滤镜"
            :value="`${settings.hdrWarmFilter ?? 0}%`"
          >
            <template #label>
              <span class="text-xs text-text-secondary">
                叠加暖橙色蒙版，过滤蓝光，0% 关闭
              </span>
            </template>
            <template #right-icon>
              <div class="w-32 ml-2">
                <van-slider
                  :model-value="settings.hdrWarmFilter ?? 0"
                  :min="0"
                  :max="100"
                  :step="5"
                  @update:model-value="(v) => settingsStore.updateSettings({ hdrWarmFilter: Number(v) })"
                />
              </div>
            </template>
          </van-cell>
          <van-cell
            v-if="settings.hdrEyeCare"
            title="OLED 极端黑色模式"
            center
          >
            <template #label>
              <span class="text-xs text-text-secondary">
                进阶：背景纯黑（像素不发光），文字/边框亮度可调；在暖色滤镜与亮度限制的基础上进一步降低 OLED 屏能耗与眼疲劳
              </span>
            </template>
            <template #right-icon>
              <van-switch
                :model-value="!!settings.oledExtremeBlack"
                size="20"
                @update:model-value="settingsStore.updateSettings({ oledExtremeBlack: $event })"
              />
            </template>
          </van-cell>
          <van-cell
            v-if="settings.hdrEyeCare && settings.oledExtremeBlack"
            title="文字/UI 亮度"
            :value="`${settings.oledTextBrightness ?? 80}%`"
          >
            <template #label>
              <span class="text-xs text-text-secondary">
                100% = 纯白，0% = 纯黑（不可见）；建议 60–85% 舒适阅读
              </span>
            </template>
            <template #right-icon>
              <div class="w-32 ml-2">
                <van-slider
                  :model-value="settings.oledTextBrightness ?? 80"
                  :min="0"
                  :max="100"
                  :step="5"
                  @update:model-value="(v) => settingsStore.updateSettings({ oledTextBrightness: Number(v) })"
                />
              </div>
            </template>
          </van-cell>
          <van-cell
            v-if="settings.hdrEyeCare && settings.oledExtremeBlack"
            title="单独设置光标亮度"
            center
          >
            <template #label>
              <span class="text-xs text-text-secondary">
                开启后鼠标光标不再跟随文字/UI 亮度，可单独调暗或调亮
              </span>
            </template>
            <template #right-icon>
              <van-switch
                :model-value="!!settings.oledCursorBrightnessEnabled"
                size="20"
                @update:model-value="settingsStore.updateSettings({ oledCursorBrightnessEnabled: $event })"
              />
            </template>
          </van-cell>
          <van-cell
            v-if="settings.hdrEyeCare && settings.oledExtremeBlack && settings.oledCursorBrightnessEnabled"
            title="光标亮度"
            :value="`${settings.oledCursorBrightness ?? settings.oledTextBrightness ?? 80}%`"
          >
            <template #label>
              <span class="text-xs text-text-secondary">
                100% = 纯白，0% = 纯黑（不可见）；仅影响鼠标光标
              </span>
            </template>
            <template #right-icon>
              <div class="w-32 ml-2">
                <van-slider
                  :model-value="settings.oledCursorBrightness ?? settings.oledTextBrightness ?? 80"
                  :min="0"
                  :max="100"
                  :step="5"
                  @update:model-value="(v) => settingsStore.updateSettings({ oledCursorBrightness: Number(v) })"
                />
              </div>
            </template>
          </van-cell>

        </van-cell-group>
      </div>
      <div class="bg-surface rounded-xl overflow-hidden">
        <van-cell-group :border="false" title="数据管理">
          <van-cell
            title="导入 TXT 文件"
            icon="upgrade"
            is-link
            @click="router.push('/import')"
          />
          <van-cell
            title="书架管理"
            icon="bookmark-o"
            is-link
            @click="router.push('/shelf')"
          />
          <van-cell title="清除缓存" icon="delete-o" is-link @click="clearCache" />
        </van-cell-group>
      </div>

      <!-- 屏蔽设置 -->
      <div class="bg-surface rounded-xl overflow-hidden">
        <van-cell-group :border="false" title="屏蔽设置">
          <van-cell
            title="屏蔽管理"
            icon="closed-eye"
            is-link
            :value="`${blockStore.blockedAuthors.length} 作者 / ${blockStore.blockedTags.length + blockStore.blockedTagSubstrings.length} 标签`"
            @click="router.push('/settings/blocked')"
          />
          <van-cell title="标签数量超过即屏蔽" center>
            <template #label>
              <span class="text-xs text-text-secondary">
                单篇文章 tag 数量大于此值则屏蔽，0 表示关闭
              </span>
            </template>
            <template #right-icon>
              <van-stepper
                :model-value="blockStore.maxTagCount"
                :min="0"
                :max="50"
                integer
                @update:model-value="(v) => blockStore.setMaxTagCount(Number(v))"
              />
            </template>
          </van-cell>
          <van-cell title="单个标签长度超过即屏蔽" center>
            <template #label>
              <span class="text-xs text-text-secondary">
                单个 tag 字符数大于此值则屏蔽，0 表示关闭
              </span>
            </template>
            <template #right-icon>
              <van-stepper
                :model-value="blockStore.maxTagLength"
                :min="0"
                :max="100"
                integer
                @update:model-value="(v) => blockStore.setMaxTagLength(Number(v))"
              />
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <!-- 关于 -->
      <div class="bg-surface rounded-xl overflow-hidden">
        <van-cell-group :border="false">
          <van-cell title="版本" value="1.0.0" icon="info-o" />
          <van-cell title="PX-Reader" value="Pixiv 小说阅读器" />
        </van-cell-group>
      </div>
    </div>

    <!-- 字体选择 -->
    <van-popup
      v-model:show="showFontPicker"
      teleport="body"
      round
      closeable
      class="center-modal center-modal--scroll-aware"
      :style="{ width: '92vw', maxWidth: '460px', top: popupViewportTop }"
    >
      <div class="center-modal__header">选择字体</div>
      <div class="p-4 pt-2 space-y-2 center-modal__content">
        <van-button
          v-for="f in fontOptions"
          :key="f.value"
          block
          :type="settings.fontFamily === f.value ? 'primary' : 'default'"
          @click="settingsStore.updateSettings({ fontFamily: f.value as any }); showFontPicker = false"
        >
          {{ f.label }}
        </van-button>
      </div>
    </van-popup>

    <!-- 主题选择 -->
    <van-popup
      v-model:show="showThemePicker"
      teleport="body"
      round
      closeable
      class="center-modal center-modal--scroll-aware"
      :style="{ width: '92vw', maxWidth: '460px', top: popupViewportTop }"
    >
      <div class="center-modal__header">选择主题</div>
      <div class="p-4 pt-2 space-y-2 center-modal__content">
        <van-button
          v-for="t in themeOptions"
          :key="t.value"
          block
          :type="settings.theme === t.value ? 'primary' : 'default'"
          @click="settingsStore.updateSettings({ theme: t.value as any }); showThemePicker = false"
        >
          {{ t.label }}
        </van-button>
      </div>
    </van-popup>

    <!-- 翻译配置 -->
    <van-popup
      v-model:show="showTranslationConfig"
      teleport="body"
      round
      closeable
      class="center-modal center-modal--scroll-aware"
      :style="{ width: '92vw', maxWidth: '560px', top: popupViewportTop }"
    >
      <div class="center-modal__header">翻译配置</div>
      <div class="p-4 pt-2 space-y-3 center-modal__content">
        <van-field
          v-model="translationApiUrlInput"
          label="接口地址"
          placeholder="https://your-deeplx/translate"
          autosize
        />
        <div class="flex gap-2">
          <van-button block plain @click="showTranslationConfig = false">取消</van-button>
          <van-button block type="primary" @click="saveTranslationConfig">保存</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 源语言选择 -->
    <van-popup
      v-model:show="showTranslationSourcePicker"
      teleport="body"
      round
      closeable
      class="center-modal center-modal--scroll-aware"
      :style="{ width: '92vw', maxWidth: '460px', top: popupViewportTop }"
    >
      <div class="center-modal__header">选择源语言</div>
      <div class="p-4 pt-2 space-y-2 center-modal__content">
        <van-button
          v-for="opt in translationLanguageOptions"
          :key="opt.value"
          block
          :type="settings.translationSourceLang === opt.value ? 'primary' : 'default'"
          @click="settingsStore.updateSettings({ translationSourceLang: opt.value }); showTranslationSourcePicker = false"
        >
          {{ opt.label }}
        </van-button>
      </div>
    </van-popup>

    <!-- 目标语言选择 -->
    <van-popup
      v-model:show="showTranslationTargetPicker"
      teleport="body"
      round
      closeable
      class="center-modal center-modal--scroll-aware"
      :style="{ width: '92vw', maxWidth: '460px', top: popupViewportTop }"
    >
      <div class="center-modal__header">选择目标语言</div>
      <div class="p-4 pt-2 space-y-2 center-modal__content">
        <van-button
          v-for="opt in translationLanguageOptions"
          :key="opt.value"
          block
          :type="settings.translationTargetLang === opt.value ? 'primary' : 'default'"
          @click="settingsStore.updateSettings({ translationTargetLang: opt.value }); showTranslationTargetPicker = false"
        >
          {{ opt.label }}
        </van-button>
      </div>
    </van-popup>

    <!-- 术语管理 -->
    <van-popup
      v-model:show="showGlossaryManager"
      teleport="body"
      round
      closeable
      class="center-modal center-modal--scroll-aware"
      :style="{ width: '92vw', maxWidth: '640px', top: popupViewportTop }"
    >
      <div class="center-modal__header">术语管理</div>
      <div class="p-4 pt-2 space-y-3 center-modal__content">
        <div v-if="glossaryDraft.length === 0" class="text-sm text-text-secondary text-center py-6">
          暂无术语
        </div>
        <div
          v-for="(item, index) in glossaryDraft"
          :key="index"
          class="space-y-2 rounded-lg border border-border p-3"
        >
          <van-field
            v-model="item.source"
            label="原文"
            placeholder="原文术语"
            autosize
          />
          <van-field
            v-model="item.target"
            label="译名"
            placeholder="对应译名"
            autosize
          />
          <div class="flex justify-end">
            <van-button size="small" plain type="danger" @click="removeGlossaryDraft(index)">
              删除
            </van-button>
          </div>
        </div>
        <div class="flex gap-2">
          <van-button block plain @click="addGlossaryDraft">新增术语</van-button>
          <van-button block type="primary" @click="saveGlossaryManager">保存</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 手动填写 refresh_token -->
    <van-popup
      v-model:show="showManualLogin"
      teleport="body"
      round
      closeable
      class="manual-login-sheet center-modal center-modal--scroll-aware"
      :style="{ width: '92vw', maxWidth: '560px', top: popupViewportTop }"
      :lock-scroll="false"
    >
      <div class="center-modal__header">手动登录</div>
      <div class="p-4 pt-2 space-y-3 manual-login-sheet__content center-modal__content">
        <div class="bg-orange-500/10 border border-orange-500/40 rounded-lg p-3 text-xs leading-relaxed text-text">
          <p class="font-medium mb-1">使用说明</p>
          <p class="text-text-secondary">
            仅在无法完成正常 OAuth 流程时使用。你需要提前通过其他工具（如 pixivpy / pixiv_auth.py）获取 refresh_token，粘贴到下方。存储在本地 localStorage，请勿在公共设备使用。
          </p>
        </div>
        <van-field
          v-model="manualToken"
          label="refresh_token"
          type="textarea"
          rows="3"
          autosize
          placeholder="貌似： XxXxXxXx-xxxxxxxxxxxxxxxxxxxxxx"
          :disabled="authStore.loading"
          @focus="onManualTokenFocus"
        />
        <div class="flex gap-2">
          <van-button block plain @click="showManualLogin = false">取消</van-button>
          <van-button
            block
            type="primary"
            :loading="authStore.loading"
            loading-text="验证中..."
            :disabled="!manualToken.trim()"
            @click="submitManualLogin"
          >
            验证并登录
          </van-button>
        </div>
      </div>
    </van-popup>

    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { useAuthStore, useSettingsStore, useBlockStore } from '@/stores'
import NavBar from '@/components/NavBar.vue'
import TabBar from '@/components/TabBar.vue'

const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const blockStore = useBlockStore()
const settings = computed(() => settingsStore.settings)

const showFontPicker = ref(false)
const showThemePicker = ref(false)
const showTranslationConfig = ref(false)
const showTranslationSourcePicker = ref(false)
const showTranslationTargetPicker = ref(false)
const showGlossaryManager = ref(false)
const showManualLogin = ref(false)
const manualToken = ref('')
const translationApiUrlInput = ref('')
const glossaryDraft = ref<Array<{ source: string; target: string }>>([])
const popupViewportTop = ref('50%')
const settingsScrollRef = ref<HTMLElement | null>(null)

let prevHtmlOverflow = ''
let prevBodyOverflow = ''

let popupPositionBound = false

function updatePopupViewportTop() {
  const vv = window.visualViewport
  if (vv) {
    popupViewportTop.value = `${window.scrollY + vv.offsetTop + vv.height / 2}px`
    return
  }
  popupViewportTop.value = `${Math.max(0, window.scrollY) + window.innerHeight / 2}px`
}

function bindPopupPositionEvents() {
  if (popupPositionBound) return
  popupPositionBound = true
  window.addEventListener('scroll', updatePopupViewportTop, { passive: true })
  window.addEventListener('resize', updatePopupViewportTop)
  window.visualViewport?.addEventListener('resize', updatePopupViewportTop)
}

function unbindPopupPositionEvents() {
  if (!popupPositionBound) return
  popupPositionBound = false
  window.removeEventListener('scroll', updatePopupViewportTop)
  window.removeEventListener('resize', updatePopupViewportTop)
  window.visualViewport?.removeEventListener('resize', updatePopupViewportTop)
}

watch(
  () => [showFontPicker.value, showThemePicker.value, showTranslationConfig.value, showTranslationSourcePicker.value, showTranslationTargetPicker.value, showGlossaryManager.value, showManualLogin.value],
  (flags) => {
    const visible = flags.some(Boolean)
    if (visible) {
      updatePopupViewportTop()
      bindPopupPositionEvents()
      return
    }
    unbindPopupPositionEvents()
  },
)

// 当启用 OLED 极端黑色模式时，自动关闭暖色滤镜以避免橙色闪烁
watch(
  () => settings.value.oledExtremeBlack,
  (enabled) => {
    if (enabled && settings.value.hdrWarmFilter && settings.value.hdrWarmFilter > 0) {
      settingsStore.updateSettings({ hdrWarmFilter: 0 })
    }
  },
)

onBeforeUnmount(() => {
  unbindPopupPositionEvents()
  document.documentElement.style.overflow = prevHtmlOverflow
  document.body.style.overflow = prevBodyOverflow
})

onMounted(() => {
  prevHtmlOverflow = document.documentElement.style.overflow
  prevBodyOverflow = document.body.style.overflow
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
  translationApiUrlInput.value = settings.value.translationApiUrl || ''
  settingsScrollRef.value?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
})

const fontOptions = [
  { label: '黑体 (Noto Sans SC)', value: 'sans' },
  { label: '宋体 (Noto Serif SC)', value: 'serif' },
  { label: '等宽 (JetBrains Mono)', value: 'mono' },
]

const themeOptions = [
  { label: '深色模式', value: 'dark' },
  { label: '浅色模式', value: 'light' },
  { label: '护眼模式', value: 'sepia' },
]

const translationLanguageOptions = [
  { label: '自动检测', value: 'auto' },
  { label: '简体中文', value: 'ZH' },
  { label: '繁體中文', value: 'ZH-HANT' },
  { label: 'English', value: 'EN' },
  { label: '日本語', value: 'JA' },
  { label: '한국어', value: 'KO' },
  { label: 'Français', value: 'FR' },
  { label: 'Deutsch', value: 'DE' },
  { label: 'Español', value: 'ES' },
  { label: 'Italiano', value: 'IT' },
  { label: 'Português', value: 'PT' },
  { label: 'Русский', value: 'RU' },
]

const fontLabel = computed(() => {
  const f = fontOptions.find((o) => o.value === settings.value.fontFamily)
  return f?.label || '宋体'
})

const translationSourceLabel = computed(() => {
  const opt = translationLanguageOptions.find((o) => o.value === settings.value.translationSourceLang)
  return opt?.label || '自动检测'
})

const translationTargetLabel = computed(() => {
  const opt = translationLanguageOptions.find((o) => o.value === settings.value.translationTargetLang)
  return opt?.label || '中文'
})

const translationGlossary = computed(() => settings.value.translationGlossary || [])

const themeLabel = computed(() => {
  const t = themeOptions.find((o) => o.value === settings.value.theme)
  return t?.label || '深色模式'
})

function saveTranslationConfig() {
  settingsStore.updateSettings({
    translationApiUrl: translationApiUrlInput.value.trim(),
  })
  showTranslationConfig.value = false
  showToast('翻译配置已保存')
}

function openGlossaryManager() {
  glossaryDraft.value = translationGlossary.value.map((item) => ({ ...item }))
  showGlossaryManager.value = true
}

function addGlossaryDraft() {
  glossaryDraft.value.push({ source: '', target: '' })
}

function removeGlossaryDraft(index: number) {
  glossaryDraft.value.splice(index, 1)
}

function saveGlossaryManager() {
  const glossary = glossaryDraft.value
    .map((item) => ({ source: item.source.trim(), target: item.target.trim() }))
    .filter((item) => item.source && item.target)
  settingsStore.updateSettings({ translationGlossary: glossary })
  showGlossaryManager.value = false
  showToast(`已保存 ${glossary.length} 条术语`)
}

function adjustFontSize(delta: number) {
  const v = Math.max(12, Math.min(32, settings.value.fontSize + delta))
  settingsStore.updateSettings({ fontSize: v })
}

function adjustLineHeight(delta: number) {
  const v = Math.max(1.2, Math.min(3.0, +(settings.value.lineHeight + delta).toFixed(1)))
  settingsStore.updateSettings({ lineHeight: v })
}

async function clearCache() {
  try {
    await showConfirmDialog({ title: '清除缓存', message: '确定要清除所有缓存数据吗？' })
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
    showToast('缓存已清除')
  } catch {
    // 取消
  }
}

async function submitManualLogin() {
  const rt = manualToken.value.trim()
  if (!rt) return
  const ok = await authStore.loginManual(rt)
  if (ok) {
    showToast('登录成功')
    manualToken.value = ''
    showManualLogin.value = false
  } else {
    showToast(authStore.error || '验证失败，请检查 refresh_token')
  }
}

async function onLogout() {
  try {
    await showConfirmDialog({
      title: '退出登录',
      message: '确定退出吗？本地 token 将被清除。',
    })
    authStore.logout()
    showToast('已退出登录')
  } catch {
    // 取消
  }
}

function onManualTokenFocus(event: Event) {
  const target = event.target as HTMLElement | null
  if (!target) return
  // 兼容 Android WebView：键盘弹出后主动把输入区滚动到可视区域
  window.setTimeout(() => {
    target.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, 180)
}
</script>

<template>
  <div class="settings-view min-h-screen bg-bg">
    <NavBar title="设置" />

    <div class="p-4 space-y-4">
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
            v-if="settings.hdrEyeCare"
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
        </van-cell-group>
      </div>

      <!-- 数据管理 -->
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
      class="center-modal"
      :style="{ width: '92vw', maxWidth: '460px' }"
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
      class="center-modal"
      :style="{ width: '92vw', maxWidth: '460px' }"
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

    <!-- 手动填写 refresh_token -->
    <van-popup
      v-model:show="showManualLogin"
      teleport="body"
      round
      closeable
      class="manual-login-sheet center-modal"
      :style="{ width: '92vw', maxWidth: '560px' }"
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
import { ref, computed } from 'vue'
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
const showManualLogin = ref(false)
const manualToken = ref('')

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

const fontLabel = computed(() => {
  const f = fontOptions.find((o) => o.value === settings.value.fontFamily)
  return f?.label || '宋体'
})

const themeLabel = computed(() => {
  const t = themeOptions.find((o) => o.value === settings.value.theme)
  return t?.label || '深色模式'
})

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

<template>
  <div class="reader-view min-h-screen bg-bg">
    <!-- 顶部控制区 -->
    <transition name="fade">
      <div v-show="showControls" class="fixed top-0 left-0 right-0 z-50">
        <van-nav-bar
          :title="novelTitle"
          left-arrow
          @click-left="goBack"
          :border="false"
          class="safe-top"
          :style="{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }"
        >
          <template #right>
            <div class="flex items-center gap-3">
              <van-icon
                name="down"
                size="20"
                class="text-text"
                @click="downloadNovel"
              />
              <van-icon
                :name="isInShelf ? 'bookmark' : 'bookmark-o'"
                size="20"
                :class="isInShelf ? 'text-primary' : 'text-text'"
                @click="toggleShelf"
              />
              <van-icon name="ellipsis" size="20" class="text-text" @click="showMenu = true" />
            </div>
          </template>
        </van-nav-bar>

        <!-- 作品信息 -->
        <div v-if="novelMeta" class="bg-surface/95 backdrop-blur-sm px-4 pt-3 pb-4 border-b border-border">
          <div class="flex items-start justify-between gap-3">
            <h1 class="text-text text-base font-bold leading-snug flex-1">{{ novelMeta.title }}</h1>
            <van-button
              size="small"
              :type="novelMeta.is_bookmarked ? 'warning' : 'primary'"
              :loading="bookmarkLoading"
              round
              @click.stop
              @pointerdown.stop="onBookmarkPress"
              @pointerup.stop="onBookmarkRelease"
              @pointerleave.stop="onBookmarkCancel"
              @pointercancel.stop="onBookmarkCancel"
            >
              {{ novelMeta.is_bookmarked ? '已收藏' : '收藏' }}
            </van-button>
          </div>
          <div
            class="flex items-center gap-2 mt-2 cursor-pointer w-fit"
            @click.stop="goToAuthor"
          >
            <img
              v-if="authorAvatar"
              :src="authorAvatar"
              class="w-6 h-6 rounded-full object-cover"
            />
            <span class="text-text text-sm hover:text-primary transition-colors">
              {{ novelMeta.user?.name }}
            </span>
            <van-icon name="arrow" size="12" class="text-text-secondary" />
          </div>
          <div
            v-if="novelMeta.series?.id"
            class="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full bg-bg text-text-secondary text-xs cursor-pointer"
            @click.stop="goToSeries"
          >
            <van-icon name="orders-o" size="12" />
            <span class="text-ellipsis max-w-64">{{ novelMeta.series.title }}</span>
            <van-icon name="arrow" size="10" />
          </div>
          <NovelStats
            :text-length="novelMeta.text_length"
            :bookmarks="novelMeta.total_bookmarks"
            :views="novelMeta.total_view"
            :comments="novelMeta.total_comments"
            size="sm"
            class="mt-2"
          />
          <p
            v-if="novelMeta.caption"
            class="text-text-secondary text-xs mt-2 leading-relaxed line-clamp-2"
            v-html="novelMeta.caption"
          />
          <NovelTags
            v-if="novelMeta.tags?.length"
            :tags="novelMeta.tags"
            :max="6"
            expandable
            show-translated
            size="sm"
            class="mt-2"
          />
        </div>
      </div>
    </transition>

    <!-- 加载中 -->
    <div v-if="loading" class="h-screen flex-center">
      <van-loading type="spinner" color="var(--color-primary)" size="40" vertical>
        加载中...
      </van-loading>
    </div>

    <!-- 加载失败（未登录且服务端无备用 token，或受限浏览器） -->
    <div v-else-if="!loading && loadError && !content" class="h-screen flex-center flex-col gap-4 px-8">
      <van-icon name="warning-o" size="48" class="text-text-secondary" />
      <p class="text-text-secondary text-sm text-center leading-relaxed">{{ loadError }}</p>
      <!-- QQ / 微信：提示在浏览器中打开；其他情况：跳转登录 -->
      <template v-if="isRestrictedBrowserEnv">
        <p class="text-xs text-text-secondary text-center">
          请点击右上角菜单 → <strong>在浏览器中打开</strong>，然后登录即可查看
        </p>
      </template>
      <template v-else>
        <van-button type="primary" round @click="() => $router.push('/login')">登录后查看</van-button>
      </template>
    </div>

    <!-- 正文 -->
    <div
      v-else
      ref="contentRef"
      class="reader-body h-screen overflow-y-auto"
      :style="settingsStore.cssVars"
      @click="onContentClick"
      @contextmenu.prevent="onContextMenu"
      @scroll="updateProgress"
    >
      <!-- 章节导航：仅在有多章且检测到自然章节标题时显示（字数兜底划分不展示） -->
      <div
        v-if="chapters.length > 1 && hasNaturalChapters && settingsStore.settings.showChapterNav"
        class="sticky top-0 z-10 bg-surface/90 backdrop-blur-sm border-b border-border"
      >
        <div class="flex overflow-x-auto gap-2 p-2 no-scrollbar">
          <button
            v-for="(ch, i) in chapters"
            :key="i"
            class="flex-shrink-0 px-3 py-1.5 rounded-full text-xs transition-colors whitespace-nowrap"
            :class="i === activeChapter ? 'bg-primary text-white' : 'bg-bg text-text-secondary'"
            @click.stop="scrollToChapter(i)"
          >
            {{ ch.title }}
          </button>
        </div>
      </div>

      <!-- 正文内容 -->
      <div class="p-4 pb-32">
        <div
          v-for="(ch, i) in chapters"
          :key="i"
          :ref="(el) => setChapterRef(i, el as HTMLElement)"
          class="chapter-block mb-8"
        >
          <h2
            v-if="chapters.length > 1 && hasNaturalChapters"
            class="font-bold mb-4 text-text"
            :style="{ fontSize: `calc(var(--reader-font-size, 18px) * 1.3)` }"
          >
            {{ ch.title }}
          </h2>
          <div
            class="whitespace-pre-wrap text-text"
            :style="{
              fontSize: 'var(--reader-font-size, 18px)',
              lineHeight: 'var(--reader-line-height, 1.8)',
              fontFamily: 'var(--reader-font-family, serif)',
            }"
          >
            <template v-for="(tok, ti) in chapterTokens(ch)" :key="ti">
              <template v-if="tok.type === 'text'">{{ tok.value }}</template>
              <template v-else-if="tok.type === 'newpage'">
                <hr class="my-6 border-border" />
              </template>
              <h3
                v-else-if="tok.type === 'chapter'"
                class="font-bold my-4 text-text"
                :style="{ fontSize: `calc(var(--reader-font-size, 18px) * 1.2)` }"
              >
                {{ tok.title }}
              </h3>
              <ruby v-else-if="tok.type === 'rb'">
                {{ tok.base }}<rt>{{ tok.ruby }}</rt>
              </ruby>
              <a
                v-else-if="tok.type === 'jumpuri'"
                :href="tok.url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary underline"
              >{{ tok.text }}</a>
              <img
                v-else-if="tok.type === 'pixivimage' && resolveIllust(tok.illustId, tok.page)"
                :src="resolveIllust(tok.illustId, tok.page) || ''"
                :alt="`pixivimage:${tok.illustId}-${tok.page}`"
                class="block max-w-full my-4 rounded mx-auto"
                loading="lazy"
              />
              <span
                v-else-if="tok.type === 'pixivimage'"
                class="inline-block px-2 py-1 my-2 rounded bg-bg text-text-secondary text-xs"
              >[pixivimage:{{ tok.illustId }}-{{ tok.page }}]</span>
              <img
                v-else-if="tok.type === 'uploadedimage' && resolveUploaded(tok.imageId)"
                :src="resolveUploaded(tok.imageId) || ''"
                :alt="`uploadedimage:${tok.imageId}`"
                class="block max-w-full my-4 rounded mx-auto"
                loading="lazy"
              />
              <span
                v-else-if="tok.type === 'uploadedimage'"
                class="inline-block px-2 py-1 my-2 rounded bg-bg text-text-secondary text-xs"
              >[uploadedimage:{{ tok.imageId }}]</span>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部控制栏 -->
    <transition name="fade">
      <div
        v-show="showControls"
        class="fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-sm safe-bottom"
      >
        <!-- 进度条 -->
        <div class="px-4 pt-3 flex items-center gap-3">
          <span class="text-xs text-text-secondary w-8 text-right">{{ scrollPercent }}%</span>
          <van-slider
            v-model="scrollPercent"
            :min="0"
            :max="100"
            active-color="var(--color-primary)"
            @change="onSliderChange"
          />
          <span
            v-if="chapters.length > 1 && hasNaturalChapters"
            class="text-xs text-text-secondary w-12"
          >
            {{ activeChapter + 1 }}/{{ chapters.length }}
          </span>
        </div>

        <!-- 操作按钮 -->
        <div class="flex items-center justify-around py-3 px-4">
          <div
            v-if="showPrevButton"
            class="flex-col-center cursor-pointer"
            @click="prevChapter"
          >
            <van-icon name="arrow-left" size="20" class="text-text" />
            <span class="text-xs text-text-secondary mt-1">{{ prevButtonText }}</span>
          </div>
          <div class="flex-col-center cursor-pointer" @click="showSettings = true">
            <van-icon name="font-o" size="20" class="text-text" />
            <span class="text-xs text-text-secondary mt-1">设置</span>
          </div>
          <div class="flex-col-center cursor-pointer" @click="showBookmarkDialog">
            <van-icon name="bookmark-o" size="20" class="text-text" />
            <span class="text-xs text-text-secondary mt-1">书签</span>
          </div>
          <div
            v-if="showNextButton"
            class="flex-col-center cursor-pointer"
            @click="nextChapter"
          >
            <van-icon name="arrow" size="20" class="text-text" />
            <span class="text-xs text-text-secondary mt-1">{{ nextButtonText }}</span>
          </div>
        </div>
      </div>
    </transition>

    <!-- 设置面板 -->
    <van-popup
      v-model:show="showSettings"
      teleport="body"
      round
      closeable
      class="center-modal reader-settings-modal"
      :style="{ width: '92vw', maxWidth: '720px' }"
    >
      <div class="center-modal__header">阅读设置</div>
      <div class="p-4 pt-2 space-y-5 center-modal__content">
        <!-- 字号 -->
        <div>
          <div class="flex-between mb-2">
            <span class="text-sm text-text">字号</span>
            <span class="text-sm text-text-secondary">{{ settingsStore.settings.fontSize }}px</span>
          </div>
          <van-slider
            :model-value="settingsStore.settings.fontSize"
            :min="12"
            :max="32"
            :step="1"
            active-color="var(--color-primary)"
            @change="(v: number) => settingsStore.updateSettings({ fontSize: v })"
          />
        </div>

        <!-- 行高 -->
        <div>
          <div class="flex-between mb-2">
            <span class="text-sm text-text">行高</span>
            <span class="text-sm text-text-secondary">{{ settingsStore.settings.lineHeight }}</span>
          </div>
          <van-slider
            :model-value="settingsStore.settings.lineHeight"
            :min="1.2"
            :max="3.0"
            :step="0.1"
            active-color="var(--color-primary)"
            @change="(v: number) => settingsStore.updateSettings({ lineHeight: v })"
          />
        </div>

        <!-- 字体 -->
        <div>
          <span class="text-sm text-text mb-2 block">字体</span>
          <div class="flex gap-2">
            <van-button
              v-for="f in fontOptions"
              :key="f.value"
              size="small"
              :type="settingsStore.settings.fontFamily === f.value ? 'primary' : 'default'"
              @click="settingsStore.updateSettings({ fontFamily: f.value as any })"
            >
              {{ f.label }}
            </van-button>
          </div>
        </div>

        <!-- 主题 -->
        <div>
          <span class="text-sm text-text mb-2 block">主题</span>
          <div class="flex gap-3">
            <div
              v-for="t in themeOptions"
              :key="t.value"
              class="w-10 h-10 rounded-full cursor-pointer border-2 transition-transform"
              :class="settingsStore.settings.theme === t.value ? 'border-primary scale-110' : 'border-transparent'"
              :style="{ backgroundColor: t.color }"
              @click="settingsStore.updateSettings({ theme: t.value as any })"
            />
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 标签收藏 Dialog -->
    <van-popup
      v-model:show="showTagDialog"
      teleport="body"
      round
      closeable
      class="center-modal"
      :style="{ width: '88vw', maxWidth: '480px' }"
    >
      <div class="center-modal__header">添加收藏标签</div>
      <div class="p-4 pt-2 space-y-4 center-modal__content">
        <!-- 已有标签选择 -->
        <div v-if="existingTags.length > 0">
          <span class="text-xs text-text-secondary mb-2 block">已有标签</span>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="t in existingTags"
              :key="t.name"
              class="px-3 py-1 rounded-full text-xs cursor-pointer transition-colors"
              :class="isTagSelected(t.name) ? 'bg-primary text-white' : 'bg-bg text-text-secondary border border-border'"
              @click="toggleTag(t.name)"
            >{{ t.name }}</span>
          </div>
        </div>

        <!-- 已选标签 -->
        <div v-if="selectedTags.length > 0">
          <span class="text-xs text-text-secondary mb-2 block">已选标签</span>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="t in selectedTags"
              :key="t"
              class="px-3 py-1 rounded-full text-xs bg-primary/20 text-primary border border-primary/30 flex items-center gap-1"
            >
              {{ t }}
              <van-icon name="cross" size="10" class="cursor-pointer" @click="removeTag(t)" />
            </span>
          </div>
        </div>

        <!-- 新增标签输入 -->
        <div>
          <span class="text-xs text-text-secondary mb-2 block">新增标签</span>
          <div class="flex gap-2">
            <input
              v-model="newTagInput"
              class="flex-1 px-3 py-2 rounded-lg text-sm bg-bg text-text border border-border outline-none focus:border-primary transition-colors"
              placeholder="输入标签名，回车添加"
              @keyup.enter="addNewTag"
            />
            <van-button size="small" @click="addNewTag">添加</van-button>
          </div>
        </div>

        <van-button
          type="primary"
          block
          round
          :loading="bookmarkLoading"
          @click="confirmTagBookmark"
        >
          {{ novelMeta?.is_bookmarked ? '更新收藏' : '确认收藏' }}
        </van-button>
      </div>
    </van-popup>

    <!-- 菜单 -->
    <van-popup
      v-model:show="showMenu"
      teleport="body"
      round
      closeable
      class="center-modal"
      :style="{ width: '86vw', maxWidth: '420px' }"
    >
      <div class="center-modal__header">菜单</div>
      <div class="p-4 pt-2 space-y-2 center-modal__content">
        <van-button
          v-for="action in menuActions"
          :key="action.value"
          block
          @click="onMenuSelect(action)"
        >
          {{ action.name }}
        </van-button>
        <van-button block plain @click="showMenu = false">取消</van-button>
      </div>
    </van-popup>

    <!-- 右键菜单 - 未选中文字：快捷阅读设置 -->
    <teleport to="body">
      <div
        v-if="showContextMenu && !hasSelection"
        class="context-menu-overlay"
        @click="closeContextMenu"
      >
        <div
          class="context-menu-panel"
          :style="{ left: contextMenuPos.x + 'px', top: contextMenuPos.y + 'px' }"
          @click.stop
        >
          <div class="context-menu-section">
            <span class="context-menu-label">全文转换</span>
            <div class="flex gap-2">
              <button class="ctx-action-btn ctx-action-btn--compact" @click="convertFullText('t2s')">
                <span>转简体</span>
              </button>
              <button class="ctx-action-btn ctx-action-btn--compact" @click="convertFullText('s2t')">
                <span>转繁体</span>
              </button>
            </div>
          </div>
          <div class="context-menu-section">
            <span class="context-menu-label">翻译全文</span>
            <button class="ctx-action-btn ctx-action-btn--compact" @click="toggleTranslationPanel">
              <van-icon name="comment-o" size="14" />
              <span>{{ showTranslationPanel ? '收起设置' : '翻译设置' }}</span>
            </button>
            <div v-if="showTranslationPanel" class="mt-2 space-y-2">
              <input
                v-model="translationApiUrl"
                class="ctx-replace-input"
                placeholder="https://your-deeplx/translate"
              />
              <div class="flex gap-2">
                <select v-model="translationSourceLang" class="ctx-select">
                  <option v-for="opt in translationLanguageOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
                <select v-model="translationTargetLang" class="ctx-select">
                  <option v-for="opt in translationLanguageOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>
              <button class="ctx-action-btn ctx-action-btn--compact" :disabled="translationLoading" @click="translateFullText">
                <span>{{ translationLoading ? '翻译中…' : '开始翻译' }}</span>
              </button>
              <button
                v-if="originalContentSnapshot"
                class="ctx-action-btn ctx-action-btn--compact"
                :disabled="translationLoading"
                @click="restoreOriginalContent"
              >
                <span>还原原文</span>
              </button>
            </div>
          </div>
          <div class="context-menu-section">
            <span class="context-menu-label">字号</span>
            <div class="flex items-center gap-2">
              <van-button
                size="small"
                icon="minus"
                :disabled="settingsStore.settings.fontSize <= 12"
                @click="adjustFontSize(-1)"
              />
              <span class="text-sm text-text font-medium w-10 text-center">
                {{ settingsStore.settings.fontSize }}
              </span>
              <van-button
                size="small"
                icon="plus"
                :disabled="settingsStore.settings.fontSize >= 32"
                @click="adjustFontSize(1)"
              />
            </div>
          </div>
          <div class="context-menu-section">
            <span class="context-menu-label">字体</span>
            <div class="flex gap-1">
              <button
                v-for="f in fontOptions"
                :key="f.value"
                class="ctx-font-btn"
                :class="{ active: settingsStore.settings.fontFamily === f.value }"
                @click="settingsStore.updateSettings({ fontFamily: f.value as any })"
              >
                {{ f.label }}
              </button>
            </div>
          </div>
          <div class="context-menu-section">
            <span class="context-menu-label">主题</span>
            <div class="flex gap-2">
              <div
                v-for="t in themeOptions"
                :key="t.value"
                class="ctx-theme-dot"
                :class="{ active: settingsStore.settings.theme === t.value }"
                :style="{ backgroundColor: t.color }"
                :title="t.label"
                @click="settingsStore.updateSettings({ theme: t.value as any })"
              />
            </div>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 右键菜单 - 已选中文字：文本处理 -->
    <teleport to="body">
      <div
        v-if="showContextMenu && hasSelection"
        class="context-menu-overlay"
        @click="closeContextMenu"
      >
        <div
          class="context-menu-panel"
          :style="{ left: contextMenuPos.x + 'px', top: contextMenuPos.y + 'px' }"
          @click.stop
        >
          <div class="context-menu-section">
            <span class="text-xs text-text-secondary truncate max-w-48 mb-2 block">
              已选中: "{{ truncatedSelection }}"
            </span>
          </div>
          <button class="ctx-action-btn" @click="convertSelection('t2s')">
            <van-icon name="success" size="16" />
            <span>转为简体</span>
          </button>
          <button class="ctx-action-btn" @click="convertSelection('s2t')">
            <van-icon name="exchange" size="16" />
            <span>转为繁体</span>
          </button>
          <button class="ctx-action-btn" @click="openGlossaryDialog">
            <van-icon name="records-o" size="16" />
            <span>加入翻译术语库</span>
          </button>
          <button class="ctx-action-btn" @click="openReplaceDialog">
            <van-icon name="exchange" size="16" />
            <span>替换</span>
          </button>
          <button class="ctx-action-btn ctx-action-btn--danger" @click="confirmRemoveSelection">
            <van-icon name="delete-o" size="16" />
            <span>剔除</span>
          </button>
        </div>
      </div>
    </teleport>

    <!-- 替换对话框 -->
    <van-dialog
      v-model:show="showReplaceDialog"
      title="替换文本"
      show-cancel-button
      :before-close="onReplaceConfirm"
    >
      <div class="p-4">
        <div class="text-xs text-text-secondary mb-2">
          将文中所有 "<span class="text-primary">{{ truncatedSelection }}</span>" 替换为:
        </div>
        <input
          v-model="replaceInput"
          class="ctx-replace-input"
          placeholder="输入替换后的文本（留空即剔除）"
          @keyup.enter="onReplaceConfirm('confirm')"
        />
      </div>
    </van-dialog>

    <!-- 翻译术语库 -->
    <van-dialog
      v-model:show="showGlossaryDialog"
      title="加入翻译术语库"
      show-cancel-button
      :before-close="onGlossaryConfirm"
    >
      <div class="p-4 space-y-3">
        <input
          v-model="glossarySourceInput"
          class="ctx-replace-input"
          placeholder="原文术语"
        />
        <input
          v-model="glossaryTargetInput"
          class="ctx-replace-input"
          placeholder="对应译名"
          @keyup.enter="onGlossaryConfirm('confirm')"
        />
      </div>
    </van-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useNovelStore, useSettingsStore, useShelfStore, useAuthStore } from '@/stores'
import { splitChaptersInWorker } from '@/workers'
import { getTxtCache } from '@/db'
import { getProxiedImageUrl, bookmarkNovel, unbookmarkNovel, getBookmarkDetail, translateWithDeepLX } from '@/api'
import { usePageTitle } from '@/composables'
import {
  parseNovelMarkup,
  resolvePixivImageUrl,
  resolveUploadedImageUrl,
  type NovelToken,
} from '@/utils/novelMarkup'
import { isRestrictedBrowser } from '@/utils/browser'
import { ApiError, type TxtChapter, type LocalNovelMeta, type NovelMeta } from '@/types'
import OpenCC from 'opencc-js'
import NovelTags from '@/components/NovelTags.vue'
import NovelStats from '@/components/NovelStats.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()
const novelStore = useNovelStore()
const settingsStore = useSettingsStore()
const shelfStore = useShelfStore()
const authStore = useAuthStore()

const loading = ref(true)
const loadError = ref<string | null>(null)
/** 是否处于 QQ / 微信内置浏览器（受限环境） */
const isRestrictedBrowserEnv = computed(() => isRestrictedBrowser())
const content = ref('')
const chapters = ref<TxtChapter[]>([])
/** 分章是否来自自然章节标题（vs 按字数兜底划分） */
const hasNaturalChapters = ref(false)
const novelTitle = ref('')
const showControls = ref(false)
const showSettings = ref(false)
const showMenu = ref(false)
const scrollPercent = ref(0)
const activeChapter = ref(0)
const isInShelf = ref(false)
const bookmarkLoading = ref(false)
const showTagDialog = ref(false)
const existingTags = ref<{ name: string }[]>([])
const selectedTags = ref<string[]>([])
const newTagInput = ref('')
const contentRef = ref<HTMLElement | null>(null)
const chapterRefs = ref<Map<number, HTMLElement>>(new Map())

// ── 右键菜单 ─────────────────────────────────────────
const showContextMenu = ref(false)
const contextMenuPos = ref({ x: 0, y: 0 })
const selectedText = ref('')
const hasSelection = ref(false)
const showReplaceDialog = ref(false)
const replaceInput = ref('')
const showGlossaryDialog = ref(false)
const glossarySourceInput = ref('')
const glossaryTargetInput = ref('')
const showTranslationPanel = ref(false)
const translationApiUrl = ref('')
const translationSourceLang = ref('auto')
const translationTargetLang = ref('ZH')
const translationLoading = ref(false)
const originalContentSnapshot = ref('')

const truncatedSelection = computed(() => {
  const s = selectedText.value
  return s.length > 30 ? s.slice(0, 30) + '...' : s
})

const openccConverters = {
  s2t: OpenCC.Converter({ from: 'cn', to: 'tw' }),
  t2s: OpenCC.Converter({ from: 'tw', to: 'cn' }),
}

interface GlossaryPlaceholder {
  placeholder: string
  source: string
  target: string
}

function onContextMenu(e: MouseEvent) {
  e.preventDefault()
  const sel = window.getSelection()
  const text = sel?.toString().trim() || ''
  selectedText.value = text
  hasSelection.value = text.length > 0

  // 调整菜单位置，确保不超出视口
  const menuW = 220
  const menuH = hasSelection.value ? 220 : 240
  let x = e.clientX
  let y = e.clientY
  if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 8
  if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 8
  contextMenuPos.value = { x, y }
  showContextMenu.value = true
}

function closeContextMenu() {
  showContextMenu.value = false
}

function inferBrowserTargetLanguage(): string {
  const lang = (navigator.language || 'en-US').toLowerCase()
  if (lang.startsWith('zh')) return 'ZH'
  if (lang.startsWith('ja')) return 'JA'
  if (lang.startsWith('ko')) return 'KO'
  if (lang.startsWith('fr')) return 'FR'
  if (lang.startsWith('de')) return 'DE'
  if (lang.startsWith('es')) return 'ES'
  if (lang.startsWith('it')) return 'IT'
  if (lang.startsWith('pt')) return 'PT'
  if (lang.startsWith('ru')) return 'RU'
  return 'EN'
}

function saveTranslationSettings() {
  settingsStore.updateSettings({
    translationApiUrl: translationApiUrl.value.trim(),
    translationSourceLang: translationSourceLang.value,
    translationTargetLang: translationTargetLang.value,
  })
}

function toggleTranslationPanel() {
  showTranslationPanel.value = !showTranslationPanel.value
  if (!showTranslationPanel.value) return
  translationApiUrl.value = settingsStore.settings.translationApiUrl || translationApiUrl.value
  translationSourceLang.value = settingsStore.settings.translationSourceLang || 'auto'
  translationTargetLang.value = settingsStore.settings.translationTargetLang || inferBrowserTargetLanguage()
}

function adjustFontSize(delta: number) {
  const fs = settingsStore.settings.fontSize + delta
  settingsStore.updateSettings({ fontSize: Math.max(12, Math.min(32, fs)) })
}

function openReplaceDialog() {
  showReplaceDialog.value = true
  replaceInput.value = ''
  closeContextMenu()
}

function openGlossaryDialog() {
  glossarySourceInput.value = selectedText.value.trim()
  glossaryTargetInput.value = ''
  showGlossaryDialog.value = true
  closeContextMenu()
}

function onGlossaryConfirm(action: 'confirm' | 'cancel') {
  if (action === 'cancel') {
    showGlossaryDialog.value = false
    return true
  }

  const source = glossarySourceInput.value.trim()
  const target = glossaryTargetInput.value.trim()
  if (!source || !target) {
    showToast('请填写原文术语和对应译名')
    return false
  }

  const glossary = [...(settingsStore.settings.translationGlossary || [])]
  const existing = glossary.find((item) => item.source === source)
  if (existing) existing.target = target
  else glossary.push({ source, target })
  settingsStore.updateSettings({ translationGlossary: glossary })
  showGlossaryDialog.value = false
  showToast('已加入翻译术语库')
  return true
}

async function convertSelection(mode: 't2s' | 's2t') {
  const search = selectedText.value
  if (!search) return

  const converter = openccConverters[mode]
  const converted = converter(search)
  content.value = content.value.split(search).join(converted)
  tokensCache.clear()

  const result = await splitChaptersInWorker(content.value, settingsStore.settings.chapterMaxChars)
  chapters.value = result.chapters
  hasNaturalChapters.value = result.hasNaturalSplits
  closeContextMenu()
  showToast(mode === 't2s' ? '已转换为简体' : '已转换为繁体')
}

async function convertFullText(mode: 't2s' | 's2t') {
  if (!content.value) return

  const converter = openccConverters[mode]
  content.value = converter(content.value)
  tokensCache.clear()

  const result = await splitChaptersInWorker(content.value, settingsStore.settings.chapterMaxChars)
  chapters.value = result.chapters
  hasNaturalChapters.value = result.hasNaturalSplits
  closeContextMenu()
  showToast(mode === 't2s' ? '全文已转换为简体' : '全文已转换为繁体')
}

function splitTextIntoTranslationBatches(text: string, maxChars = 5000): string[] {
  const lines = text.match(/.*(?:\r?\n|$)/g)?.filter((line) => line.length > 0) || []
  const batches: string[] = []
  let current = ''

  for (const line of lines) {
    if (!line.trim()) {
      current += line
      continue
    }

    if (current && current.length + line.length > maxChars) {
      batches.push(current)
      current = ''
    }

    if (line.length > maxChars) {
      batches.push(line)
      continue
    }

    current += line
  }

  if (current) batches.push(current)
  return batches
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function applyGlossaryPlaceholders(text: string): { text: string; placeholders: GlossaryPlaceholder[] } {
  const glossary = [...(settingsStore.settings.translationGlossary || [])]
    .filter((item) => item.source.trim() && item.target.trim())
    .sort((a, b) => b.source.length - a.source.length)
  let result = text
  const placeholders: GlossaryPlaceholder[] = []

  for (const [index, item] of glossary.entries()) {
    if (!result.includes(item.source)) continue
    const placeholder = `PXTERM${index.toString().padStart(4, '0')}`
    result = result.replace(new RegExp(escapeRegExp(item.source), 'g'), placeholder)
    placeholders.push({ placeholder, source: item.source, target: item.target })
  }

  return { text: result, placeholders }
}

function restoreGlossaryPlaceholders(text: string, placeholders: GlossaryPlaceholder[]): string {
  let result = text
  for (const item of placeholders) {
    result = result.replace(new RegExp(escapeRegExp(item.placeholder), 'g'), item.target)
  }
  return result
}

async function restoreOriginalContent() {
  if (!originalContentSnapshot.value) return

  content.value = originalContentSnapshot.value
  tokensCache.clear()
  const result = await splitChaptersInWorker(content.value, settingsStore.settings.chapterMaxChars)
  chapters.value = result.chapters
  hasNaturalChapters.value = result.hasNaturalSplits
  closeContextMenu()
  showToast('已还原原文')
}

async function translateFullText() {
  if (!content.value) return
  const url = translationApiUrl.value.trim()
  if (!url) {
    showToast('请先填写 DeepLX 兼容接口地址')
    return
  }

  saveTranslationSettings()
  translationLoading.value = true
  try {
    if (!originalContentSnapshot.value) {
      originalContentSnapshot.value = content.value
    }
    const protectedContent = applyGlossaryPlaceholders(content.value)
    const batches = splitTextIntoTranslationBatches(protectedContent.text)
    const translatedBatches = await Promise.all(
      batches.map((batch) => {
        if (!batch.trim()) return Promise.resolve(batch)
        return translateWithDeepLX({
          url,
          text: batch,
          sourceLang: translationSourceLang.value,
          targetLang: translationTargetLang.value,
        })
      }),
    )
    content.value = restoreGlossaryPlaceholders(
      translatedBatches.join(''),
      protectedContent.placeholders,
    )
    tokensCache.clear()
    const result = await splitChaptersInWorker(content.value, settingsStore.settings.chapterMaxChars)
    chapters.value = result.chapters
    hasNaturalChapters.value = result.hasNaturalSplits
    closeContextMenu()
    showToast('全文翻译已完成')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '翻译失败')
  } finally {
    translationLoading.value = false
  }
}

async function onReplaceConfirm(action: 'confirm' | 'cancel') {
  if (action === 'cancel') {
    showReplaceDialog.value = false
    return true
  }
  const search = selectedText.value
  if (!search) {
    showReplaceDialog.value = false
    return true
  }
  const replacement = replaceInput.value
  // 替换全文（包含 token 标记的原始文本）
  content.value = content.value.split(search).join(replacement)
  tokensCache.clear()
  // 重新分章
  const result = await splitChaptersInWorker(content.value, settingsStore.settings.chapterMaxChars)
  chapters.value = result.chapters
  hasNaturalChapters.value = result.hasNaturalSplits
  showReplaceDialog.value = false
  showToast(`已替换 ${content.value.split(replacement).length - 1} 处`)
  return true
}

function confirmRemoveSelection() {
  const search = selectedText.value
  if (!search) return
  // 剔除：将所有选中文本替换为空
  content.value = content.value.split(search).join('')
  tokensCache.clear()
  splitChaptersInWorker(content.value, settingsStore.settings.chapterMaxChars).then((result) => {
    chapters.value = result.chapters
    hasNaturalChapters.value = result.hasNaturalSplits
  })
  closeContextMenu()
  showToast(`已剔除 ${search.length} 字符`)
}

/** 当前作品元信息（从 store 缓存获取） */
const novelMeta = ref<NovelMeta | null>(null)

// 动态标题：显示小说名（必须放在 novelTitle / novelMeta 声明之后）
usePageTitle(() => novelTitle.value || novelMeta.value?.title || '')

const authorAvatar = computed(() => {
  const url = novelMeta.value?.user?.profile_image_urls?.medium
  return url ? getProxiedImageUrl(url) : ''
})

function goToAuthor() {
  const uid = novelMeta.value?.user?.id
  if (!uid) return
  router.push(`/user/${uid}`)
}

function goToSeries() {
  const seriesId = novelMeta.value?.series?.id
  if (!seriesId) return
  router.push(`/series/${seriesId}`)
}

const fontOptions = [
  { label: '黑体', value: 'sans' },
  { label: '宋体', value: 'serif' },
  { label: '等宽', value: 'mono' },
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

const themeOptions = [
  { label: '深色', value: 'dark', color: '#1a1a2e' },
  { label: '浅色', value: 'light', color: '#f5f5f5' },
  { label: '护眼', value: 'sepia', color: '#f4ecd8' },
]

const menuActions = computed(() => [
  { name: '加入/移除书架', value: 'shelf' },
  ...(novelMeta.value?.series?.id ? [{ name: '查看系列', value: 'series' }] : []),
  { name: '查看书签', value: 'bookmarks' },
  { name: '分享', value: 'share' },
])

function setChapterRef(index: number, el: HTMLElement | null) {
  if (el) chapterRefs.value.set(index, el)
  else chapterRefs.value.delete(index)
}

// ── Pixiv 内联标记渲染 ───────────────────────────────

const tokensCache = new Map<string, NovelToken[]>()
function chapterTokens(ch: TxtChapter): NovelToken[] {
  const key = `${ch.startOffset}:${ch.endOffset}`
  let toks = tokensCache.get(key)
  if (!toks) {
    toks = parseNovelMarkup(content.value.slice(ch.startOffset, ch.endOffset))
    tokensCache.set(key, toks)
  }
  return toks
}

const illustsRef = computed(() => novelStore.currentIllusts)
const imagesRef = computed(() => novelStore.currentImages)
const seriesPrevNovelId = computed(() => extractSeriesNovelId(novelStore.currentSeriesPrev))
const seriesNextNovelId = computed(() => extractSeriesNovelId(novelStore.currentSeriesNext))
const showPrevButton = computed(() => hasNaturalChapters.value || !!seriesPrevNovelId.value)
const showNextButton = computed(() => hasNaturalChapters.value || !!seriesNextNovelId.value)
const prevButtonText = computed(() => activeChapter.value > 0 ? '上一章' : '上一篇')
const nextButtonText = computed(() => activeChapter.value < chapters.value.length - 1 ? '下一章' : '下一篇')

function resolveIllust(illustId: string, page: number): string | null {
  const url = resolvePixivImageUrl(illustsRef.value, illustId, page)
  return url ? getProxiedImageUrl(url) : null
}

function resolveUploaded(imageId: string): string | null {
  const url = resolveUploadedImageUrl(imagesRef.value, imageId)
  return url ? getProxiedImageUrl(url) : null
}

function extractSeriesNovelId(value: Record<string, unknown> | undefined): number | null {
  const id = value?.id || value?.novel_id || value?.novelId
  const numericId = Number(id)
  return Number.isFinite(numericId) && numericId > 0 ? numericId : null
}

watch(() => content.value, () => tokensCache.clear())

function onContentClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.closest('.van-nav-bar') || target.closest('.van-popup')) return
  showControls.value = !showControls.value
}

function scrollToChapter(index: number) {
  const el = chapterRefs.value.get(index)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function onSliderChange(value: number) {
  const el = contentRef.value
  if (!el) return
  const scrollable = el.scrollHeight - el.clientHeight
  el.scrollTo({ top: (value / 100) * scrollable, behavior: 'smooth' })
}

function updateProgress() {
  const el = contentRef.value
  if (!el) return
  const scrollTop = el.scrollTop
  const scrollHeight = el.scrollHeight - el.clientHeight
  scrollPercent.value = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0

  for (const [i, chEl] of chapterRefs.value.entries()) {
    const rect = chEl.getBoundingClientRect()
    if (rect.top <= 100) activeChapter.value = i
  }
}

function prevChapter() {
  if (activeChapter.value > 0) scrollToChapter(activeChapter.value - 1)
  else if (seriesPrevNovelId.value) router.push(`/novel/${seriesPrevNovelId.value}`)
  else showToast('已经是第一章了')
}

function nextChapter() {
  if (activeChapter.value < chapters.value.length - 1) scrollToChapter(activeChapter.value + 1)
  else if (seriesNextNovelId.value) router.push(`/novel/${seriesNextNovelId.value}`)
  else showToast('已经是最后一章了')
}

async function toggleShelf() {
  const novelId = Number(props.id)
  if (isInShelf.value) {
    await shelfStore.removeFromShelf(novelId)
    isInShelf.value = false
    showToast('已从书架移除')
  } else {
    const m = novelMeta.value
    const meta: LocalNovelMeta = {
      id: novelId,
      title: m?.title || novelTitle.value,
      coverUrl: m?.image_urls?.large || m?.image_urls?.medium || '',
      authorName: m?.user?.name || '',
      authorId: m?.user?.id || 0,
      authorAvatar: m?.user?.profile_image_urls?.medium || '',
      caption: m?.caption || '',
      tags: m?.tags?.map((t) => ({ name: t.name, translated_name: t.translated_name })) || [],
      textLength: m?.text_length || content.value.length,
      totalBookmarks: m?.total_bookmarks || m?.total_bookmarks || 0,
      totalView: m?.total_view || 0,
      isXRestricted: !!m?.is_x_restricted,
      series: m?.series?.id ? { id: m.series.id, title: m.series.title } : undefined,
      addedAt: Date.now(),
      lastReadAt: Date.now(),
    }
    await shelfStore.addToShelf(meta)
    isInShelf.value = true
    showToast('已加入书架')
  }
}

// ── 收藏：单击快捷收藏 / 长按弹标签 ────────────────

let pressTimer: ReturnType<typeof setTimeout> | null = null
let isLongPress = false

function onBookmarkPress() {
  isLongPress = false
  pressTimer = setTimeout(() => {
    isLongPress = true
    openTagDialog()
  }, 500)
}

function onBookmarkRelease() {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
  if (!isLongPress) {
    quickBookmark()
  }
}

function onBookmarkCancel() {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
}

async function quickBookmark() {
  if (!novelMeta.value || bookmarkLoading.value) return
  bookmarkLoading.value = true
  const m = novelMeta.value
  try {
    if (m.is_bookmarked) {
      await unbookmarkNovel(m.id)
      m.is_bookmarked = false
      m.total_bookmarks = Math.max(0, m.total_bookmarks - 1)
      showToast('已取消收藏')
    } else {
      await bookmarkNovel(m.id)
      m.is_bookmarked = true
      m.total_bookmarks += 1
      showToast('已添加收藏')
    }
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      authStore.handle401()
      showToast('登录已过期，请重新登录')
    } else {
      showToast(e instanceof Error ? e.message : '操作失败')
    }
  } finally {
    bookmarkLoading.value = false
  }
}

async function openTagDialog() {
  if (!novelMeta.value) return
  showTagDialog.value = true
  selectedTags.value = []
  newTagInput.value = ''

  // 加载已有标签
  try {
    const detail = await getBookmarkDetail(novelMeta.value.id)
    existingTags.value = detail.bookmark_detail?.tags || []
  } catch {
    existingTags.value = []
  }
}

function isTagSelected(name: string): boolean {
  return selectedTags.value.includes(name)
}

function toggleTag(name: string) {
  const idx = selectedTags.value.indexOf(name)
  if (idx >= 0) {
    selectedTags.value.splice(idx, 1)
  } else {
    selectedTags.value.push(name)
  }
}

function removeTag(name: string) {
  const idx = selectedTags.value.indexOf(name)
  if (idx >= 0) selectedTags.value.splice(idx, 1)
}

function addNewTag() {
  const name = newTagInput.value.trim()
  if (!name) return
  if (!selectedTags.value.includes(name)) {
    selectedTags.value.push(name)
  }
  newTagInput.value = ''
}

async function confirmTagBookmark() {
  if (!novelMeta.value || bookmarkLoading.value) return
  bookmarkLoading.value = true
  const m = novelMeta.value
  try {
    await bookmarkNovel(m.id, 'public', selectedTags.value.length > 0 ? selectedTags.value : undefined)
    m.is_bookmarked = true
    m.total_bookmarks += 1
    showToast(selectedTags.value.length > 0 ? `已收藏（${selectedTags.value.length} 个标签）` : '已添加收藏')
    showTagDialog.value = false
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      authStore.handle401()
      showToast('登录已过期，请重新登录')
    } else {
      showToast(e instanceof Error ? e.message : '操作失败')
    }
  } finally {
    bookmarkLoading.value = false
  }
}

function downloadNovel() {
  if (!content.value) {
    showToast('暂无文本可下载')
    return
  }
  const name = (novelMeta.value?.title || novelTitle.value || 'novel').replace(/[/\\:*?"<>|]/g, '_')
  const bom = '\uFEFF'
  const blob = new Blob([bom + content.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  showToast('下载成功')
}

function showBookmarkDialog() {
  showToast('书签功能开发中')
}

function onMenuSelect(action: { value: string }) {
  showMenu.value = false
  if (action.value === 'shelf') toggleShelf()
  else if (action.value === 'series') goToSeries()
  else if (action.value === 'bookmarks') showToast('书签功能开发中')
  else if (action.value === 'share') {
    const shareUrl = window.location.href
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast('链接已复制（无需登录即可查看）')
      }).catch(() => {
        showToast('复制失败，请手动复制地址栏链接')
      })
    } else {
      showToast('复制失败，请手动复制地址栏链接')
    }
  }
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/')
}

// 保存进度
function saveCurrentProgress() {
  if (scrollPercent.value > 0) {
    shelfStore.saveProgress({
      novelId: Number(props.id),
      scrollPercent: scrollPercent.value,
      chapterIndex: activeChapter.value,
      charOffset: chapters.value[activeChapter.value]?.startOffset || 0,
      updatedAt: Date.now(),
    })
  }
}

watch([translationApiUrl, translationSourceLang, translationTargetLang], () => {
  saveTranslationSettings()
}, { flush: 'sync' })

onMounted(async () => {
  const novelId = props.id

  // 检查是否在书架
  isInShelf.value = await shelfStore.isInShelf(Number(novelId))

  // 先尝试从 store 缓存拿 meta（推荐/关注/搜索页跳转过来的会命中）
  const cachedMeta = novelStore.getNovelMetaById(novelId)
  if (cachedMeta) {
    novelMeta.value = cachedMeta
    novelTitle.value = cachedMeta.title
  }

  // 先检查本地缓存
  const cached = await getTxtCache(novelId)
  if (cached) {
    content.value = cached.content
    chapters.value = cached.chapters
    // 本地缓存不带 hasNaturalSplits、从章节标题启发式判定
    hasNaturalChapters.value = cached.chapters.length > 1 &&
      cached.chapters.some((c) => /^(第[一二三四五六七八九十百千万零\d]+[章节回卷篇集部]|Chapter\s+\d+)/i.test(c.title))
    novelTitle.value = cached.fileName
    loading.value = false
  } else {
    // 从 API 加载（未登录时自动尝试免登录模式）
    const text = await novelStore.loadNovelText(novelId)
    if (text) {
      content.value = text
      const result = await splitChaptersInWorker(text, settingsStore.settings.chapterMaxChars)
      chapters.value = result.chapters
      hasNaturalChapters.value = result.hasNaturalSplits
      if (!novelMeta.value) novelTitle.value = `小说 #${novelId}`
    } else {
      // 免登录模式也失败（服务端未配置备用 token）
      loadError.value = novelStore.error || '加载失败，服务器未配置免登录 token，请登录后查看'
    }
    loading.value = false
  }

  translationApiUrl.value = settingsStore.settings.translationApiUrl || translationApiUrl.value
  translationSourceLang.value = settingsStore.settings.translationSourceLang || 'auto'
  translationTargetLang.value = settingsStore.settings.translationTargetLang || inferBrowserTargetLanguage()

  // 将小说记录到独立的阅读历史中（不影响书架）
  {
    const m = novelMeta.value
    const title = m?.title || novelTitle.value || `小说 #${novelId}`
    shelfStore.saveReadingHistory({
      id: Number(novelId),
      title,
      coverUrl: m?.image_urls?.large || m?.image_urls?.medium || '',
      authorName: m?.user?.name || '',
      authorId: m?.user?.id || 0,
      authorAvatar: m?.user?.profile_image_urls?.medium || '',
      caption: m?.caption || '',
      tags: m?.tags?.map((t) => ({ name: t.name, translated_name: t.translated_name })) || [],
      textLength: m?.text_length || content.value.length,
      totalBookmarks: m?.total_bookmarks || 0,
      totalView: m?.total_view || 0,
      isXRestricted: !!m?.is_x_restricted,
      series: m?.series?.id ? { id: m.series.id, title: m.series.title } : undefined,
      addedAt: Date.now(),
      lastReadAt: Date.now(),
    })
  }

  // 恢复阅读进度
  const progress = await shelfStore.getProgress(Number(novelId))
  if (progress && contentRef.value) {
    await nextTick()
    setTimeout(() => {
      const el = contentRef.value
      if (el) {
        const scrollable = el.scrollHeight - el.clientHeight
        el.scrollTop = (progress.scrollPercent / 100) * scrollable
      }
    }, 100)
  }

  // 定时保存进度
  const saveTimer = setInterval(saveCurrentProgress, 5000)
  window.addEventListener('beforeunload', saveCurrentProgress)

  // 清理
  const unwatch = watch(
    () => router.currentRoute.value.path,
    (path) => {
      if (!path.startsWith('/novel/')) {
        clearInterval(saveTimer)
        window.removeEventListener('beforeunload', saveCurrentProgress)
        saveCurrentProgress()
        unwatch()
      }
    },
  )
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* ── 右键菜单 ─────────────────────────────────────── */
.context-menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: transparent;
}

.context-menu-panel {
  position: fixed;
  z-index: 3001;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
  padding: 8px 0;
  min-width: 200px;
  max-width: 240px;
  backdrop-filter: blur(12px);
}

.context-menu-section {
  padding: 6px 14px;
}

.context-menu-section + .context-menu-section {
  border-top: 1px solid var(--color-border);
  padding-top: 10px;
}

.context-menu-label {
  display: block;
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ctx-font-btn {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.15s;
}

.ctx-font-btn.active,
.ctx-font-btn:hover {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.ctx-theme-dot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: transform 0.15s, border-color 0.15s;
}

.ctx-theme-dot.active,
.ctx-theme-dot:hover {
  border-color: var(--color-primary);
  transform: scale(1.15);
}

.ctx-action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: transparent;
  color: var(--color-text);
  font-size: 14px;
  cursor: pointer;
  transition: background 0.12s;
  text-align: left;
}

.ctx-action-btn:hover {
  background: var(--color-bg);
}

.ctx-action-btn--compact {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: auto;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  font-size: 12px;
}

.ctx-select {
  flex: 1;
  min-width: 0;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 12px;
}

.ctx-action-btn--danger {
  color: #e74c3c;
}

.ctx-action-btn--danger:hover {
  background: rgba(231, 76, 60, 0.08);
}

.ctx-replace-input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}

.ctx-replace-input:focus {
  border-color: var(--color-primary);
}
</style>

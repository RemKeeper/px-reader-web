<template>
  <div class="reader-view min-h-screen bg-bg">
    <!-- 顶部导航 -->
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
                :name="isInShelf ? 'bookmark' : 'bookmark-o'"
                size="20"
                :class="isInShelf ? 'text-primary' : 'text-text'"
                @click="toggleShelf"
              />
              <van-icon name="ellipsis" size="20" class="text-text" @click="showMenu = true" />
            </div>
          </template>
        </van-nav-bar>
      </div>
    </transition>

    <!-- 加载中 -->
    <div v-if="loading" class="h-screen flex-center">
      <van-loading type="spinner" color="var(--color-primary)" size="40" vertical>
        加载中...
      </van-loading>
    </div>

    <!-- 正文 -->
    <div
      v-else
      ref="contentRef"
      class="reader-body h-screen overflow-y-auto"
      :style="settingsStore.cssVars"
      @click="onContentClick"
    >
      <!-- 作品信息头 -->
      <div v-if="novelMeta" class="bg-surface px-4 pt-6 pb-4 border-b border-border">
        <h1 class="text-text text-lg font-bold leading-snug">{{ novelMeta.title }}</h1>
        <div
          class="flex items-center gap-2 mt-3 cursor-pointer w-fit"
          @click.stop="goToAuthor"
        >
          <img
            v-if="authorAvatar"
            :src="authorAvatar"
            class="w-7 h-7 rounded-full object-cover"
          />
          <span class="text-text text-sm hover:text-primary transition-colors">
            {{ novelMeta.user?.name }}
          </span>
          <van-icon name="arrow" size="12" class="text-text-secondary" />
        </div>
        <NovelStats
          :text-length="novelMeta.text_length"
          :bookmarks="novelMeta.total_bookmarks"
          :views="novelMeta.total_view"
          :comments="novelMeta.total_comments"
          size="md"
          class="mt-3"
        />
        <p
          v-if="novelMeta.caption"
          class="text-text-secondary text-xs mt-3 leading-relaxed"
          v-html="novelMeta.caption"
        />
        <NovelTags
          v-if="novelMeta.tags?.length"
          :tags="novelMeta.tags"
          :max="6"
          expandable
          show-translated
          size="sm"
          class="mt-3"
        />
      </div>

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
            v-if="hasNaturalChapters"
            class="flex-col-center cursor-pointer"
            @click="prevChapter"
          >
            <van-icon name="arrow-left" size="20" class="text-text" />
            <span class="text-xs text-text-secondary mt-1">上一章</span>
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
            v-if="hasNaturalChapters"
            class="flex-col-center cursor-pointer"
            @click="nextChapter"
          >
            <van-icon name="arrow" size="20" class="text-text" />
            <span class="text-xs text-text-secondary mt-1">下一章</span>
          </div>
        </div>
      </div>
    </transition>

    <!-- 设置面板 -->
    <van-action-sheet v-model:show="showSettings" title="阅读设置">
      <div class="p-4 space-y-5">
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
    </van-action-sheet>

    <!-- 菜单 -->
    <van-action-sheet
      v-model:show="showMenu"
      :actions="menuActions"
      cancel-text="取消"
      @select="onMenuSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useNovelStore, useSettingsStore, useShelfStore } from '@/stores'
import { splitChaptersInWorker } from '@/workers'
import { getTxtCache } from '@/db'
import { getProxiedImageUrl } from '@/api'
import {
  parseNovelMarkup,
  resolvePixivImageUrl,
  resolveUploadedImageUrl,
  type NovelToken,
} from '@/utils/novelMarkup'
import type { TxtChapter, LocalNovelMeta, NovelMeta } from '@/types'
import NovelTags from '@/components/NovelTags.vue'
import NovelStats from '@/components/NovelStats.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()
const novelStore = useNovelStore()
const settingsStore = useSettingsStore()
const shelfStore = useShelfStore()

const loading = ref(true)
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
const contentRef = ref<HTMLElement | null>(null)
const chapterRefs = ref<Map<number, HTMLElement>>(new Map())

/** 当前作品元信息（从 store 缓存获取） */
const novelMeta = ref<NovelMeta | null>(null)
const authorAvatar = computed(() => {
  const url = novelMeta.value?.user?.profile_image_urls?.medium
  return url ? getProxiedImageUrl(url) : ''
})

function goToAuthor() {
  const uid = novelMeta.value?.user?.id
  if (!uid) return
  router.push(`/user/${uid}`)
}

const fontOptions = [
  { label: '黑体', value: 'sans' },
  { label: '宋体', value: 'serif' },
  { label: '等宽', value: 'mono' },
]

const themeOptions = [
  { label: '深色', value: 'dark', color: '#1a1a2e' },
  { label: '浅色', value: 'light', color: '#f5f5f5' },
  { label: '护眼', value: 'sepia', color: '#f4ecd8' },
]

const menuActions = [
  { name: '加入/移除书架', value: 'shelf' },
  { name: '查看书签', value: 'bookmarks' },
  { name: '分享', value: 'share' },
]

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

function resolveIllust(illustId: string, page: number): string | null {
  const url = resolvePixivImageUrl(illustsRef.value, illustId, page)
  return url ? getProxiedImageUrl(url) : null
}

function resolveUploaded(imageId: string): string | null {
  const url = resolveUploadedImageUrl(imagesRef.value, imageId)
  return url ? getProxiedImageUrl(url) : null
}

watch(() => content.value, () => tokensCache.clear())

function onContentClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.closest('.van-nav-bar') || target.closest('.van-action-sheet')) return
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
  else showToast('已经是第一章了')
}

function nextChapter() {
  if (activeChapter.value < chapters.value.length - 1) scrollToChapter(activeChapter.value + 1)
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

function showBookmarkDialog() {
  showToast('书签功能开发中')
}

function onMenuSelect(action: { value: string }) {
  showMenu.value = false
  if (action.value === 'shelf') toggleShelf()
  else if (action.value === 'bookmarks') showToast('书签功能开发中')
  else if (action.value === 'share') {
    navigator.clipboard?.writeText(window.location.href)
    showToast('链接已复制')
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
    // 从 API 加载
    const text = await novelStore.loadNovelText(novelId)
    if (text) {
      content.value = text
      const result = await splitChaptersInWorker(text, settingsStore.settings.chapterMaxChars)
      chapters.value = result.chapters
      hasNaturalChapters.value = result.hasNaturalSplits
      if (!novelMeta.value) novelTitle.value = `小说 #${novelId}`
    }
    loading.value = false
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

  // 绑定滚动事件
  contentRef.value?.addEventListener('scroll', updateProgress, { passive: true })

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
</style>

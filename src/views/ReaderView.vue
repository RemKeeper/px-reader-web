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
      <!-- 章节导航 -->
      <div
        v-if="chapters.length > 1 && settingsStore.settings.showChapterNav"
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
            v-if="chapters.length > 1"
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
            {{ content.slice(ch.startOffset, ch.endOffset) }}
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
          <span class="text-xs text-text-secondary w-12">
            {{ activeChapter + 1 }}/{{ chapters.length }}
          </span>
        </div>

        <!-- 操作按钮 -->
        <div class="flex items-center justify-around py-3 px-4">
          <div class="flex-col-center cursor-pointer" @click="prevChapter">
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
          <div class="flex-col-center cursor-pointer" @click="nextChapter">
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
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useNovelStore, useSettingsStore, useShelfStore } from '@/stores'
import { splitChaptersInWorker } from '@/workers'
import { saveTxtCache, getTxtCache } from '@/db'
import type { TxtChapter, LocalNovelMeta } from '@/types'

const props = defineProps<{ id: string }>()
const router = useRouter()
const novelStore = useNovelStore()
const settingsStore = useSettingsStore()
const shelfStore = useShelfStore()

const loading = ref(true)
const content = ref('')
const chapters = ref<TxtChapter[]>([])
const novelTitle = ref('')
const showControls = ref(false)
const showSettings = ref(false)
const showMenu = ref(false)
const scrollPercent = ref(0)
const activeChapter = ref(0)
const isInShelf = ref(false)
const contentRef = ref<HTMLElement | null>(null)
const chapterRefs = ref<Map<number, HTMLElement>>(new Map())

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
    const meta: LocalNovelMeta = {
      id: novelId,
      title: novelTitle.value,
      coverUrl: '',
      authorName: '',
      authorId: 0,
      authorAvatar: '',
      caption: '',
      tags: [],
      textLength: content.value.length,
      totalBookmarks: 0,
      totalView: 0,
      isXRestricted: false,
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

  // 先检查本地缓存
  const cached = await getTxtCache(novelId)
  if (cached) {
    content.value = cached.content
    chapters.value = cached.chapters
    novelTitle.value = cached.fileName
    loading.value = false
  } else {
    // 从 API 加载
    const text = await novelStore.loadNovelText(novelId)
    if (text) {
      content.value = text
      chapters.value = await splitChaptersInWorker(text, settingsStore.settings.chapterMaxChars)
      novelTitle.value = `小说 #${novelId}`
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

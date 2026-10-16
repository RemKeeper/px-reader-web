<template>
  <div class="quick-read-view h-[100vh] h-[100dvh] bg-bg flex flex-col overflow-hidden">
    <NavBar title="快速阅读" show-back />

    <div class="flex-1 flex-center flex-col gap-4 px-8">
      <!-- 加载中 -->
      <template v-if="loading">
        <van-loading type="spinner" color="var(--color-primary)" size="40" vertical>
          {{ statusText }}
        </van-loading>
      </template>

      <!-- 错误 -->
      <template v-else-if="error">
        <van-icon name="warning-o" size="48" class="text-text-secondary" />
        <p class="text-text-secondary text-sm text-center leading-relaxed">{{ error }}</p>
        <van-button type="primary" round size="small" @click="retry">重试</van-button>
      </template>

      <!-- 无 URL -->
      <template v-else-if="!textUrl">
        <van-icon name="link-o" size="48" class="text-text-secondary" />
        <p class="text-text-secondary text-sm text-center">
          请在 URL 中携带 <code class="text-primary">?url=文本直链</code> 参数
        </p>
        <p class="text-text-secondary text-xs text-center mt-1">
          示例：<code class="text-primary break-all">{{ exampleUrl }}</code>
        </p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { fetchTextFromUrl } from '@/api'
import { decodeTextInWorker, splitChaptersInWorker } from '@/workers'
import { saveTxtCache, getTxtCache, addNovelToShelf, getNovelFromShelf } from '@/db'
import { useSettingsStore, useShelfStore } from '@/stores'
import type { TxtFileCache, LocalNovelMeta } from '@/types'
import NavBar from '@/components/NavBar.vue'

const route = useRoute()
const router = useRouter()
const settingsStore = useSettingsStore()
const shelfStore = useShelfStore()

const loading = ref(false)
const statusText = ref('')
const error = ref<string | null>(null)
const textUrl = computed(() => {
  const u = route.query.url
  return typeof u === 'string' ? u.trim() : ''
})
const exampleUrl = computed(() => {
  const base = window.location.origin
  return `${base}/read?url=https://example.com/novel.txt`
})

function fileNameFromUrl(url: string): string {
  try {
    const u = new URL(url)
    const segments = u.pathname.split('/').filter(Boolean)
    const last = segments[segments.length - 1] || 'untitled'
    return last.replace(/\.[^.]+$/, '') || 'untitled'
  } catch {
    return 'untitled'
  }
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return Math.max(1, Math.abs(hash))
}

async function ensureShelfEntry(cache: TxtFileCache, sourceUrl: string) {
  const shelfId = hashCode(cache.id)
  const existingShelf = await getNovelFromShelf(shelfId)
  const meta: LocalNovelMeta = {
    id: shelfId,
    title: cache.fileName,
    coverUrl: '',
    authorName: '在线导入',
    authorId: 0,
    authorAvatar: '',
    caption: `${cache.chapters.length} 章 · 来自 ${new URL(sourceUrl).hostname}`,
    tags: ['TXT', '在线'],
    textLength: cache.content.length,
    totalBookmarks: 0,
    totalView: 0,
    isXRestricted: false,
    txtFileId: cache.id,
    addedAt: existingShelf?.addedAt ?? Date.now(),
    lastReadAt: Date.now(),
  }
  await addNovelToShelf(meta)
  await shelfStore.loadShelf()
  return shelfId
}

async function fetchAndRead() {
  if (!textUrl.value) return
  loading.value = true
  error.value = null

  try {
    // 检查是否已缓存过同一 URL
    const cacheId = `url_${hashCode(textUrl.value)}`
    const existing = await getTxtCache(cacheId)
    if (existing) {
      statusText.value = '已有缓存，准备阅读...'
      const shelfId = await ensureShelfEntry(existing, textUrl.value)
      router.replace(`/novel/${shelfId}`)
      return
    }

    // 通过代理抓取文本
    statusText.value = '正在获取文本...'
    const buffer = await fetchTextFromUrl(textUrl.value)

    // 解码
    statusText.value = '检测编码...'
    const content = await decodeTextInWorker(buffer)

    if (!content.trim()) {
      throw new Error('获取到的文本内容为空')
    }

    // 分章
    statusText.value = '分章处理...'
    const { chapters } = await splitChaptersInWorker(content, settingsStore.settings.chapterMaxChars)

    // 保存到 TXT 缓存
    const fileName = fileNameFromUrl(textUrl.value)
    const cache: TxtFileCache = {
      id: cacheId,
      fileName,
      encoding: 'auto',
      content,
      chapters,
      fileSize: buffer.byteLength,
      importedAt: Date.now(),
    }

    statusText.value = '保存中...'
    await saveTxtCache(cache)

    const shelfId = await ensureShelfEntry(cache, textUrl.value)
    showToast('加载完成')
    router.replace(`/novel/${shelfId}`)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '未知错误'
  } finally {
    loading.value = false
  }
}

function retry() {
  fetchAndRead()
}

onMounted(() => {
  if (textUrl.value) {
    fetchAndRead()
  }
})
</script>

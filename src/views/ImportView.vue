<template>
  <div class="import-view min-h-screen bg-bg">
    <NavBar title="导入 TXT" show-back />

    <div class="p-4 space-y-4">
      <!-- 上传区域 -->
      <div
        class="bg-surface rounded-xl p-8 text-center border-2 border-dashed border-border cursor-pointer transition-colors hover:border-primary"
        @click="triggerUpload"
        @dragover.prevent
        @drop.prevent="onDrop"
      >
        <van-icon name="upgrade" size="48" class="text-text-secondary mb-3" />
        <p class="text-text text-sm">点击选择 TXT 文件</p>
        <p class="text-text-secondary text-xs mt-1">支持拖拽上传，自动识别编码</p>
        <input
          ref="fileInput"
          type="file"
          accept=".txt,.text"
          class="hidden"
          @change="onFileChange"
        />
      </div>

      <!-- 处理中 -->
      <div v-if="processing" class="bg-surface rounded-xl p-6 text-center">
        <van-loading type="spinner" color="var(--color-primary)" size="32" vertical>
          {{ processingStatus }}
        </van-loading>
      </div>

      <!-- 导入结果 -->
      <div v-if="imported" class="bg-surface rounded-xl p-4">
        <div class="flex items-center gap-3 mb-3">
          <van-icon name="passed" size="24" class="text-green-500" />
          <div>
            <h3 class="text-text font-bold text-sm">{{ imported.fileName }}</h3>
            <p class="text-text-secondary text-xs">
              {{ imported.chapters.length }} 章 · {{ formatSize(imported.fileSize) }} · {{ imported.encoding }}
            </p>
          </div>
        </div>
        <div class="flex gap-2">
          <van-button type="primary" size="small" round @click="goToReader">
            开始阅读
          </van-button>
          <van-button size="small" round @click="addToShelf">
            加入书架
          </van-button>
        </div>
      </div>

      <!-- 已导入的 TXT 列表 -->
      <div v-if="txtList.length > 0">
        <h3 class="text-text text-sm font-bold mb-3 px-1">已导入文件</h3>
        <div class="space-y-2">
          <div
            v-for="txt in txtList"
            :key="txt.id"
            class="bg-surface rounded-xl p-3 flex items-center gap-3 cursor-pointer active:scale-98 transition-transform"
            @click="goToTxtReader(txt.id)"
          >
            <van-icon name="description" size="24" class="text-primary flex-shrink-0" />
            <div class="flex-1 min-w-0">
              <h4 class="text-text text-sm text-ellipsis">{{ txt.fileName }}</h4>
              <p class="text-text-secondary text-xs">
                {{ txt.chapters.length }} 章 · {{ formatSize(txt.fileSize) }}
              </p>
            </div>
            <van-icon
              name="delete-o"
              size="16"
              class="text-text-secondary flex-shrink-0"
              @click.stop="removeTxt(txt.id)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { splitChaptersInWorker, decodeTextInWorker } from '@/workers'
import { saveTxtCache, getAllTxtCaches, removeTxtCache } from '@/db'
import { useSettingsStore, useShelfStore } from '@/stores'
import type { TxtFileCache, TxtChapter, LocalNovelMeta } from '@/types'
import NavBar from '@/components/NavBar.vue'

const router = useRouter()
const settingsStore = useSettingsStore()
const shelfStore = useShelfStore()

const fileInput = ref<HTMLInputElement | null>(null)
const processing = ref(false)
const processingStatus = ref('')
const imported = ref<TxtFileCache | null>(null)
const txtList = ref<TxtFileCache[]>([])

function triggerUpload() {
  fileInput.value?.click()
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) await processFile(file)
  input.value = ''
}

function onDrop(e: DragEvent) {
  const file = e.dataTransfer?.files[0]
  if (file && file.name.endsWith('.txt')) {
    processFile(file)
  } else {
    showToast('请选择 TXT 文件')
  }
}

async function processFile(file: File) {
  processing.value = true
  processingStatus.value = '读取文件...'

  try {
    const buffer = await file.arrayBuffer()
    processingStatus.value = '检测编码...'

    // 解码文本
    const content = await decodeTextInWorker(buffer)
    processingStatus.value = '分章处理...'

    // 分章
    const chapters = await splitChaptersInWorker(content, settingsStore.settings.chapterMaxChars)

    // 生成 ID
    const id = `txt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const cache: TxtFileCache = {
      id,
      fileName: file.name.replace(/\.txt$/i, ''),
      encoding: 'auto',
      content,
      chapters,
      fileSize: file.size,
      importedAt: Date.now(),
    }

    processingStatus.value = '保存中...'
    await saveTxtCache(cache)

    imported.value = cache
    await loadTxtList()
    showToast('导入成功')
  } catch (e) {
    showToast('导入失败: ' + (e instanceof Error ? e.message : '未知错误'))
  } finally {
    processing.value = false
  }
}

function goToReader() {
  if (imported.value) {
    router.push(`/novel/${imported.value.id}`)
  }
}

async function addToShelf() {
  if (!imported.value) return
  const meta: LocalNovelMeta = {
    id: 0, // TXT 文件用 hash
    title: imported.value.fileName,
    coverUrl: '',
    authorName: '本地导入',
    authorId: 0,
    authorAvatar: '',
    caption: `${imported.value.chapters.length} 章`,
    tags: ['TXT'],
    textLength: imported.value.content.length,
    totalBookmarks: 0,
    totalView: 0,
    isXRestricted: false,
    addedAt: Date.now(),
    lastReadAt: Date.now(),
  }
  // 使用 hash 作为 ID
  const hashId = hashCode(imported.value.id)
  meta.id = hashId
  await shelfStore.addToShelf(meta)
  showToast('已加入书架')
}

function goToTxtReader(id: string) {
  router.push(`/novel/${id}`)
}

async function removeTxt(id: string) {
  await removeTxtCache(id)
  await loadTxtList()
  if (imported.value?.id === id) imported.value = null
  showToast('已删除')
}

async function loadTxtList() {
  txtList.value = await getAllTxtCaches()
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return Math.abs(hash)
}

onMounted(loadTxtList)
</script>

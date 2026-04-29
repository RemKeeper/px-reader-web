import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { LocalNovelMeta, ReadingProgress, Bookmark } from '@/types'
import * as db from '@/db'

export const useShelfStore = defineStore('shelf', () => {
  const novels = ref<LocalNovelMeta[]>([])
  const loading = ref(false)

  const novelCount = computed(() => novels.value.length)

  /** 加载书架 */
  async function loadShelf() {
    loading.value = true
    try {
      novels.value = await db.getAllNovels()
    } finally {
      loading.value = false
    }
  }

  /** 加入书架 */
  async function addToShelf(novel: LocalNovelMeta) {
    await db.addNovelToShelf(novel)
    await loadShelf()
  }

  /** 从书架移除 */
  async function removeFromShelf(id: number) {
    await db.removeNovelFromShelf(id)
    await loadShelf()
  }

  /** 是否在书架中 */
  async function isInShelf(id: number): Promise<boolean> {
    return db.isNovelInShelf(id)
  }

  /** 更新最后阅读时间 */
  async function touchNovel(id: number) {
    await db.updateNovelLastRead(id)
    await loadShelf()
  }

  // ── 阅读进度 ──────────────────────────────────────

  async function saveProgress(progress: ReadingProgress) {
    await db.saveProgress(progress)
  }

  async function getProgress(novelId: number): Promise<ReadingProgress | undefined> {
    return db.getProgress(novelId)
  }

  // ── 书签 ──────────────────────────────────────────

  async function addBookmark(bookmark: Bookmark): Promise<number> {
    return db.addBookmark(bookmark)
  }

  async function removeBookmark(id: number) {
    await db.removeBookmark(id)
  }

  async function getBookmarks(novelId: number): Promise<Bookmark[]> {
    return db.getBookmarks(novelId)
  }

  return {
    novels,
    loading,
    novelCount,
    loadShelf,
    addToShelf,
    removeFromShelf,
    isInShelf,
    touchNovel,
    saveProgress,
    getProgress,
    addBookmark,
    removeBookmark,
    getBookmarks,
  }
})

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ApiError, type NovelMeta, type NovelTextResponse, type BookmarkTag } from '@/types'
import {
  getRecommendedNovels,
  getFollowNovels,
  getUserNovels,
  getNovelText,
  searchNovels,
  getBookmarkedNovels,
  getBookmarkTags,
} from '@/api'
import { useAuthStore } from './auth'

export const useNovelStore = defineStore('novel', () => {
  /** 推荐列表 */
  const recommended = ref<NovelMeta[]>([])
  const recommendedNextUrl = ref<string | null>(null)
  const recommendedLoading = ref(false)
  /** 推荐缓存时间戳（ms） */
  const recommendedCachedAt = ref<number>(0)

  /** 按 id 索引的 NovelMeta 缓存（供阅读页/书架页补全信息） */
  const metaById = ref<Record<number, NovelMeta>>({})

  function cacheMetas(list: NovelMeta[]) {
    if (!list?.length) return
    const next = { ...metaById.value }
    for (const n of list) if (n && n.id) next[n.id] = n
    metaById.value = next
  }

  function getNovelMetaById(id: number | string): NovelMeta | undefined {
    return metaById.value[Number(id)]
  }

  /** 关注列表 */
  const follow = ref<NovelMeta[]>([])
  const followNextUrl = ref<string | null>(null)
  const followLoading = ref(false)
  /** 关注缓存时间戳（ms） */
  const followCachedAt = ref<number>(0)

  /** 当前小说正文 */
  const currentText = ref('')
  const currentIllusts = ref<NovelTextResponse['illusts']>(undefined)
  const currentImages = ref<NovelTextResponse['images']>(undefined)
  const currentTextLoading = ref(false)

  /** 错误 */
  const error = ref<string | null>(null)

  // ── 推荐 ──────────────────────────────────────────

  async function loadRecommended(reset = false) {
    if (recommendedLoading.value) return
    recommendedLoading.value = true
    error.value = null
    try {
      if (reset) {
        recommended.value = []
        recommendedNextUrl.value = null
      }
      const offset = extractOffset(recommendedNextUrl.value)
      const res = await getRecommendedNovels({
        include_ranking_novels: 'true',
        ...(offset ? { offset } : {}),
      })
      recommended.value = reset ? res.novels : [...recommended.value, ...res.novels]
      recommendedNextUrl.value = res.next_url
      recommendedCachedAt.value = Date.now()
      cacheMetas(res.novels)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        useAuthStore().handle401()
      }
      error.value = e instanceof Error ? e.message : '加载失败'
    } finally {
      recommendedLoading.value = false
    }
  }

  // ── 关注 ──────────────────────────────────────────

  async function loadFollow(reset = false) {
    if (followLoading.value) return
    followLoading.value = true
    error.value = null
    try {
      if (reset) {
        follow.value = []
        followNextUrl.value = null
      }
      const offset = extractOffset(followNextUrl.value)
      const res = await getFollowNovels({
        restrict: 'public',
        ...(offset ? { offset } : {}),
      })
      follow.value = reset ? res.novels : [...follow.value, ...res.novels]
      followNextUrl.value = res.next_url
      followCachedAt.value = Date.now()
      cacheMetas(res.novels)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        useAuthStore().handle401()
      }
      error.value = e instanceof Error ? e.message : '加载失败'
    } finally {
      followLoading.value = false
    }
  }

  // ── 用户小说 ──────────────────────────────────────

  async function loadUserNovels(userId: string | number, offset?: string) {
    error.value = null
    try {
      const res = await getUserNovels({ user_id: userId, offset })
      cacheMetas(res.novels)
      return res
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        useAuthStore().handle401()
      }
      error.value = e instanceof Error ? e.message : '加载失败'
      return null
    }
  }

  // ── 搜索 ──────────────────────────────────────────

  const search = ref<NovelMeta[]>([])
  const searchNextUrl = ref<string | null>(null)
  const searchLoading = ref(false)
  const searchKeyword = ref('')

  async function loadSearch(word: string, reset = false) {
    if (searchLoading.value) return
    searchLoading.value = true
    error.value = null
    try {
      if (reset || word !== searchKeyword.value) {
        search.value = []
        searchNextUrl.value = null
        searchKeyword.value = word
      }
      const offset = extractOffset(searchNextUrl.value)
      const res = await searchNovels({
        word,
        ...(offset ? { offset } : {}),
      })
      search.value = reset ? res.novels : [...search.value, ...res.novels]
      searchNextUrl.value = res.next_url
      cacheMetas(res.novels)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        useAuthStore().handle401()
      }
      error.value = e instanceof Error ? e.message : '搜索失败'
    } finally {
      searchLoading.value = false
    }
  }

  // ── 收藏列表 ────────────────────────────────────

  const bookmarks = ref<NovelMeta[]>([])
  const bookmarksNextUrl = ref<string | null>(null)
  const bookmarksLoading = ref(false)

  async function loadBookmarks(reset = false) {
    if (bookmarksLoading.value) return
    bookmarksLoading.value = true
    error.value = null
    try {
      if (reset) {
        bookmarks.value = []
        bookmarksNextUrl.value = null
      }
      const res = await getBookmarkedNovels({
        restrict: 'public',
        ...(bookmarksNextUrl.value && !reset ? { next_url: bookmarksNextUrl.value } : {}),
      })
      bookmarks.value = reset ? res.novels : [...bookmarks.value, ...res.novels]
      bookmarksNextUrl.value = res.next_url
      cacheMetas(res.novels)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        useAuthStore().handle401()
      }
      error.value = e instanceof Error ? e.message : '加载收藏失败'
    } finally {
      bookmarksLoading.value = false
    }
  }

  // ── 收藏标签 ────────────────────────────────────

  const bookmarkTags = ref<BookmarkTag[]>([])
  const bookmarkTagsLoading = ref(false)
  const selectedBookmarkTag = ref<string | null>(null)

  async function loadBookmarkTags() {
    if (bookmarkTagsLoading.value) return
    bookmarkTagsLoading.value = true
    try {
      const { getUserId } = await import('@/utils/token')
      const userId = getUserId()
      if (!userId) throw new ApiError('not logged in', 401)
      const res = await getBookmarkTags(userId)
      bookmarkTags.value = res.bookmark_tags || []
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        useAuthStore().handle401()
      }
      // 静默失败
    } finally {
      bookmarkTagsLoading.value = false
    }
  }

  async function filterBookmarksByTag(tag: string | null) {
    selectedBookmarkTag.value = tag
    bookmarks.value = []
    bookmarksNextUrl.value = null
    try {
      const res = await getBookmarkedNovels({
        restrict: 'public',
        ...(tag ? { tag } : {}),
      })
      bookmarks.value = res.novels
      bookmarksNextUrl.value = res.next_url
      cacheMetas(res.novels)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        useAuthStore().handle401()
      }
    }
  }

  // ── 小说正文 ──────────────────────────────────────

  async function loadNovelText(id: string | number): Promise<string | null> {
    currentTextLoading.value = true
    error.value = null
    try {
      const res = await getNovelText(id)
      currentText.value = res.novel_text
      currentIllusts.value = res.illusts
      currentImages.value = res.images
      return res.novel_text
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        useAuthStore().handle401()
      }
      error.value = e instanceof Error ? e.message : '加载正文失败'
      return null
    } finally {
      currentTextLoading.value = false
    }
  }

  return {
    recommended,
    recommendedNextUrl,
    recommendedLoading,
    recommendedCachedAt,
    follow,
    followNextUrl,
    followLoading,
    followCachedAt,
    metaById,
    getNovelMetaById,
    search,
    searchNextUrl,
    searchLoading,
    searchKeyword,
    currentText,
    currentIllusts,
    currentImages,
    currentTextLoading,
    error,
    loadRecommended,
    loadFollow,
    loadUserNovels,
    bookmarks,
    bookmarksNextUrl,
    bookmarksLoading,
    bookmarkTags,
    bookmarkTagsLoading,
    selectedBookmarkTag,
    loadSearch,
    loadBookmarks,
    loadBookmarkTags,
    filterBookmarksByTag,
    loadNovelText,
  }
}, {
  persist: {
    key: 'px-reader-novel',
    storage: localStorage,
    pick: ['recommended', 'recommendedNextUrl', 'recommendedCachedAt', 'follow', 'followNextUrl', 'followCachedAt', 'metaById'],
  },
})

/** 从 next_url 中提取 offset 参数 */
function extractOffset(url: string | null): string | undefined {
  if (!url) return undefined
  try {
    const u = new URL(url)
    return u.searchParams.get('offset') || undefined
  } catch {
    return undefined
  }
}

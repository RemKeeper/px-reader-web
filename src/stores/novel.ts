import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  ApiError,
  type NovelMeta,
  type NovelTextResponse,
  type BookmarkTag,
  type NovelSeriesDetail,
  type PixivUser,
} from '@/types'
import {
  getRecommendedNovels,
  getFollowNovels,
  getUserNovels,
  getNovelText,
  getNovelSeries,
  searchNovels,
  searchPopularPreviewNovels,
  getBookmarkedNovels,
  getBookmarkTags,
} from '@/api'
import { isRestrictedBrowser, getRestrictedBrowserName } from '@/utils/browser'
import { isPremiumUser } from '@/utils/token'
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

  function cacheNovelMetas(list: NovelMeta[]) {
    cacheMetas(list)
  }

  // ── 子页面缓存（系列 / 用户 / 正文）───────────────

  /** 子页面数据缓存 TTL：5 分钟 */
  const SUB_CACHE_TTL = 5 * 60 * 1000

  function isCacheFresh(cachedAt: number): boolean {
    return cachedAt > 0 && Date.now() - cachedAt < SUB_CACHE_TTL
  }

  /** 系列页缓存（按 series_id） */
  interface SeriesCacheEntry {
    detail: NovelSeriesDetail
    novels: NovelMeta[]
    nextUrl: string | null
    cachedAt: number
  }
  const seriesCache = ref<Record<string, SeriesCacheEntry>>({})

  /** 用户页缓存（按 user_id） */
  interface UserPageCacheEntry {
    user: PixivUser
    novels: NovelMeta[]
    nextUrl: string | null
    cachedAt: number
  }
  const userCache = ref<Record<string, UserPageCacheEntry>>({})

  /** 正文内存缓存（按 novel_id，与 IndexedDB 缓存互补） */
  interface TextCacheEntry {
    text: string
    cachedAt: number
  }
  const textCache = ref<Record<string, TextCacheEntry>>({})

  /** 读取新鲜（TTL 内）的系列页缓存，无则返回 undefined */
  function getCachedSeries(seriesId: string | number): SeriesCacheEntry | undefined {
    const entry = seriesCache.value[String(seriesId)]
    return entry && isCacheFresh(entry.cachedAt) ? entry : undefined
  }

  /** 加载系列页（首次或加载更多），并写入缓存；失败返回 null */
  async function loadSeries(
    seriesId: string | number,
    options: { nextUrl?: string | null } = {},
  ): Promise<SeriesCacheEntry | null> {
    const key = String(seriesId)
    const prev = seriesCache.value[key]
    error.value = null
    try {
      const res = await getNovelSeries({
        series_id: key,
        ...(options.nextUrl ? { next_url: options.nextUrl } : {}),
      })
      const entry: SeriesCacheEntry = {
        detail: res.novel_series_detail,
        novels: options.nextUrl && prev ? [...prev.novels, ...(res.novels || [])] : (res.novels || []),
        nextUrl: res.next_url,
        cachedAt: Date.now(),
      }
      seriesCache.value = { ...seriesCache.value, [key]: entry }
      cacheMetas(res.novels || [])
      return entry
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        useAuthStore().handle401()
      }
      error.value = e instanceof Error ? e.message : '加载系列失败'
      return null
    }
  }

  /** 读取新鲜（TTL 内）的用户页缓存，无则返回 undefined */
  function getCachedUserPage(userId: string | number): UserPageCacheEntry | undefined {
    const entry = userCache.value[String(userId)]
    return entry && isCacheFresh(entry.cachedAt) ? entry : undefined
  }

  /** 清空子页面缓存（登出 / 401 时调用，避免不同账号间串数据） */
  function clearSubCaches() {
    seriesCache.value = {}
    userCache.value = {}
    textCache.value = {}
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
  const currentSeriesPrev = ref<NovelTextResponse['series_prev']>({})
  const currentSeriesNext = ref<NovelTextResponse['series_next']>({})
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
      // 写入用户页缓存（加载更多时合并到已有列表）
      const key = String(userId)
      const prev = userCache.value[key]
      userCache.value = {
        ...userCache.value,
        [key]: {
          user: res.user,
          novels: offset && prev ? [...prev.novels, ...res.novels] : res.novels,
          nextUrl: res.next_url,
          cachedAt: Date.now(),
        },
      }
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
  /** 搜索排序方式: date_desc | date_asc | popular_desc | popular_preview | trending_builtin */
  const searchSort = ref<string>('date_desc')
  /** 搜索目标: partial_match_for_tags | exact_match_for_tags | title_and_caption | keyword | text */
  const searchTarget = ref<string>('partial_match_for_tags')
  /** 发布起始日期 YYYY-MM-DD（可选） */
  const searchStartDate = ref('')
  /** 发布结束日期 YYYY-MM-DD（可选） */
  const searchEndDate = ref('')
  /** 最少收藏数（可选，会员场景下生效） */
  const searchBookmarkMin = ref<number | null>(null)
  /**
   * 收藏数快捷桶（starSize）：如 '1000' 表示追加 "1000users入り" 到关键字。
   * 利用 pixiv 自动桶标签，对非会员同样生效（与 bookmark_num_min 是两条并存路径）。
   * 空字符串表示不启用。
   */
  const searchStarSize = ref('')
  /**
   * 当前搜索模式：
   * - normal：常规搜索端点 /v1/search/novel（会员可翻页热度，非会员常规排序也可翻页）
   * - preview：非会员热度预览端点 /v1/search/popular-preview/novel（单页，不可翻页）
   */
  const searchMode = ref<'normal' | 'preview'>('normal')

  /** 是否为"热度类"排序（这些排序在非会员下会被降级到预览端点） */
  function isPopularSort(sort: string): boolean {
    return sort === 'popular_desc' || sort === 'popular_preview' || sort === 'trending_builtin'
  }

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
      const sort = searchSort.value
      const premium = isPremiumUser()
      // 非会员选择热度排序 → 降级到 popular-preview（单页、不带 sort 参数）
      const usePreview = isPopularSort(sort) && !premium
      searchMode.value = usePreview ? 'preview' : 'normal'

      const startDate = searchStartDate.value || undefined
      const endDate = searchEndDate.value || undefined
      // 收藏数快捷桶：把 starSize 拼成关键字后缀（如 "恋愛 1000users入り"）
      const starSuffix = searchStarSize.value ? `${searchStarSize.value}users入り` : ''
      const apiWord = starSuffix ? `${word} ${starSuffix}` : word

      let res: Awaited<ReturnType<typeof searchNovels>>
      if (usePreview) {
        res = await searchPopularPreviewNovels({
          word: apiWord,
          search_target: searchTarget.value,
          start_date: startDate,
          end_date: endDate,
        })
        // 预览端点单页返回，无翻页
        searchNextUrl.value = null
      } else {
        res = await searchNovels({
          word: apiWord,
          sort,
          search_target: searchTarget.value,
          ...(offset ? { offset } : {}),
          start_date: startDate,
          end_date: endDate,
          ...(searchBookmarkMin.value !== null ? { bookmark_num_min: searchBookmarkMin.value } : {}),
        })
        searchNextUrl.value = res.next_url
      }
      search.value = reset ? res.novels : [...search.value, ...res.novels]
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
    const key = String(id)
    // 命中内存缓存（TTL 内）直接返回，避免重复请求正文
    const hit = textCache.value[key]
    if (hit && isCacheFresh(hit.cachedAt)) {
      currentText.value = hit.text
      return hit.text
    }
    currentTextLoading.value = true
    error.value = null
    try {
      let res: NovelTextResponse
      try {
        res = await getNovelText(id)
      } catch (e) {
        // 未登录时尝试免登录模式（由 Worker 注入服务端备用 token）
        // 但 QQ / 微信内置浏览器跨域受限，跳过免登录直接提示用户登录
        if (e instanceof ApiError && (e.status === 401 || e.message?.includes('not logged in'))) {
          if (isRestrictedBrowser()) {
            const name = getRestrictedBrowserName() || '当前浏览器'
            throw new ApiError(
              `${name} 不支持免登录查看，请点击右上角菜单在浏览器中打开后登录`,
              401,
            )
          }
          res = await getNovelText(id, true)
        } else {
          throw e
        }
      }
      currentText.value = res.novel_text
      currentIllusts.value = res.illusts
      currentImages.value = res.images
      currentSeriesPrev.value = res.series_prev || {}
      currentSeriesNext.value = res.series_next || {}
      // 写入内存缓存，加速再次打开
      textCache.value = { ...textCache.value, [key]: { text: res.novel_text, cachedAt: Date.now() } }
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
    searchSort,
    searchTarget,
    searchStartDate,
    searchEndDate,
    searchBookmarkMin,
    searchStarSize,
    searchMode,
    currentText,
    currentIllusts,
    currentImages,
    currentSeriesPrev,
    currentSeriesNext,
    currentTextLoading,
    error,
    loadRecommended,
    loadFollow,
    loadUserNovels,
    getCachedUserPage,
    getCachedSeries,
    loadSeries,
    clearSubCaches,
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
    cacheNovelMetas,
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
